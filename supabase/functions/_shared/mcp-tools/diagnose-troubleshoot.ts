/**
 * mcp-tools/diagnose-troubleshoot.ts — Troubleshooting logic for devvault_diagnose.
 *
 * Contains the multi-strategy error resolution pipeline:
 *   1. common_errors JSONB match
 *   2. solves_problems array match (tokenized)
 *   3. resolved knowledge gaps
 *   4. hybrid search fallback (pgvector + tsvector)
 *   5. tag-based fallback (keyword extraction → tag overlap)
 */

import { createLogger } from "../logger.ts";
import { generateEmbedding } from "../embedding-client.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:diagnose-troubleshoot");

type SupabaseClient = Parameters<ToolRegistrar>[1];
type AuthContext = Parameters<ToolRegistrar>[2];

/** Extract meaningful keywords from an error message for tag matching */
function extractKeywords(errorMsg: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "into", "about",
    "not", "no", "but", "or", "and", "if", "then", "than", "too", "very",
    "just", "don", "t", "s", "it", "its", "this", "that", "there", "error",
    "cannot", "get", "set", "null", "undefined", "true", "false",
  ]);

  return errorMsg
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

export async function handleTroubleshooting(
  client: SupabaseClient,
  auth: AuthContext,
  errorMsg: string,
  domain: string | undefined,
  limit: number,
) {
  logger.info("troubleshooting", { errorMsg: errorMsg.substring(0, 100), domain });

  try {
    const errorTokens = extractKeywords(errorMsg);

    // Strategy 1: common_errors JSONB
    const errorMatches = await matchCommonErrors(client, errorMsg, domain);

    // Strategy 2: solves_problems (tokenized)
    const matchedIds = new Set(errorMatches.map((m) => m.id as string));
    const solvesMatches = await matchSolvesProblems(client, errorMsg, domain, matchedIds, errorTokens);

    // Strategy 3: resolved knowledge gaps
    const gapMatches = await matchResolvedGaps(client, errorMsg);

    // Strategy 4: Hybrid search fallback
    const ilikeMatches = await hybridSearchFallback(client, errorMsg, domain, limit, matchedIds);

    // Strategy 5: Tag-based fallback
    const tagMatches = await matchByTags(client, errorTokens, domain, matchedIds);

    const allMatches = [...errorMatches, ...solvesMatches, ...gapMatches, ...ilikeMatches, ...tagMatches]
      .sort((a, b) => (b.relevance as number) - (a.relevance as number))
      .slice(0, limit);

    trackUsage(client, auth, {
      event_type: allMatches.length > 0 ? "diagnose" : "search_miss",
      tool_name: "devvault_diagnose",
      query_text: errorMsg,
      result_count: allMatches.length,
    });

    logger.info("diagnosis complete", {
      total: allMatches.length,
      errorMatches: errorMatches.length,
      solvesMatches: solvesMatches.length,
      gapMatches: gapMatches.length,
      ilikeMatches: ilikeMatches.length,
      tagMatches: tagMatches.length,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          mode: "troubleshooting",
          diagnosis: {
            query: errorMsg,
            total_matches: allMatches.length,
            match_breakdown: {
              common_errors: errorMatches.length,
              solves_problems: solvesMatches.length,
              resolved_gaps: gapMatches.length,
              hybrid_search: ilikeMatches.length,
              tag_match: tagMatches.length,
            },
          },
          matching_modules: allMatches,
          _hint: allMatches.length > 0
            ? "Use devvault_get with a module's slug to fetch the full code and implementation details."
            : "No solution found. Use devvault_report_bug to register this gap. " +
              "When you solve it, call devvault_resolve_bug to document the solution.",
        }, null, 2),
      }],
    };
  } catch (err) {
    logger.error("uncaught error", { error: String(err) });
    return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
  }
}

// ── Strategy 1: common_errors JSONB ──────────────────────────────────────────

async function matchCommonErrors(
  client: SupabaseClient,
  errorMsg: string,
  domain: string | undefined,
): Promise<Array<Record<string, unknown>>> {
  let query = client
    .from("vault_modules")
    .select("id, slug, title, description, domain, common_errors, solves_problems, usage_hint, why_it_matters, difficulty, estimated_minutes")
    .eq("visibility", "global")
    .in("validation_status", ["validated", "draft"])
    .not("common_errors", "eq", "[]")
    .not("common_errors", "is", null);
  if (domain) query = query.eq("domain", domain);
  const { data: commonErrorModules } = await query.limit(50);

  const errorLower = errorMsg.toLowerCase();
  const matches: Array<Record<string, unknown>> = [];

  for (const mod of (commonErrorModules ?? []) as Record<string, unknown>[]) {
    const errors = mod.common_errors as Array<Record<string, string>> | null;
    if (!errors || !Array.isArray(errors)) continue;
    for (const entry of errors) {
      if (
        entry.error?.toLowerCase().includes(errorLower) ||
        errorLower.includes(entry.error?.toLowerCase() ?? "")
      ) {
        matches.push({
          id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
          match_type: "common_errors", relevance: 0.95,
          quick_fix: entry.fix, error_cause: entry.cause, matched_error: entry.error,
          difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
        });
        break;
      }
    }
  }

  return matches;
}

// ── Strategy 2: solves_problems (tokenized matching) ─────────────────────────

