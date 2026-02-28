/**
 * embedding-client.ts — OpenAI Embeddings API client.
 *
 * Generates vector embeddings for vault modules using text-embedding-3-small (1536 dims).
 * Isolated helper following SRP — used by ingest, update, search, and backfill.
 */

import { createLogger } from "./logger.ts";

const logger = createLogger("embedding-client");

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

/**
 * Builds a single text string from module fields for embedding generation.
 * Concatenates the fields most relevant for semantic search.
 */
export function buildEmbeddingInput(module: Record<string, unknown>): string {
  const parts: string[] = [];

  const textFields = ["title", "description", "why_it_matters", "usage_hint"] as const;
  for (const field of textFields) {
    const value = module[field];
    if (typeof value === "string" && value.trim()) {
      parts.push(value.trim());
    }
  }

  const arrayFields = ["tags", "solves_problems"] as const;
  for (const field of arrayFields) {
    const value = module[field];
    if (Array.isArray(value) && value.length > 0) {
      parts.push(value.join(", "));
    }
  }

  return parts.join(" | ");
}

/**
 * Generates a vector embedding for the given text using OpenAI's API.
 * Returns a float array of EMBEDDING_DIMENSIONS length.
 *
 * @throws Error if OPENAI_API_KEY is not set or if the API call fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY secret is not configured");
  }

  const input = text.trim();
  if (!input) {
    throw new Error("Cannot generate embedding for empty text");
  }

  logger.info("generating embedding", { inputLength: input.length, model: EMBEDDING_MODEL });

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("OpenAI API error", { status: response.status, body: errorBody });
    throw new Error(`OpenAI Embeddings API error (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const embedding = result.data?.[0]?.embedding as number[] | undefined;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Invalid embedding response: expected ${EMBEDDING_DIMENSIONS} dimensions`);
  }

  logger.info("embedding generated", { dimensions: embedding.length });
  return embedding;
}

/**
 * Generates an embedding for a module record and updates the database column.
 * Fire-and-forget safe — logs errors but does not throw.
 */
export async function updateModuleEmbedding(
  client: { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } } },
  moduleId: string,
  moduleData: Record<string, unknown>,
): Promise<void> {
  try {
    const input = buildEmbeddingInput(moduleData);
    if (!input) {
      logger.warn("skipping embedding: no embeddable content", { moduleId });
      return;
    }

    const embedding = await generateEmbedding(input);

    const vectorLiteral = `[${embedding.join(",")}]`;
    const { error } = await client
      .from("vault_modules")
      .update({ embedding: vectorLiteral })
      .eq("id", moduleId);

    if (error) {
      logger.error("failed to save embedding", { moduleId, error: error.message });
    } else {
      logger.info("embedding saved", { moduleId });
    }
  } catch (err) {
    logger.error("embedding generation failed", { moduleId, error: String(err) });
  }
}
