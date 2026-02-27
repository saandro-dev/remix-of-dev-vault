/**
 * api-key-guard.ts — API Key authentication guard.
 *
 * Validates external API Keys using the vault-backed SQL function
 * validate_devvault_api_key, which compares the key against the
 * stored hash in Supabase Vault without exposing the raw value.
 *
 * Updated to use getSupabaseClient("admin") from multi-keys.
 */

import { getSupabaseClient } from "./supabase-client.ts";

export interface ApiKeyAuthResult {
  keyId: string;
  userId: string;
}

/**
 * Validates an API Key from the Authorization (Bearer) or X-API-Key header.
 * Returns the keyId and owner userId if valid, null otherwise.
 */
export async function requireApiKeyAuth(
  req: Request,
): Promise<ApiKeyAuthResult | null> {
  // Supports both Bearer token and X-API-Key header
  const rawKey =
    req.headers.get("x-api-key") ??
    req.headers.get("Authorization")?.replace("Bearer ", "").trim();

  if (!rawKey || rawKey.length < 10) return null;

  const client = getSupabaseClient("admin");

  const { data, error } = await client.rpc("validate_devvault_api_key", {
    p_raw_key: rawKey,
  });

  if (error || !data || data.length === 0) return null;

  return {
    keyId: data[0].key_id,
    userId: data[0].owner_id,
  };
}
