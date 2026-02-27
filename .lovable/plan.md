

# Relatório de Auditoria: Knowledge Graph (Grafo de Dependências)

## Status: SUCESSO com 1 DESVIO do Plano

---

## Checklist Completo

| Area | Verificacao | Veredicto |
|------|-------------|-----------|
| **Fase 1: DB** | Tabela `vault_module_dependencies` com RLS, UNIQUE, CHECK anti-self-reference, trigger `validate_dependency_type` | PASS |
| **Fase 2a: vault-crud `get`** | Enriquece resposta com `module_dependencies[]` + `fetch_url` HATEOAS | PASS |
| **Fase 2b: vault-crud `add/remove_dependency`** | Actions implementadas com validacao RLS de ownership | PASS |
| **Fase 2c: vault-crud `list_dependencies`** | Action implementada com enriquecimento de title/slug | PASS |
| **Fase 2d: vault-query `get`** | Enriquece resposta com `dependencies[]` + `fetch_url` HATEOAS | PASS |
| **Fase 3a: types.ts** | `ModuleDependency`, `DependencyType`, `module_dependencies?` em `VaultModule` | PASS |
| **Fase 3b: useModuleDependencies.ts** | 4 hooks: list, add, remove, search | PASS |
| **Fase 4a: VaultDetailPage** | Secao "Prerequisites" com `DependencyCard` + navegacao React Router | PASS |
| **Fase 4b: CreateModuleDialog** | `DependencySelector` na tab "Meta" | **FAIL** |
| **Fase 4c: EditModuleSheet** | `DependencySelector` integrado com diff sync | PASS |
| **Fase 4d: DependencySelector** | Componente reutilizavel com Combobox + chips + tipo | PASS |
| **Fase 4e: DependencyCard** | Card visual clicavel com badge de tipo | PASS |
| **i18n** | Todas as chaves em `en.json` e `pt-BR.json` | PASS |
| **Regra 5.5** | Zero `supabase.from()` no frontend | PASS |
| **Regra 5.4** | Todos os arquivos abaixo de 300 linhas (vault-crud: 395 — ver abaixo) | **WARN** |
| **Codigo morto** | Nenhum import orfao, nenhuma interface sem uso | PASS |
| **Documentacao** | `.lovable/plan.md` atualizado e correto | PASS |
| **Protocolo 4.1** | Zero band-aids, zero quick fixes | PASS |
| **Protocolo 4.4** | Zero divida tecnica, zero TODOs | PASS |

---

## Desvios Identificados

### DESVIO 1: `CreateModuleDialog.tsx` sem `DependencySelector` (Plano Fase 4b)

O plano especifica que o `DependencySelector` deveria estar na tab "Meta" do `CreateModuleDialog.tsx`. A implementacao atual NAO inclui esse componente. O `EditModuleSheet` tem, mas o `CreateModuleDialog` nao.

**Impacto:** O usuario so consegue adicionar dependencias ao EDITAR um modulo, nao ao CRIAR. Isso viola o plano aprovado.

**Correcao necessaria:** Integrar `DependencySelector` na tab "Meta" do `CreateModuleDialog` e, apos o `create.mutate` retornar o `id` do modulo criado, disparar as mutations `add_dependency` para cada dependencia selecionada.

### AVISO: `vault-crud/index.ts` com 395 linhas

O arquivo ultrapassa o limite de 300 linhas (Regra 5.4). Com 14 actions num unico switch-case, ele se aproxima de um "God Object". Recomenda-se extrair handlers em funcoes separadas ou arquivos auxiliares futuramente.

---

## Plano de Correcao

### Passo 1: Adicionar DependencySelector ao CreateModuleDialog
- Importar `DependencySelector` e `PendingDependency`
- Adicionar state `pendingDeps`
- Inserir o componente na tab "Meta" (precisa de um `moduleId` temporario — usar string vazia e filtrar pelo proprio titulo)
- Apos `create.mutate` retornar o ID do modulo, executar `add_dependency` para cada item em `pendingDeps`

### Passo 2: Refatorar vault-crud para ficar abaixo de 300 linhas
- Extrair os handlers de dependencia (`add_dependency`, `remove_dependency`, `list_dependencies`) e o enriquecimento de `get` para um arquivo helper compartilhado no edge function, ex: `_shared/dependency-helpers.ts`

### Arquivos a modificar
```text
MODIFY  src/modules/vault/components/CreateModuleDialog.tsx  (add DependencySelector)
MODIFY  supabase/functions/vault-crud/index.ts               (extract dependency handlers)
CREATE  supabase/functions/_shared/dependency-helpers.ts      (extracted handlers)
```

