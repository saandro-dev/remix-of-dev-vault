
-- =============================================
-- DevVault API Ingestion System
-- Tables + Vault-backed functions
-- =============================================

-- 1. API Keys metadata table
create table public.devvault_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key_name text not null,
  key_prefix text not null,
  vault_secret_id uuid not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.devvault_api_keys enable row level security;

create policy "Users can view own API keys"
  on public.devvault_api_keys for select
  using (user_id = auth.uid());

create policy "Users can update own API keys"
  on public.devvault_api_keys for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. Audit log table
create table public.devvault_api_audit_log (
  id bigint generated always as identity primary key,
  api_key_id uuid references public.devvault_api_keys(id),
  user_id uuid not null,
  ip_address text,
  action text not null,
  success boolean not null default true,
  http_status int,
  error_code text,
  error_message text,
  request_body jsonb,
  processing_time_ms int,
  created_at timestamptz not null default now()
);

alter table public.devvault_api_audit_log enable row level security;

create policy "Users can view own audit logs"
  on public.devvault_api_audit_log for select
  using (user_id = auth.uid());

create index idx_audit_log_user_id on public.devvault_api_audit_log(user_id);
create index idx_audit_log_api_key_id on public.devvault_api_audit_log(api_key_id);
create index idx_audit_log_created_at on public.devvault_api_audit_log(created_at desc);

-- 3. Rate limits table
create table public.devvault_api_rate_limits (
  identifier text not null,
  action text not null,
  attempts int not null default 0,
  last_attempt_at timestamptz not null default now(),
  blocked_until timestamptz,
  primary key (identifier, action)
);

alter table public.devvault_api_rate_limits enable row level security;
-- No RLS policies: only accessed via service role in edge functions

-- 4. Vault-backed function: create API key
create or replace function public.create_devvault_api_key(
  p_user_id uuid,
  p_key_name text,
  p_raw_key text
) returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_key_id uuid;
  v_prefix text;
  v_vault_id uuid;
begin
  v_prefix := substring(p_raw_key from 1 for 8);

  insert into vault.secrets (secret, name, description)
  values (
    p_raw_key,
    'devvault_apikey_' || gen_random_uuid()::text,
    'DevVault API Key: ' || p_key_name
  )
  returning id into v_vault_id;

  insert into public.devvault_api_keys (user_id, key_name, key_prefix, vault_secret_id)
  values (p_user_id, p_key_name, v_prefix, v_vault_id)
  returning id into v_key_id;

  return v_key_id;
end;
$$;

-- 5. Vault-backed function: validate API key
create or replace function public.validate_devvault_api_key(
  p_raw_key text
) returns table(key_id uuid, owner_id uuid)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_prefix text;
  v_candidate record;
  v_decrypted text;
begin
  v_prefix := substring(p_raw_key from 1 for 8);

  for v_candidate in
    select ak.id, ak.user_id, ak.vault_secret_id
    from public.devvault_api_keys ak
    where ak.key_prefix = v_prefix
      and ak.revoked_at is null
      and (ak.expires_at is null or ak.expires_at > now())
  loop
    select decrypted_secret into v_decrypted
    from vault.decrypted_secrets
    where id = v_candidate.vault_secret_id;

    if v_decrypted = p_raw_key then
      update public.devvault_api_keys
      set last_used_at = now()
      where devvault_api_keys.id = v_candidate.id;

      key_id := v_candidate.id;
      owner_id := v_candidate.user_id;
      return next;
      return;
    end if;
  end loop;

  return;
end;
$$;

-- 6. Vault-backed function: revoke API key
create or replace function public.revoke_devvault_api_key(
  p_key_id uuid,
  p_user_id uuid
) returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_vault_id uuid;
begin
  select vault_secret_id into v_vault_id
  from public.devvault_api_keys
  where id = p_key_id and user_id = p_user_id and revoked_at is null;

  if v_vault_id is null then
    return false;
  end if;

  update public.devvault_api_keys
  set revoked_at = now()
  where id = p_key_id;

  delete from vault.secrets where id = v_vault_id;

  return true;
end;
$$;
