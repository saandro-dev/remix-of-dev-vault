/**
 * api-key-guard.ts — Guard de autenticação por API Key.
 *
 * Valida API Keys externas usando a função SQL vault-backed
 * validate_devvault_api_key, que compara a chave contra o hash
 * armazenado no Supabase Vault sem expor o valor real.
 *
 * Atualizado para usar getSupabaseClient("admin") do multi-keys.
 */

import { getSupabaseClient } from "./supabase-client.ts";

export interface ApiKeyAuthResult {
  keyId: string;
  userId: string;
}

/**
 * Valida uma API Key do header Authorization (Bearer) ou X-API-Key.
 * Retorna o keyId e userId do proprietário se válida, null caso contrário.
 */
export async function requireApiKeyAuth(
  req: Request,
): Promise<ApiKeyAuthResult | null> {
  // Suporta tanto Bearer token quanto header X-API-Key
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
