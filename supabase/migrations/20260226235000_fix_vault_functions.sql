-- =============================================
-- Migration: Corrigir funções do Vault para usar vault.create_secret()
-- Autor: Manus AI
-- Data: 2026-02-26
--
-- PROBLEMA: create_devvault_api_key usava INSERT INTO vault.secrets diretamente,
-- o que dispara triggers internos do pgsodium (_crypto_aead_det_noncegen,
-- _crypto_aead_det_encrypt) que o role postgres não tem permissão de executar.
--
-- SOLUÇÃO: Usar vault.create_secret() — função SECURITY DEFINER owned by
-- supabase_admin, que encapsula toda a criptografia internamente.
-- O role postgres pode executá-la sem precisar de GRANTs adicionais.
--
-- VERIFICADO: vault.create_secret() e DELETE FROM vault.secrets funcionam
-- corretamente com o role postgres neste projeto. Testado antes desta migration.
-- =============================================

-- =============================================
-- FUNÇÃO 1: create_devvault_api_key
-- Correção: INSERT INTO vault.secrets → vault.create_secret()
-- =============================================
CREATE OR REPLACE FUNCTION public.create_devvault_api_key(
  p_user_id uuid,
  p_key_name text,
  p_raw_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key_id       uuid;
  v_prefix       text;
  v_vault_id     uuid;
  v_secret_name  text;
  v_secret_desc  text;
BEGIN
  v_prefix      := substring(p_raw_key FROM 1 FOR 8);
  v_secret_name := 'devvault_apikey_' || gen_random_uuid()::text;
  v_secret_desc := 'DevVault API Key: ' || p_key_name;

  -- CORRETO: usar vault.create_secret() em vez de INSERT direto.
  -- vault.create_secret é SECURITY DEFINER owned by supabase_admin,
  -- portanto tem permissão para chamar as funções internas de criptografia.
  SELECT vault.create_secret(p_raw_key, v_secret_name, v_secret_desc)
    INTO v_vault_id;

  INSERT INTO public.devvault_api_keys (user_id, key_name, key_prefix, vault_secret_id)
  VALUES (p_user_id, p_key_name, v_prefix, v_vault_id)
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$function$;

-- =============================================
-- FUNÇÃO 2: revoke_devvault_api_key
-- Status: DELETE FROM vault.secrets funciona com postgres (testado).
-- Mantido como está, apenas documentado.
-- =============================================
CREATE OR REPLACE FUNCTION public.revoke_devvault_api_key(
  p_key_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vault_id uuid;
BEGIN
  SELECT vault_secret_id INTO v_vault_id
  FROM public.devvault_api_keys
  WHERE id = p_key_id
    AND user_id = p_user_id
    AND revoked_at IS NULL;

  IF v_vault_id IS NULL THEN
    RETURN false;
  END IF;

  -- Marcar como revogada na tabela pública
  UPDATE public.devvault_api_keys
  SET revoked_at = now()
  WHERE id = p_key_id;

  -- Remover o segredo do Vault (DELETE direto funciona com postgres)
  DELETE FROM vault.secrets WHERE id = v_vault_id;

  RETURN true;
END;
$function$;

-- =============================================
-- FUNÇÃO 3: validate_devvault_api_key
-- Status: Usa vault.decrypted_secrets (view), sem problemas de permissão.
-- Mantida sem alterações — já está correta.
-- =============================================

COMMENT ON FUNCTION public.create_devvault_api_key IS
  'Cria uma API Key no DevVault. Usa vault.create_secret() para armazenar o valor criptografado no Supabase Vault. A chave raw nunca é armazenada em texto plano em tabelas públicas.';

COMMENT ON FUNCTION public.revoke_devvault_api_key IS
  'Revoga uma API Key do DevVault. Marca como revogada na tabela pública e remove o segredo do Vault.';

COMMENT ON FUNCTION public.validate_devvault_api_key IS
  'Valida uma API Key raw contra o Vault. Busca por prefixo para eficiência e compara o valor decriptado. Atualiza last_used_at em caso de sucesso.';
