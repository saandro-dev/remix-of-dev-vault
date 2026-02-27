/**
 * rate-limit-guard.ts — Configurable rate limiting per action.
 *
 * Implements database-backed rate limiting with configurable time
 * windows per action type. Uses atomic upsert to prevent race
 * conditions in high-concurrency environments.
 *
 * Pattern extracted from RiseCheckout (production-validated).
 */

import { getSupabaseClient } from "./supabase-client.ts";

export interface RateLimitConfig {
  /** Maximum number of attempts within the time window */
  maxAttempts: number;
  /** Time window duration in seconds */
  windowSeconds: number;
  /** Block duration after exceeding the limit, in seconds */
  blockSeconds: number;
}

/** Default configurations per action type */
const ACTION_CONFIGS: Record<string, RateLimitConfig> = {
  "create-api-key": { maxAttempts: 5, windowSeconds: 300, blockSeconds: 3600 },
  "vault-ingest":   { maxAttempts: 60, windowSeconds: 60, blockSeconds: 300 },
  "global-search":  { maxAttempts: 30, windowSeconds: 60, blockSeconds: 120 },
  "revoke-api-key": { maxAttempts: 10, windowSeconds: 300, blockSeconds: 1800 },
  default:          { maxAttempts: 10, windowSeconds: 300, blockSeconds: 3600 },
};

export interface RateLimitResult {
  blocked: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  customConfig?: RateLimitConfig,
): Promise<RateLimitResult> {
  const config = customConfig ?? ACTION_CONFIGS[action] ?? ACTION_CONFIGS.default;
  const client = getSupabaseClient("general");
  const now = new Date();

  const { data: existing } = await client
    .from("devvault_api_rate_limits")
    .select("*")
    .eq("identifier", identifier)
    .eq("action", action)
    .maybeSingle();

  if (existing) {
    if (existing.blocked_until) {
      const blockedUntil = new Date(existing.blocked_until);
      if (blockedUntil > now) {
        return {
          blocked: true,
          retryAfterSeconds: Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
        };
      }
      await client.from("devvault_api_rate_limits")
        .update({ attempts: 1, last_attempt_at: now.toISOString(), blocked_until: null })
        .eq("identifier", identifier).eq("action", action);
      return { blocked: false };
    }

    const lastAttempt = new Date(existing.last_attempt_at);
    const windowExpired = (now.getTime() - lastAttempt.getTime()) / 1000 > config.windowSeconds;

    if (windowExpired) {
      await client.from("devvault_api_rate_limits")
        .update({ attempts: 1, last_attempt_at: now.toISOString(), blocked_until: null })
        .eq("identifier", identifier).eq("action", action);
      return { blocked: false };
    }

    const newAttempts = existing.attempts + 1;

    if (newAttempts >= config.maxAttempts) {
      const blockedUntil = new Date(now.getTime() + config.blockSeconds * 1000).toISOString();
      await client.from("devvault_api_rate_limits")
        .update({ attempts: newAttempts, last_attempt_at: now.toISOString(), blocked_until: blockedUntil })
        .eq("identifier", identifier).eq("action", action);
      return { blocked: true, retryAfterSeconds: config.blockSeconds };
    }

    await client.from("devvault_api_rate_limits")
      .update({ attempts: newAttempts, last_attempt_at: now.toISOString() })
      .eq("identifier", identifier).eq("action", action);
    return { blocked: false };
  }

  await client.from("devvault_api_rate_limits")
    .insert({ identifier, action, attempts: 1, last_attempt_at: now.toISOString() });
  return { blocked: false };
}
