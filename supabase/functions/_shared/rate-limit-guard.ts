import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 300; // 5 minutes
const BLOCK_SECONDS = 3600; // 1 hour

export interface RateLimitResult {
  blocked: boolean;
  retryAfterSeconds?: number;
}

/**
 * Checks and increments rate limit for a given identifier + action.
 * Blocks after MAX_ATTEMPTS failures within WINDOW_SECONDS.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: existing } = await serviceClient
    .from("devvault_api_rate_limits")
    .select("*")
    .eq("identifier", identifier)
    .eq("action", action)
    .maybeSingle();

  const now = new Date();

  if (existing) {
    // Check if currently blocked
    if (existing.blocked_until) {
      const blockedUntil = new Date(existing.blocked_until);
      if (blockedUntil > now) {
        return {
          blocked: true,
          retryAfterSeconds: Math.ceil(
            (blockedUntil.getTime() - now.getTime()) / 1000,
          ),
        };
      }
      // Block expired — reset
      await serviceClient
        .from("devvault_api_rate_limits")
        .update({ attempts: 1, last_attempt_at: now.toISOString(), blocked_until: null })
        .eq("identifier", identifier)
        .eq("action", action);
      return { blocked: false };
    }

    // Check if window expired
    const lastAttempt = new Date(existing.last_attempt_at);
    const windowExpired =
      (now.getTime() - lastAttempt.getTime()) / 1000 > WINDOW_SECONDS;

    if (windowExpired) {
      await serviceClient
        .from("devvault_api_rate_limits")
        .update({ attempts: 1, last_attempt_at: now.toISOString(), blocked_until: null })
        .eq("identifier", identifier)
        .eq("action", action);
      return { blocked: false };
    }

    const newAttempts = existing.attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      const blockedUntil = new Date(
        now.getTime() + BLOCK_SECONDS * 1000,
      ).toISOString();
      await serviceClient
        .from("devvault_api_rate_limits")
        .update({
          attempts: newAttempts,
          last_attempt_at: now.toISOString(),
          blocked_until: blockedUntil,
        })
        .eq("identifier", identifier)
        .eq("action", action);
      return { blocked: true, retryAfterSeconds: BLOCK_SECONDS };
    }

    await serviceClient
      .from("devvault_api_rate_limits")
      .update({ attempts: newAttempts, last_attempt_at: now.toISOString() })
      .eq("identifier", identifier)
      .eq("action", action);
    return { blocked: false };
  }

  // First attempt
  await serviceClient
    .from("devvault_api_rate_limits")
    .insert({ identifier, action, attempts: 1, last_attempt_at: now.toISOString() });
  return { blocked: false };
}
