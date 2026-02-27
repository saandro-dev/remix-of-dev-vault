/**
 * supabase-client.ts — Multi-Key System by Domain.
 *
 * Instead of using a single service key for everything, this module
 * manages multiple secret keys, each with a specific scope.
 * If a function is compromised, the "blast radius" is limited
 * to that key's domain.
 *
 * Pattern extracted from RiseCheckout (production-validated).
 *
 * REQUIRED SETUP (Supabase Dashboard > Settings > API Keys):
 * - Create a secret key named "admin"   → set DEVVAULT_SECRET_ADMIN
 * - Create a secret key named "general" → set DEVVAULT_SECRET_GENERAL
 *   (or keep DEVVAULT_SECRET_KEY as fallback during migration)
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ClientDomain = "admin" | "general";

/**
 * Domain → environment variable mapping for secret keys.
 *
 * - "admin":   Critical functions (create/revoke API keys, Vault access,
 *              security operations). Key with maximum permissions.
 * - "general": Dashboard read/write operations, global search,
 *              data ingestion via API. Key with standard permissions.
 */
const DOMAIN_KEY_MAP: Record<ClientDomain, string> = {
  admin: "DEVVAULT_SECRET_ADMIN",
  general: "DEVVAULT_SECRET_GENERAL",
};

/** Fallback for backward compatibility during migration */
const FALLBACK_KEY = "DEVVAULT_SECRET_KEY";

/**
 * Creates and returns a Supabase client authenticated with the
 * secret key corresponding to the specified domain.
 *
 * @param domain - The operation domain ("admin" | "general")
 * @returns SupabaseClient configured with the correct key
 * @throws Error if the service key is not configured
 */
export function getSupabaseClient(domain: ClientDomain): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");

  const envKey = DOMAIN_KEY_MAP[domain];
  const serviceKey =
    Deno.env.get(envKey) ??
    Deno.env.get(FALLBACK_KEY);

  if (!serviceKey) {
    throw new Error(
      `Service key not configured. Set ${envKey} or ${FALLBACK_KEY} in Edge Function secrets.`,
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Validates a user JWT using the admin client and returns the user.
 * Used to authenticate frontend calls in Edge Functions.
 */
export async function getUserFromToken(
  token: string,
): Promise<{ id: string; email?: string } | null> {
  const client = getSupabaseClient("admin");
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email };
}
