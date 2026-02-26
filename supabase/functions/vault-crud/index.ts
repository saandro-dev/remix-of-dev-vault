import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { authenticateRequest, isResponse } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  const auth = await authenticateRequest(req);
  if (isResponse(auth)) return auth;
  const { user, client } = auth;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list": {
        const { data, error } = await client
          .from("vault_modules")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return createSuccessResponse({ items: data });
      }

      case "get": {
        const { id } = body;
        if (!id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { data, error } = await client
          .from("vault_modules")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return createErrorResponse(ERROR_CODES.NOT_FOUND, "Module not found", 404);
        return createSuccessResponse(data);
      }

      case "create": {
        const { title, description, category, language, code, context_markdown, dependencies, tags } = body;
        if (!title) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing title", 422);
        const { data, error } = await client
          .from("vault_modules")
          .insert({
            user_id: user.id,
            title,
            description: description || null,
            category: category || "frontend",
            language: language || "typescript",
            code: code || "",
            context_markdown: context_markdown || null,
            dependencies: dependencies || null,
            tags: tags || [],
          })
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(data, 201);
      }

      case "update": {
        const { id, title, description, category, language, code, context_markdown, dependencies, tags } = body;
        if (!id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const updateFields: Record<string, unknown> = {};
        if (title !== undefined) updateFields.title = title;
        if (description !== undefined) updateFields.description = description || null;
        if (category !== undefined) updateFields.category = category;
        if (language !== undefined) updateFields.language = language;
        if (code !== undefined) updateFields.code = code;
        if (context_markdown !== undefined) updateFields.context_markdown = context_markdown || null;
        if (dependencies !== undefined) updateFields.dependencies = dependencies || null;
        if (tags !== undefined) updateFields.tags = tags;

        const { data, error } = await client
          .from("vault_modules")
          .update(updateFields)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(data);
      }

      case "delete": {
        const { id } = body;
        if (!id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { error } = await client
          .from("vault_modules")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        return createSuccessResponse({ success: true });
      }

      default:
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, `Unknown action: ${action}`, 422);
    }
  } catch (err) {
    console.error("[vault-crud]", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
