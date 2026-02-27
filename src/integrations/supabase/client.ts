import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ATENÇÃO: Usar APENAS a chave opaca sb_publishable_* (novo sistema do Supabase).
// A chave JWT legada (eyJ...) foi desativada pelo Supabase — causa erro "Legacy API keys are disabled".
// O .env foi removido do rastreamento do git para evitar que o Lovable sobrescreva esta configuração.
// Não alterar estas constantes para variáveis de ambiente sem garantir que o .env tenha a chave correta.
const SUPABASE_URL = "https://bskfnthwewhpfrldbhqx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XlH73lxriQdgud9WSQZ6Eg_paORcfoT";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
