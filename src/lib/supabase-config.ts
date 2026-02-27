/**
 * supabase-config.ts
 *
 * Arquivo de configuração do cliente Supabase com a nova chave publishable.
 *
 * IMPORTANTE: O arquivo `src/integrations/supabase/client.ts` é gerado
 * automaticamente pelo Lovable ao reconectar o projeto ao Supabase, e sempre
 * injeta a chave JWT legada (eyJhbGci...) que está desabilitada neste projeto.
 *
 * Este arquivo fornece a chave correta (sb_publishable_...) e é importado
 * pelo client.ts para sobrescrever a chave injetada pelo Lovable.
 *
 * NÃO REMOVER este arquivo. NÃO alterar a chave abaixo sem atualizar
 * também o projeto no Supabase.
 */

export const SUPABASE_URL = "https://bskfnthwewhpfrldbhqx.supabase.co";

/**
 * Nova chave publishable (formato sb_publishable_...).
 * A legacy anon key JWT foi desabilitada neste projeto Supabase.
 * Referência: Project Settings → API → Chaves de API publicáveis e secretas
 */
export const SUPABASE_ANON_KEY = "sb_publishable_XlH73lxriQdgud9WSQZ6Eg_paORcfoT";
