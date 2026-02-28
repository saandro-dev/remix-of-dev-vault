# DevVault - Guia de Padrões de Conteúdo

> **🔴 FONTE DA VERDADE MÁXIMA** - Este documento define as regras e padrões que **todos** os agentes de IA devem seguir ao adicionar ou modificar conteúdo no DevVault. O objetivo é garantir consistência, qualidade e máxima usabilidade para os agentes que consumirão este conhecimento.
> Última atualização: 2026-02-28
> Mantenedor: Arquiteto de IA

---

## Princípios Fundamentais

1.  **Inglês Primeiro:** Todos os campos de texto (`title`, `description`, `why_it_matters`, etc.) **devem** ser escritos em inglês. As `tags` podem conter termos em português se forem de alta relevância para a busca.
2.  **Atomicidade:** Cada módulo deve representar uma única ideia, padrão ou trecho de código. Evite criar módulos monolíticos. Se um conceito é muito grande, quebre-o em múltiplos módulos e agrupe-os usando o campo `module_group`.
3.  **Validação > Rascunho:** O objetivo é ter um vault de conhecimento validado. Sempre que possível, adicione conteúdo que já foi testado e provado em um projeto real. O status `draft` deve ser temporário.
4.  **Contexto é Rei:** Um trecho de código sem contexto é inútil. Os campos `why_it_matters` e `usage_hint` são **obrigatórios** e devem explicar o problema que o módulo resolve e quando ele deve ser usado.

---

## Estrutura de um Módulo (`vault_modules`)

Esta seção detalha o propósito e o preenchimento correto de cada campo da tabela `vault_modules`.

### Campos de Identificação

| Campo | Tipo | Obrigatório | Descrição e Padrão |
| :--- | :--- | :--- | :--- |
| `title` | `text` | ✅ Sim | **Título conciso e descritivo em inglês.** Deve ser autoexplicativo. Ex: "Secure Session Cookies — HttpOnly, Secure, SameSite". |
| `slug` | `text` | ❌ Não | **URL-friendly slug.** Se omitido, será gerado a partir do título. Ex: `secure-session-cookies`. |
| `description` | `text` | ❌ Não | Descrição um pouco mais longa que o título, se necessário. |

### Campos de Classificação

| Campo | Tipo | Obrigatório | Descrição e Valores Válidos |
| :--- | :--- | :--- | :--- |
| `domain` | `enum` | ✅ Sim | **A grande área de conhecimento.** Valores: `security`, `backend`, `frontend`, `architecture`, `devops`, `saas_playbook`. |
| `module_type` | `enum` | ✅ Sim | **O formato do conteúdo.** Valores: `code_snippet`, `full_module`, `sql_migration`, `architecture_doc`, `playbook_phase`, `pattern_guide`. |
| `language` | `text` | ✅ Sim | **A linguagem principal do código.** Ex: `typescript`, `sql`, `bash`, `python`. Use `text` para documentos. |
| `tags` | `text[]` | ✅ Sim | **Array de tags para busca.** Pelo menos uma tag é obrigatória. Use lowercase. Ex: `["auth", "cookies", "security"]`. |

### Campos de Conteúdo Principal

| Campo | Tipo | Obrigatório | Descrição e Padrão |
| :--- | :--- | :--- | :--- |
| `code` | `text` | ✅ Sim | **O trecho de código, script SQL ou corpo do documento.** Deve ser completo e funcional. |
| `why_it_matters` | `text` | ✅ Sim | **Explicação em inglês do porquê este módulo é importante.** Qual problema ele resolve? Qual vulnerabilidade ele previne? Ex: "Storing JWTs in localStorage exposes the app to XSS attacks. HttpOnly cookies eliminate this vector." |
| `usage_hint` | `text` | ✅ Sim | **Instrução clara sobre quando e como usar este módulo.** Ex: "Use when storing auth tokens in cookies instead of localStorage to prevent XSS token theft." |
| `code_example` | `text` | ✅ Sim | **Exemplo prático de como usar o código do campo `code`.** Mostre a chamada da função, o `import`, etc. |
| `context_markdown` | `text` | ❌ Não | Documentação adicional em Markdown para explicações mais longas, se necessário. |

