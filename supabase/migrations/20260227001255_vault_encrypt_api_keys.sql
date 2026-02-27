-- =============================================================================
-- Migration: Criptografia de API Keys de Projetos via Supabase Vault
-- =============================================================================
-- Problema: A tabela api_keys armazenava key_value em texto plano.
-- Solução: Migrar para o padrão Vault (vault_secret_id), igual ao devvault_api_keys.
-- Padrão extraído do RiseCheckout (validado em produção).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASSO 1: Adicionar coluna vault_secret_id na tabela api_keys
-- -----------------------------------------------------------------------------
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS vault_secret_id uuid;

-- -----------------------------------------------------------------------------
-- PASSO 2: Migrar dados existentes em plaintext para o Vault
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_vault_id uuid;
BEGIN
  FOR r IN
    SELECT id, key_value, label
    FROM public.api_keys
    WHERE vault_secret_id IS NULL
      AND key_value IS NOT NULL
      AND key_value != '***'
  LOOP
    -- Armazenar o valor real no Vault, criptografado
    SELECT vault.create_secret(
      r.key_value,
      'project_apikey_' || r.id::text,
      'Migrated Project API Key: ' || r.label
    ) INTO v_vault_id;

    -- Atualizar o registro: guardar referência ao Vault e mascarar o plaintext
    UPDATE public.api_keys
    SET
      vault_secret_id = v_vault_id,
      key_value       = '***'
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- PASSO 3: Criar função store_project_api_key
-- Armazena uma nova chave no Vault e insere referência na tabela api_keys.
-- SECURITY DEFINER garante que apenas esta função acessa o Vault.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.store_project_api_key(
  p_user_id     uuid,
  p_project_id  uuid,
  p_folder_id   uuid,
  p_label       text,
  p_key_value   text,
  p_environment text DEFAULT 'dev'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key_id      uuid;
  v_vault_id    uuid;
  v_secret_name text;
BEGIN
  -- Gerar nome único para o secret no Vault
  v_secret_name := 'project_apikey_' || gen_random_uuid()::text;

  -- Armazenar o valor real criptografado no Vault
  SELECT vault.create_secret(
    p_key_value,
    v_secret_name,
    'Project API Key: ' || p_label
  ) INTO v_vault_id;

  -- Inserir referência na tabela (sem o valor real)
  INSERT INTO public.api_keys (
    user_id, project_id, folder_id, label,
    key_value, environment, vault_secret_id
  )
  VALUES (
    p_user_id, p_project_id, p_folder_id, p_label,
    '***', p_environment::project_environment, v_vault_id
  )
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- PASSO 4: Criar função read_project_api_key
-- Lê o valor decriptado do Vault sob demanda, validando ownership.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.read_project_api_key(
  p_key_id  uuid,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vault_id    uuid;
  v_decrypted   text;
BEGIN
  -- Buscar o vault_secret_id, garantindo que o usuário é dono da chave
  SELECT vault_secret_id INTO v_vault_id
  FROM public.api_keys
  WHERE id = p_key_id
    AND user_id = p_user_id;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Ler o valor decriptado do Vault
  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;

  RETURN v_decrypted;
END;
$$;

-- -----------------------------------------------------------------------------
-- PASSO 5: Criar função delete_project_api_key
-- Remove a chave da tabela E o secret do Vault atomicamente.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_project_api_key(
  p_key_id  uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vault_id uuid;
BEGIN
  -- Buscar o vault_secret_id, garantindo ownership
  SELECT vault_secret_id INTO v_vault_id
  FROM public.api_keys
  WHERE id = p_key_id
    AND user_id = p_user_id;

  IF v_vault_id IS NULL THEN
    RETURN false;
  END IF;

  -- Remover da tabela primeiro (FK safety)
  DELETE FROM public.api_keys
  WHERE id = p_key_id
    AND user_id = p_user_id;

  -- Remover o secret do Vault
  DELETE FROM vault.secrets
  WHERE id = v_vault_id;

  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- PASSO 6: Revogar acesso público às funções (apenas service_role pode chamar)
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.store_project_api_key FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_project_api_key FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_project_api_key FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.store_project_api_key TO service_role;
GRANT EXECUTE ON FUNCTION public.read_project_api_key TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_project_api_key TO service_role;

-- -----------------------------------------------------------------------------
-- PASSO 7: Comentários de documentação
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION public.store_project_api_key IS
  'Armazena uma API Key de projeto no Supabase Vault (criptografada). Retorna o UUID do registro em api_keys.';

COMMENT ON FUNCTION public.read_project_api_key IS
  'Lê o valor decriptado de uma API Key de projeto do Vault, validando ownership. Retorna NULL se não encontrado.';

COMMENT ON FUNCTION public.delete_project_api_key IS
  'Remove uma API Key de projeto da tabela api_keys E do Vault atomicamente. Retorna true se bem-sucedido.';
