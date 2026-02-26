

# Estrutura Hierarquica: Projeto → Pastas → API Keys

## Problema Atual
A estrutura atual e plana: `Projeto → API Keys`. O usuario quer organizar por pastas dentro de cada projeto (ex: "Keys do Supabase", "Keys do Stripe", etc).

## Analise de Solucoes

### Solucao A: Tabela `key_folders` separada
- Manutenibilidade: 10/10
- Zero DT: 10/10
- Arquitetura: 10/10
- Escalabilidade: 10/10
- Seguranca: 10/10
- **NOTA FINAL: 10/10**

### Solucao B: Campo `folder_name` (string) na tabela `api_keys`
- Manutenibilidade: 6/10 — sem entidade propria, renomear pasta exige update em massa
- Zero DT: 5/10 — inconsistencias de nomes inevitaveis
- Arquitetura: 4/10 — viola SRP, sem CRUD de pastas
- Escalabilidade: 5/10
- Seguranca: 8/10
- **NOTA FINAL: 5.5/10**

### DECISAO: Solucao A (Nota 10)

## Mudancas no Banco

**Nova tabela `key_folders`:**
- `id` uuid PK
- `project_id` uuid FK → projects
- `user_id` uuid NOT NULL
- `name` text NOT NULL
- `color` text DEFAULT '#6B7280'
- `created_at`, `updated_at` timestamps
- UNIQUE(project_id, name)
- RLS: user_id = auth.uid()

**Alterar `api_keys`:**
- Adicionar coluna `folder_id` uuid nullable FK → key_folders(id) ON DELETE CASCADE

## Mudancas no Frontend

### Nova rota e pagina
- `/projects/:projectId` — agora mostra lista de pastas + botao "Nova Pasta"
- `/projects/:projectId/folders/:folderId` — mostra as API Keys daquela pasta (reusa logica atual do ProjectDetailPage)

### Arquivos afetados
1. **Migration SQL** — criar `key_folders`, alterar `api_keys`
2. **`src/modules/projects/pages/ProjectDetailPage.tsx`** — refatorar para mostrar pastas em vez de keys diretamente
3. **Novo `src/modules/projects/pages/FolderDetailPage.tsx`** — CRUD de API Keys dentro de uma pasta (logica atual migra para ca)
4. **`src/routes/appRoutes.tsx`** — adicionar rota `/projects/:projectId/folders/:folderId`

### Fluxo UX
```text
Seus Projetos (lista)
  └── Risecheckout (projeto)
        ├── 📁 Keys do Supabase
        │     ├── SUPABASE_URL
        │     └── SUPABASE_ANON_KEY
        ├── 📁 Keys do Stripe
        │     └── STRIPE_SECRET_KEY
        └── [+ Nova Pasta]
```

Clicar numa pasta abre a tela com a tabela de keys (identica a atual), mas filtrada por `folder_id`.

