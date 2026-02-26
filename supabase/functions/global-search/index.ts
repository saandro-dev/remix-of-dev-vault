import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("DEVVAULT_SECRET_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("DEVVAULT_PUBLISHABLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchTerm = `%${query.trim()}%`;

    const [modulesRes, projectsRes, bugsRes] = await Promise.all([
      supabase
        .from("vault_modules")
        .select("id, title, category")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(10),
      supabase
        .from("projects")
        .select("id, name, color")
        .eq("user_id", user.id)
        .ilike("name", searchTerm)
        .limit(10),
      supabase
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

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
