

# Plano: Knowledge Graph — Grafo de Dependências entre Módulos

## Contexto

Transformar o repositório de módulos independentes em um **Grafo de Conhecimento** com relacionamentos N:N tipados (`required` / `recommended`), permitindo navegação encadeada e respostas HATEOAS para agentes de IA.

---

## Fase 1: Migration SQL — Tabela `vault_module_dependencies`

Criar tabela de junção N:N com:
- `id` (uuid, PK)
- `module_id` (uuid, FK → vault_modules.id ON DELETE CASCADE)
- `depends_on_id` (uuid, FK → vault_modules.id ON DELETE CASCADE)
- `dependency_type` (text, validado por trigger: `required` | `recommended`)
- `created_at` (timestamptz)
- Constraint UNIQUE em `(module_id, depends_on_id)` para evitar duplicatas
- Constraint CHECK `module_id != depends_on_id` para evitar auto-referência
- Validação de `dependency_type` via trigger (não CHECK com now(), seguindo guidelines)

**RLS Policies** (mesmo padrão de `vault_modules`):
- Service role full access
- Users can SELECT dependencies de módulos que possuem acesso (owned, shared, global)
- Users can INSERT/DELETE dependencies de módulos que são donos

---

## Fase 2: Backend — Edge Functions

### 2a. `vault-crud/index.ts` — Action `get`
Após buscar o módulo, fazer query adicional em `vault_module_dependencies` com join em `vault_modules` para trazer `title` e `slug` de cada dependência. Retornar array `module_dependencies` no response com `fetch_url` HATEOAS.

### 2b. `vault-crud/index.ts` — Actions `add_dependency` e `remove_dependency`
- `add_dependency`: recebe `module_id`, `depends_on_id`, `dependency_type`. Valida ownership do `module_id`.
- `remove_dependency`: recebe `module_id`, `depends_on_id`. Valida ownership.

### 2c. `vault-crud/index.ts` — Action `list_dependencies`
Retorna dependências de um módulo (para uso no autocomplete do frontend).

### 2d. `vault-query/index.ts` — Action `get`
Enriquecer resposta com array `dependencies` incluindo `fetch_url` para cada dependência (padrão HATEOAS).

---

## Fase 3: Tipagem e Hooks (Frontend)

### 3a. `src/modules/vault/types.ts`
Adicionar interface `ModuleDependency`:
```typescript
export interface ModuleDependency {
  id: string;
  depends_on_id: string;
  title: string;
  slug: string | null;
  dependency_type: "required" | "recommended";
  fetch_url: string;
}
```
Adicionar `module_dependencies?: ModuleDependency[]` à interface `VaultModule`.

### 3b. `src/modules/vault/hooks/useModuleDependencies.ts` (novo)
- `useModuleDependencies(moduleId)` — lista dependências de um módulo
- `useAddDependency(moduleId)` — mutation para adicionar
- `useRemoveDependency(moduleId)` — mutation para remover
- `useSearchModulesForDependency(query)` — busca módulos para autocomplete (exclui o módulo atual)

---

## Fase 4: UI/UX

### 4a. `VaultDetailPage.tsx` — Seção "Prerequisites"
Nova seção abaixo de Tags exibindo cards clicáveis para cada dependência. Badge `required` / `recommended`. Click navega via React Router para `/vault/:depends_on_id`.

### 4b. `CreateModuleDialog.tsx` — Tab "Meta" com campo de dependências
Componente Combobox multi-select usando `cmdk` (já instalado). Busca módulos do vault por título. Cada seleção exibe chip com tipo (`required`/`recommended`) e botão de remoção.

### 4c. `EditModuleSheet.tsx` — Campo de dependências
Mesmo componente de autocomplete. Carrega dependências existentes via `useModuleDependencies`. Permite adicionar/remover.

### 4d. Componente reutilizável `DependencySelector.tsx` (novo)
Componente isolado usado tanto em Create quanto em Edit. Encapsula o Combobox + chips + tipo de dependência.

### 4e. Componente `DependencyCard.tsx` (novo)
Card visual para exibir uma dependência na tela de detalhes. Clicável, com ícone de tipo.

---

## i18n

Adicionar chaves em `en.json` e `pt-BR.json`:
- `vault.prerequisites`, `vault.noPrerequisites`
- `dependencies.required`, `dependencies.recommended`
- `dependencies.addDependency`, `dependencies.searchModules`, `dependencies.type`
- `toast.dependencyAdded`, `toast.dependencyRemoved`

---

## Arquivos

```text
CREATE   supabase/migrations/XXXX_vault_module_dependencies.sql
MODIFY   supabase/functions/vault-crud/index.ts        (add_dependency, remove_dependency, enrich get)
MODIFY   supabase/functions/vault-query/index.ts       (enrich get with HATEOAS)
MODIFY   src/modules/vault/types.ts                    (ModuleDependency interface)
CREATE   src/modules/vault/hooks/useModuleDependencies.ts
CREATE   src/modules/vault/components/DependencySelector.tsx
CREATE   src/modules/vault/components/DependencyCard.tsx
MODIFY   src/modules/vault/pages/VaultDetailPage.tsx   (prerequisites section)
MODIFY   src/modules/vault/components/CreateModuleDialog.tsx (dependency field)
MODIFY   src/modules/vault/components/EditModuleSheet.tsx    (dependency field)
MODIFY   src/i18n/locales/en.json
MODIFY   src/i18n/locales/pt-BR.json
```

