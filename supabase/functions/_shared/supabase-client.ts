/**
 * supabase-client.ts — Sistema de Multi-Keys por Domínio.
 *
 * Em vez de usar uma única chave de serviço para tudo, este módulo
 * gerencia múltiplas chaves secretas, cada uma com um escopo específico.
 * Se uma função for comprometida, o "raio de explosão" é limitado
 * ao domínio daquela chave.
 *
 * Padrão extraído do RiseCheckout (validado em produção).
 *
 * CONFIGURAÇÃO NECESSÁRIA (Supabase Dashboard > Settings > API Keys):
 * - Crie uma chave secreta chamada "admin"  → configure DEVVAULT_SECRET_ADMIN
 * - Crie uma chave secreta chamada "general" → configure DEVVAULT_SECRET_GENERAL
 *   (ou mantenha DEVVAULT_SECRET_KEY como fallback durante a migração)
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ClientDomain = "admin" | "general";

/**
 * Mapa de domínio → variável de ambiente da chave secreta.
 *
 * - "admin":   Funções críticas (criar/revogar API keys, acessar Vault,
 *              operações de segurança). Chave com permissões máximas.
 * - "general": Operações de leitura/escrita do dashboard, busca global,
 *              ingestão de dados via API. Chave com permissões padrão.
 */
const DOMAIN_KEY_MAP: Record<ClientDomain, string> = {
  admin: "DEVVAULT_SECRET_ADMIN",
  general: "DEVVAULT_SECRET_GENERAL",
};

/** Fallback para compatibilidade durante a migração */
const FALLBACK_KEY = "DEVVAULT_SECRET_KEY";

/**
 * Cria e retorna um cliente Supabase autenticado com a chave
 * correspondente ao domínio especificado.
 *
 * @param domain - O domínio de operação ("admin" | "general")
 * @returns SupabaseClient configurado com a chave correta
 * @throws Error se a chave de serviço não estiver configurada
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
 * Valida um JWT de usuário usando o cliente admin e retorna o usuário.
 * Usado para autenticar chamadas do frontend nas Edge Functions.
 */
export async function getUserFromToken(
  token: string,
): Promise<{ id: string; email?: string } | null> {
  const client = getSupabaseClient("admin");
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email };
}
