/**
 * mcp-tools/completeness.ts — Completeness score helper.
 *
 * Calls the vault_module_completeness DB function and returns
 * a normalized { score, missing_fields } object.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getCompleteness(
  client: SupabaseClient,
  moduleId: string,
): Promise<{ score: number; missing_fields: string[] }> {
  const { data, error } = await client.rpc("vault_module_completeness", { p_id: moduleId });

  if (error || !data || (data as unknown[]).length === 0) {
    return { score: 0, missing_fields: ["error_fetching_completeness"] };
  }

  const row = (data as Record<string, unknown>[])[0];
  return {
    score: row.score as number,
    missing_fields: row.missing_fields as string[],
  };
}