### Campos de Agrupamento e Ordenação

| Campo | Tipo | Obrigatório | Descrição e Padrão |
| :--- | :--- | :--- | :--- |
| `module_group` | `text` | ❌ Não | **Agrupa módulos relacionados que não são dependências diretas.** Use um slug em lowercase. Ex: `whatsapp-integration`. |
| `implementation_order` | `integer` | ❌ Não | **Define a ordem de implementação dentro de um `module_group`.** Use 1, 2, 3... |
| `saas_phase` | `integer` | ❌ Não | **Associa o módulo a uma fase do SaaS Playbook.** Apenas para módulos que se encaixam no playbook. |
| `phase_title` | `text` | ❌ Não | **Título da fase do SaaS Playbook.** Deve ser consistente com o `saas_phase`. Ex: "Phase 2: Authentication and Security". |

### Campos de Metadados

| Campo | Tipo | Obrigatório | Descrição e Padrão |
| :--- | :--- | :--- | :--- |
| `source_project` | `text` | ✅ Sim | **O nome do projeto onde este módulo foi validado.** Ex: `risecheckout`. |
| `validation_status` | `enum` | ✅ Sim | **O status de validação.** Comece com `draft` e mude para `validated` após a revisão. Valores: `draft`, `validated`, `deprecated`. |
| `visibility` | `enum` | ✅ Sim | **Quem pode ver este módulo.** O padrão é `private`. Use `global` para conhecimento compartilhado. Valores: `private`, `shared`, `global`. |
| `dependencies` | `text` | ❌ Não | **(LEGADO)** Não use este campo. As dependências são gerenciadas por uma tabela separada. |
| `related_modules` | `uuid[]` | ❌ Não | **(LEGADO)** Não use este campo. |

---

## O SaaS Playbook

O `saas_playbook` é um domínio especial que organiza a construção de um SaaS em fases. Módulos do tipo `playbook_phase` definem estas fases. Outros módulos podem se associar a uma fase usando os campos `saas_phase` e `phase_title`.

| `saas_phase` | `phase_title` |
| :--- | :--- |
| 1 | Foundation and Project Setup |
| 2 | Authentication and Security |
| 3 | Database and Encryption |
| 4 | Edge Functions |
| 5 | Frontend and UX |

---

## Como Adicionar Conteúdo (via API `vault-ingest`)

Para adicionar conteúdo, um agente deve fazer uma requisição `POST` para a Edge Function `vault-ingest` com a `action` apropriada.

**Endpoint:** `https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1/vault-ingest`
**Autenticação:** Header `X-DevVault-Key: dvlt_...`

### Ação: `ingest` (Criação)

O corpo da requisição pode ser um único objeto de módulo ou um array de módulos no campo `modules`.

```json
{
  "action": "ingest",
  "modules": [
    {
      "title": "My New Validated Pattern",
      "domain": "backend",
      "module_type": "pattern_guide",
      "language": "text",
      "tags": ["design-pattern", "solid"],
      "code": "The actual content of the pattern guide in Markdown...",
      "why_it_matters": "This pattern reduces coupling and improves maintainability by...",
      "usage_hint": "Apply this pattern when you have multiple services that need to...",
      "code_example": "N/A",
      "source_project": "my-new-saas",
      "validation_status": "validated",
      "visibility": "global"
    }
  ]
}
```

### Ações: `update` e `delete`

Para atualizar ou deletar, envie a `action` correspondente e o `id` do módulo a ser modificado.

```json
{
  "action": "update",
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "validation_status": "deprecated"
}
```

```json
{
  "action": "delete",
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
}
```

Ao seguir estes padrões, garantimos que o DevVault se torne um ativo de conhecimento de altíssima qualidade, acelerando o desenvolvimento de futuros projetos de forma consistente e segura.
