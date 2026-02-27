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
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ApiKeyAuthResult {
  keyId: string;
  userId: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  keyId?: string;
}

/**
 * Validates an API Key using a provided Supabase client.
 * Decoupled from request parsing — accepts raw key string directly.
 */
export async function validateApiKey(
  client: SupabaseClient,
  rawKey: string,
): Promise<ApiKeyValidationResult> {
  if (!rawKey || rawKey.length < 10) {
    return { valid: false };
  }

  const { data, error } = await client.rpc("validate_devvault_api_key", {
    p_raw_key: rawKey,
  });

  if (error || !data || data.length === 0) {
    return { valid: false };
  }

  return {
    valid: true,
    keyId: data[0].key_id,
    userId: data[0].owner_id,
  };
}

/**
 * Validates an API Key from the Authorization (Bearer) or X-API-Key header.
 * Returns the keyId and owner userId if valid, null otherwise.
 */
export async function requireApiKeyAuth(
  req: Request,
): Promise<ApiKeyAuthResult | null> {
  const rawKey =
    req.headers.get("x-api-key") ??
    req.headers.get("Authorization")?.replace("Bearer ", "").trim();

  if (!rawKey || rawKey.length < 10) return null;

  const client = getSupabaseClient("admin");
  const result = await validateApiKey(client, rawKey);

  if (!result.valid || !result.keyId || !result.userId) return null;

  return {
    keyId: result.keyId,
    userId: result.userId,
  };
}
