

## Phase 3 — Semantic Search com pgvector (Hybrid Search) ✅ COMPLETE

### Summary

Added **semantic vector search** via OpenAI `text-embedding-3-small` (1536 dims) + `pgvector`, combined with existing full-text search (PT/EN) into a **Hybrid Search** with configurable weighted scoring (default: 30% full-text, 70% semantic).

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Query: "webhook not receiving events"                       │
└─────────────────────────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
 ┌─────────┐  ┌───────────┐  ┌──────────┐
 │ tsvector │  │ pgvector  │  │  ILIKE   │
 │ PT + EN  │  │ cosine    │  │ fallback │
 └────┬─────┘  └─────┬─────┘  └────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     ▼
        hybrid_search_vault_modules RPC
        (weighted score + ORDER BY)
```

### Database Changes

| Change | Description |
|---|---|
| Extension | `vector` (pgvector) enabled in `extensions` schema |
| Column | `vault_modules.embedding vector(1536)` — nullable for gradual backfill |
| Index | `idx_vault_modules_embedding` — HNSW (m=16, ef_construction=64, cosine) |
| RPC | `hybrid_search_vault_modules` — combines full-text rank + vector similarity |

### New Files

| File | Description |
|---|---|
| `_shared/embedding-client.ts` | OpenAI Embeddings API client: `generateEmbedding()`, `buildEmbeddingInput()`, `updateModuleEmbedding()` |
| `vault-backfill-embeddings/index.ts` | One-shot Edge Function to backfill existing modules (batch of 20, rate-limited) |

### Modified Files

| File | Change |
|---|---|
| `mcp-tools/search.ts` | Uses `hybrid_search_vault_modules` RPC with query embedding |
| `mcp-tools/ingest.ts` | Fire-and-forget `updateModuleEmbedding()` after insert |
| `mcp-tools/update.ts` | Re-generates embedding when relevant fields change |
| `mcp-tools/diagnose.ts` | Strategy 4 uses hybrid search instead of full-text only |
| `vault-query/index.ts` | Search action uses hybrid search RPC with embedding |
| `supabase/config.toml` | Added `vault-backfill-embeddings` entry |

### Hybrid Search Weights

| Parameter | Default | Description |
|---|---|
| `p_full_text_weight` | 0.3 | Weight for tsvector rank score |
| `p_semantic_weight` | 0.7 | Weight for cosine similarity score |

### Secrets Required

| Secret | Status |
|---|---|
| `OPENAI_API_KEY` | ✅ Configured |

### Edge Functions Total: 16

All 16 functions have `verify_jwt = false` in `config.toml`.