async function matchSolvesProblems(
  client: SupabaseClient,
  errorMsg: string,
  domain: string | undefined,
  matchedIds: Set<string>,
  errorTokens: string[],
): Promise<Array<Record<string, unknown>>> {
  let query = client
    .from("vault_modules")
    .select("id, slug, title, description, domain, solves_problems, usage_hint, difficulty, estimated_minutes")
    .eq("visibility", "global")
    .in("validation_status", ["validated", "draft"])
    .not("solves_problems", "eq", "{}");
  if (domain) query = query.eq("domain", domain);
  const { data: solvesModules } = await query.limit(50);

  const errorLower = errorMsg.toLowerCase();
  const matches: Array<Record<string, unknown>> = [];

  for (const mod of (solvesModules ?? []) as Record<string, unknown>[]) {
    if (matchedIds.has(mod.id as string)) continue;
    const problems = mod.solves_problems as string[] | null;
    if (!problems) continue;

    // Try exact substring first (high relevance)
    let matchedProblem = problems.find(
      (p) => p.toLowerCase().includes(errorLower) || errorLower.includes(p.toLowerCase()),
    );

    if (matchedProblem) {
      matches.push({
        id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
        match_type: "solves_problems", relevance: 0.8, matched_problem: matchedProblem,
        difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
      });
      matchedIds.add(mod.id as string);
      continue;
    }

    // Tokenized fallback: match if 2+ error tokens appear in any problem
    for (const problem of problems) {
      const matchCount = errorTokens.filter((t) => problem.toLowerCase().includes(t)).length;
      if (matchCount >= 2) {
        matches.push({
          id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
          match_type: "solves_problems_partial", relevance: 0.6 + (matchCount * 0.05),
          matched_problem: problem,
          difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
        });
        matchedIds.add(mod.id as string);
        break;
      }
    }
  }

  return matches;
}

// ── Strategy 3: resolved knowledge gaps ──────────────────────────────────────

async function matchResolvedGaps(
  client: SupabaseClient,
  errorMsg: string,
): Promise<Array<Record<string, unknown>>> {
  const { data: resolvedGaps } = await client
    .from("vault_knowledge_gaps")
    .select("id, error_message, resolution, resolution_code, domain, resolved_at, promoted_module_id")
    .in("status", ["resolved", "promoted_to_module"])
    .ilike("error_message", `%${errorMsg.substring(0, 100)}%`)
    .limit(5);

  return ((resolvedGaps ?? []) as Record<string, unknown>[]).map((gap) => ({
    id: gap.id, match_type: "resolved_gap", relevance: 0.7,
    error_message: gap.error_message, resolution: gap.resolution,
    resolution_code: gap.resolution_code, domain: gap.domain,
    promoted_module_id: gap.promoted_module_id, resolved_at: gap.resolved_at,
  }));
}

// ── Strategy 4: Hybrid search fallback ───────────────────────────────────────

async function hybridSearchFallback(
  client: SupabaseClient,
  errorMsg: string,
  domain: string | undefined,
  limit: number,
  matchedIds: Set<string>,
): Promise<Array<Record<string, unknown>>> {
  let queryEmbedding: string | null = null;
  try {
    const embArr = await generateEmbedding(errorMsg);
    queryEmbedding = `[${embArr.join(",")}]`;
  } catch {
    logger.warn("diagnose: embedding generation failed, using full-text only");
  }

  const { data: ilikeFallback } = await client.rpc("hybrid_search_vault_modules", {
    p_query_text: errorMsg,
    p_query_embedding: queryEmbedding,
    p_domain: domain ?? null,
    p_match_count: limit,
  });

  const matches: Array<Record<string, unknown>> = [];
  for (const mod of (ilikeFallback ?? []) as Record<string, unknown>[]) {
    if (matchedIds.has(mod.id as string)) continue;
    matches.push({
      id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
      match_type: "hybrid_search", relevance: Number(mod.relevance_score ?? 0.5),
      difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
    });
    matchedIds.add(mod.id as string);
  }

  return matches;
}

// ── Strategy 5: Tag-based fallback ───────────────────────────────────────────

async function matchByTags(
  client: SupabaseClient,
  errorTokens: string[],
  domain: string | undefined,
  matchedIds: Set<string>,
): Promise<Array<Record<string, unknown>>> {
  if (errorTokens.length === 0) return [];

  // Use the most distinctive tokens as potential tags (limit to 10)
  const candidateTags = errorTokens.slice(0, 10);

  let query = client
    .from("vault_modules")
    .select("id, slug, title, description, domain, tags, usage_hint, difficulty, estimated_minutes")
    .eq("visibility", "global")
    .in("validation_status", ["validated", "draft"])
    .overlaps("tags", candidateTags);

  if (domain) query = query.eq("domain", domain);
  const { data: tagModules } = await query.limit(10);

  const matches: Array<Record<string, unknown>> = [];
  for (const mod of (tagModules ?? []) as Record<string, unknown>[]) {
    if (matchedIds.has(mod.id as string)) continue;
    const tags = mod.tags as string[];
    const overlapCount = candidateTags.filter((t) => tags.some((tag) => tag.toLowerCase().includes(t))).length;
    if (overlapCount >= 1) {
      matches.push({
        id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
        match_type: "tag_match", relevance: 0.4 + (overlapCount * 0.1),
        matched_tags: tags.filter((tag) => candidateTags.some((t) => tag.toLowerCase().includes(t))),
        difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
      });
      matchedIds.add(mod.id as string);
    }
  }

  return matches;
}
