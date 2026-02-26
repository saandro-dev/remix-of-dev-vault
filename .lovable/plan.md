

# DevVault — Plano de Implementação Completo

## Fase 1: Fundação (Design System + Layout)

### 1.1 Design System & Theming
- Reescrever `src/index.css` com os design tokens do RiseCheckout (tema claro e escuro com variáveis semânticas: `--success`, `--warning`, `--info`)
- Atualizar `tailwind.config.ts` mapeando todas as novas variáveis (`success`, `warning`, `info`)
- Instalar fontes: **Inter** para UI, **JetBrains Mono** para código
- Dark mode como padrão nativo
- Zero cores hardcoded — tudo via tokens semânticos (`bg-background`, `text-foreground`)
- Criar `src/providers/theme.tsx` (ThemeProvider com localStorage + classe `.dark` no `<html>`)
- Criar `src/components/ThemeToggle.tsx`

### 1.2 Layout App Shell
- Criar `src/layouts/AppShell.tsx` — esqueleto: Sidebar fixa + Topbar minimalista + área de conteúdo
- Sidebar colapsável (modo mini com ícones) usando Shadcn Sidebar
- Topbar com: ThemeToggle, avatar do usuário, atalho Cmd+K

### 1.3 Navegação Declarativa
- Criar `src/modules/navigation/config/navigationConfig.ts` — objeto de configuração estático que define toda a sidebar
- Seções: Dashboard, Busca Global, Seus Projetos (expansível), Cofre Global (subcategorias: Frontend, Backend, DevOps, Segurança), Ferramentas (Diário de Bugs, Comunidade)
- Sidebar renderizada dinamicamente a partir do config — adicionar seção = adicionar objeto no array

## Fase 2: Infraestrutura de Código

### 2.1 Estrutura de Pastas Modular
```
src/
├── layouts/          → AppShell, Sidebar, Topbar
├── modules/          → Cada feature isolada
│   ├── dashboard/    → components/, hooks/, types/
│   ├── vault/        → Cofre Global
│   ├── projects/     → Projetos + API Keys
│   ├── bugs/         → Diário de Bugs
│   ├── community/    → Comunidade
│   ├── auth/         → Autenticação
│   └── navigation/   → Config declarativa da sidebar
├── providers/        → ThemeProvider, AuthProvider
├── routes/           → dashboardRoutes, publicRoutes, etc.
├── components/       → Componentes reutilizáveis globais
│   ├── ui/           → Shadcn base
│   ├── CodeBlock.tsx
│   ├── FilterPills.tsx
│   ├── TagCloud.tsx
│   ├── ModuleCard.tsx
│   ├── KeyMask.tsx
│   └── StatusBadge.tsx
├── hooks/            → Hooks globais
├── lib/              → utils.ts, logger.ts
└── types/            → Tipos globais
```

### 2.2 Roteamento Modular
- Criar `src/routes/` com arrays separados: `dashboardRoutes.ts`, `vaultRoutes.ts`, `projectRoutes.ts`, etc.
- `App.tsx` compõe todas as rotas sem definir nenhuma diretamente

### 2.3 Logger Centralizado
- Criar `src/lib/logger.ts` — logs detalhados em dev, apenas erros em prod

### 2.4 React Query
- QueryClient configurado no App.tsx com defaults otimizados (staleTime, cacheTime)

## Fase 3: Componentes Reutilizáveis

### 3.1 CodeBlock
- Syntax highlighting com numeração de linhas
- Botão "Copiar Código" proeminente
- Suporte a múltiplas linguagens
- Fonte JetBrains Mono

### 3.2 FilterPills
- Botões estilo pills para categorias (Lógica de Negócios, UI/UX, Segurança, etc.)
- Estado ativo com destaque visual

### 3.3 TagCloud
- Tags clicáveis (#react, #node, #whatsapp-api, #criptografia)
- Filtro instantâneo ao clicar

### 3.4 ModuleCard
- Card com: título, ícone da linguagem, preview de 3 linhas de código (esfumaçado), tags, data
- Hover state com animação sutil

### 3.5 KeyMask
- Campo mascarado (••••••••) com botão "olho" para revelar
- Botão copiar que funciona sem revelar

### 3.6 StatusBadge
- Badges coloridas semânticas: Dev (azul), Staging (amarelo), Prod (verde), Aberto (vermelho), Resolvido (verde)

### 3.7 SpotlightSearch (Cmd+K)
- Modal flutuante centralizado com blur no fundo
- Busca por títulos, tags, conteúdo de código, bugs
- Resultados agrupados por categoria

## Fase 4: Páginas Principais

### 4.1 Dashboard
- Cards com estatísticas: total de projetos, módulos no cofre, keys, bugs abertos
- Projetos recentes
- Atalhos rápidos

### 4.2 Cofre Global — Lista
- Header: título, "Novo Módulo", barra de pesquisa
- FilterPills por categoria + TagCloud
- Grid de ModuleCards

### 4.3 Cofre Global — Detalhe do Módulo
- Cabeçalho: título, tags, Editar/Excluir/Compartilhar
- Seção "Porquê e Como": bloco Markdown com contexto técnico
- Seção Dependências: bloco terminal com `npm install ...` + botão Copy
- Seção Código: CodeBlock completo com syntax highlighting
- Seção Histórico de Bugs: Accordion com problemas passados e soluções

### 4.4 Projetos — Lista e Detalhe
- CRUD de projetos (nome, descrição, cor, ícone)
- Dentro do projeto: abas para API Keys, Snippets, Documentações
- API Keys: Data Table com KeyMask, StatusBadge, copiar

### 4.5 Diário de Bugs
- Cards por status: Aberto / Resolvido
- Cada registro: Sintoma, Código causador, Solução, link para módulo do Cofre

### 4.6 Comunidade
- Feed público de snippets compartilhados
- Filtro por linguagem/tag
- Favoritar

## Fase 5: Mock Data Realista
- Todos os dados simulados com contexto real: sistemas de checkout, integrações WhatsApp/Telegram/Discord, criptografia, webhooks
- Zero Lorem Ipsum

## Fase 6 (Futuro): Autenticação + Backend
- Supabase Auth (login/cadastro)
- Edge Functions para todas as operações de banco
- RLS para isolamento de dados
- *Não será implementado agora — foco é no frontend completo primeiro*

