# DevVault - Edge Functions Registry

> **🔴 FONTE DA VERDADE MÁXIMA** - Este documento lista TODAS as 15 Edge Functions deployadas no Supabase para o projeto DevVault.
> Última atualização: 2026-02-28
> Mantenedor: Arquiteto de IA

---

## 🏆 DevVault Protocol V2 Compliance Badge

```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ DEVVAULT PROTOCOL V2 - 10.0/10 - DUAL-AUTH ARCHITECTURE   ║
║     15 Edge Functions | 2 Auth Systems | Zero Legacy Code      ║
║     Runtime: 100% Deno.serve() native                         ║
║     Secrets: Supabase Vault + Multi-Domain Keys               ║
║     verify_jwt: false (ALL 15 functions)                      ║
║     SECRET DOMAINS: admin | general                           ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Resumo

| Métrica | Valor |
| :--- | :--- |
| **Total de Funções** | 15 |
| **Funções Internas (Frontend)** | 12 |
| **Funções Públicas (API Externa)** | 3 |
| **Funções com verify_jwt=true** | 0 ✅ |
| **config.toml entries** | 15 ✅ |
| **Sistema de API Keys (Externa)** | `dvlt_` keys via Supabase Vault ✅ |
| **Domínios de Segurança (Secrets)** | 2 (admin, general) ✅ |
| **Base URL (Interna & Externa)** | `https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1/` |

---

## 🔐 Arquitetura de Autenticação Dupla

O DevVault opera com dois sistemas de autenticação distintos e isolados, garantindo que o acesso interno (da aplicação frontend) e o acesso externo (de agentes de IA) tenham mecanismos de segurança apropriados.

**REGRA ABSOLUTA**: Todas as 15 funções usam `verify_jwt = false` no `supabase/config.toml`. A autenticação é sempre tratada dentro do código da função, permitindo esta arquitetura flexível.

### 1. Autenticação Interna (Frontend App)

-   **Mecanismo:** JWT (Bearer Token)
-   **Validação:** O helper `_shared/auth.ts` (`authenticateRequest`) valida o JWT do usuário logado no Supabase Auth.
-   **Uso:** Utilizado por todas as funções que servem a interface do DevVault. O frontend envia o token de sessão do usuário, e a função valida sua identidade e permissões (via RLS e checagens de papel).
-   **Funções:** 12

### 2. Autenticação Externa (API para Agentes)

-   **Mecanismo:** Chave de API Estática (`dvlt_...`)
-   **Validação:** O helper `_shared/api-key-guard.ts` (`validateApiKey`) valida a chave enviada no header `X-DevVault-Key` (ou `x-api-key`/`Authorization`). A validação ocorre comparando um hash da chave com o valor armazenado de forma segura no **Supabase Vault** através da função SQL `validate_devvault_api_key`.
-   **Uso:** Utilizado pelas funções públicas designadas para automação e integração com agentes de IA, como o `devvault-mcp`.
-   **Funções:** 3

### 🔑 Arquitetura de Múltiplos Segredos (2 Domínios)

Para limitar o "raio de explosão" em caso de um vazamento de chave, o sistema utiliza duas chaves de serviço (`service_role`) com escopos diferentes, gerenciadas pelo helper `_shared/supabase-client.ts`.

| Domínio | Variável de Ambiente | Propósito | Funções que Utilizam |
| :--- | :--- | :--- | :--- |
| **admin** | `DEVVAULT_SECRET_ADMIN` | Operações críticas e de alta periculosidade: criação/revogação de chaves, acesso direto ao Vault, mudança de papéis de usuário. | `create-api-key`, `revoke-api-key`, `admin-crud` |
| **general** | `DEVVAULT_SECRET_GENERAL` | Operações padrão de leitura e escrita do dia-a-dia, como CRUDs de projetos, bugs e módulos do vault. | Todas as outras 12 funções |

---

## Tabela de Registro de Funções

### Módulos do Vault & Conhecimento

| Função | Auth | Domínio | Descrição e Ações (`action`) |
| :--- | :--- | :--- | :--- |
| `vault-crud` | Interno (JWT) | general | **BFF Principal para o Vault.** Realiza todas as operações de CRUD nos módulos de conhecimento do usuário. **Ações:** `list`, `get`, `create`, `update`, `delete`, `search`, `get_playbook`, `share`, `unshare`, `list_shares`, `add_dependency`, `remove_dependency`, `list_dependencies`. |
| `vault-query` | Externo (API Key) | general | **Endpoint PÚBLICO de LEITURA para Agentes.** Permite que sistemas externos consultem o grafo de conhecimento. **Ações:** `bootstrap`, `search`, `get`, `list`, `list_domains`. |
| `vault-ingest` | Externo (API Key) | general | **Endpoint PÚBLICO de ESCRITA para Agentes.** Permite que sistemas externos criem, atualizem e deletem módulos. **Ações:** `ingest` (criação single/batch), `update`, `delete`. |
| `devvault-mcp` | Externo (API Key) | general | **Servidor MCP (Model Context Protocol) para Agentes de IA.** Expõe uma API estruturada com ferramentas para interagir com o Vault. **Ferramentas (11):** `devvault_bootstrap`, `devvault_search`, `devvault_get`, `devvault_list`, `devvault_domains`, `devvault_ingest`, `devvault_update`, `devvault_get_group`, `devvault_validate`, `devvault_delete`, `devvault_diagnose`. **Campos aceitos por ingest/update:** `common_errors`, `solves_problems`, `test_code`, `difficulty`, `estimated_minutes`, `prerequisites`. **Novidades v3.0:** `devvault_delete` (soft/hard delete), `devvault_diagnose` (troubleshooting por erro), analytics via `vault_usage_events`, dependências por slug, filtro `group` nativo no SQL. |

### Gerenciamento de Entidades

| Função | Auth | Domínio | Descrição e Ações (`action`) |
| :--- | :--- | :--- | :--- |
| `projects-crud` | Interno (JWT) | general | Gerencia o CRUD completo para a entidade `projects`. **Ações:** `list`, `get`, `create`, `update`, `delete`. |
| `bugs-crud` | Interno (JWT) | general | Gerencia o CRUD completo para a entidade `bugs` (Diário de Bugs). **Ações:** `list`, `create`, `update`, `delete`. |
| `folders-crud` | Interno (JWT) | general | Gerencia o CRUD para `key_folders` (pastas de chaves de API de projetos). **Ações:** `list`, `get`, `create`, `delete`. |
| `project-api-keys-crud` | Interno (JWT) | admin | Gerencia o CRUD para `api_keys` de projetos, interagindo com o Vault para criptografar/descriptografar chaves. **Ações:** `list`, `create`, `read` (decifra a chave), `delete`. |

### Painel e Utilitários

| Função | Auth | Domínio | Descrição e Ações (`action`) |
| :--- | :--- | :--- | :--- |
| `dashboard-stats` | Interno (JWT) | general | Agrega e retorna as principais métricas para o painel do usuário (total de projetos, módulos, etc.). Sem `action`. |
| `global-search` | Interno (JWT) | general | Realiza uma busca textual unificada entre `vault_modules`, `projects` e `bugs`. Sem `action`. |
| `profiles-crud` | Interno (JWT) | general | Gerencia o perfil do usuário logado. **Ações:** `get`, `update`. |

### API Keys & Administração

| Função | Auth | Domínio | Descrição e Ações (`action`) |
| :--- | :--- | :--- | :--- |
| `create-api-key` | Interno (JWT) | admin | **Cria uma nova chave `dvlt_` para acesso externo.** Interage com a função SQL `create_devvault_api_key` para salvar o hash no Vault. Retorna a chave completa apenas uma vez. Sem `action`. |
| `revoke-api-key` | Interno (JWT) | admin | **Revoga uma chave `dvlt_` existente.** Interage com a função SQL `revoke_devvault_api_key`. Sem `action`. |
| `list-devvault-keys` | Interno (JWT) | general | Lista os metadados (prefixo, nome, data de uso) das chaves `dvlt_` do usuário. Sem `action`. |
| `admin-crud` | Interno (JWT) | admin | **Endpoint para o Painel de Administração.** Requer papel de `admin` ou `owner`. **Ações:** `get-my-role`, `list-users`, `change-role` (owner), `admin-stats`, `list-api-keys`, `admin-revoke-api-key` (owner), `list-global-modules`, `unpublish-module`. |
