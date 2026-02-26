import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleCors,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES,
} from "../_shared/api-helpers.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("DEVVAULT_SECRET_KEY")!;

  const serviceClient = createClient(supabaseUrl, serviceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);

  if (authError || !user) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return createSuccessResponse({ results: [] });
    }

    const searchTerm = `%${query.trim()}%`;

    const [modulesRes, projectsRes, bugsRes] = await Promise.all([
      serviceClient
        .from("vault_modules")
        .select("id, title, category")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(10),
      serviceClient
        .from("projects")
        .select("id, name, color")
        .eq("user_id", user.id)
        .ilike("name", searchTerm)
        .limit(10),
      serviceClient
        .from("bugs")
        .select("id, title, status")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(10),
    ]);

    const results = [
      ...(modulesRes.data ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        type: "module" as const,
        meta: m.category,
      })),
      ...(projectsRes.data ?? []).map((p) => ({
        id: p.id,
        title: p.name,
        type: "project" as const,
        meta: p.color,
      })),
      ...(bugsRes.data ?? []).map((b) => ({
        id: b.id,
        title: b.title,
        type: "bug" as const,
        meta: b.status,
      })),
    ];

    return createSuccessResponse({ results });
  } catch (err) {
    console.error("[global-search] Error:", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
