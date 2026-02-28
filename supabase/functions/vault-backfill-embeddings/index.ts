/**
 * vault-backfill-embeddings — One-shot Edge Function for backfilling embeddings.
 *
 * Processes vault_modules with NULL embedding in batches of 20.
 * Call manually once after Phase 3 migration.
 *
 * POST {} — no parameters needed.
 * Authentication: requires Authorization header with service role or admin JWT.
 */

import { handleCorsV2 } from "../_shared/cors-v2.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { createLogger } from "../_shared/logger.ts";
import { buildEmbeddingInput, generateEmbedding } from "../_shared/embedding-client.ts";

const logger = createLogger("vault-backfill-embeddings");

const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES_MS = 1000;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient("general");

  let totalProcessed = 0;
  let totalFailed = 0;
  let hasMore = true;

  logger.info("backfill started");

  while (hasMore) {
    const { data: modules, error } = await supabase
      .from("vault_modules")
      .select("id, title, description, why_it_matters, usage_hint, tags, solves_problems")
      .eq("visibility", "global")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (error) {
      logger.error("fetch error", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!modules || modules.length === 0) {
      hasMore = false;
      break;
    }

    logger.info("processing batch", { batchSize: modules.length, totalSoFar: totalProcessed });

    for (const mod of modules as Record<string, unknown>[]) {
      const input = buildEmbeddingInput(mod);
      if (!input) {
        logger.warn("skipping module: no embeddable content", { id: mod.id });
        totalFailed++;
        continue;
      }

      try {
        const embedding = await generateEmbedding(input);
        const vectorLiteral = `[${embedding.join(",")}]`;

        const { error: updateError } = await supabase
          .from("vault_modules")
          .update({ embedding: vectorLiteral })
          .eq("id", mod.id as string);

        if (updateError) {
          logger.error("update failed", { id: mod.id, error: updateError.message });
          totalFailed++;
        } else {
          totalProcessed++;
        }
      } catch (err) {
        logger.error("embedding failed", { id: mod.id, error: String(err) });
        totalFailed++;
      }
    }

    // Rate limit protection
    if (modules.length === BATCH_SIZE) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    } else {
      hasMore = false;
    }
  }

  logger.info("backfill complete", { totalProcessed, totalFailed });

  return new Response(JSON.stringify({
    success: true,
    total_processed: totalProcessed,
    total_failed: totalFailed,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
