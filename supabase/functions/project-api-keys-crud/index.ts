/**
 * project-api-keys-crud — CRUD de API Keys de Projetos (Vault-backed)
 *
 * Todas as chaves são armazenadas criptografadas no Supabase Vault.
 * O campo key_value na tabela api_keys contém apenas '***' como placeholder.
 * O valor real só é retornado sob demanda via action "read".
 *
 * Actions disponíveis:
 *   - list:   Lista as chaves de uma pasta (sem o valor real)
 *   - create: Armazena nova chave no Vault via store_project_api_key()
 *   - read:   Retorna o valor decriptado de uma chave via read_project_api_key()
 *   - delete: Remove a chave da tabela E do Vault via delete_project_api_key()
 *
 * Padrão: RiseCheckout gateway-credentials + devvault_api_keys (validado em produção)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCors,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES,
} from "../_shared/api-helpers.ts";
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
      // ------------------------------------------------------------------
      // LIST — Retorna chaves de uma pasta SEM o valor real
      // ------------------------------------------------------------------
      case "list": {
        const { folder_id } = body;
        if (!folder_id) {
          return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing folder_id", 422);
        }

        const { data, error } = await client
          .from("api_keys")
          .select("id, label, environment, created_at, vault_secret_id")
          .eq("folder_id", folder_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Nunca retornar key_value — apenas indicar se tem referência no Vault
        const items = (data ?? []).map((k: Record<string, unknown>) => ({
          id: k.id,
          label: k.label,
          environment: k.environment,
          created_at: k.created_at,
          has_value: k.vault_secret_id !== null,
        }));

        return createSuccessResponse({ items });
      }

      // ------------------------------------------------------------------
      // CREATE — Armazena nova chave no Vault via store_project_api_key()
      // ------------------------------------------------------------------
      case "create": {
        const { project_id, folder_id, label, key_value, environment } = body;

        if (!project_id || !folder_id || !label || !key_value) {
          return createErrorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            "Missing required fields: project_id, folder_id, label, key_value",
            422
          );
        }

        const { data, error } = await client.rpc("store_project_api_key", {
          p_user_id:     user.id,
          p_project_id:  project_id,
          p_folder_id:   folder_id,
          p_label:       label,
          p_key_value:   key_value,
          p_environment: environment || "dev",
        });

        if (error) throw error;

        return createSuccessResponse({ id: data }, 201);
      }

      // ------------------------------------------------------------------
      // READ — Retorna o valor decriptado sob demanda (uma chave por vez)
      // ------------------------------------------------------------------
      case "read": {
        const { id } = body;
        if (!id) {
          return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        }

        const { data, error } = await client.rpc("read_project_api_key", {
          p_key_id:  id,
          p_user_id: user.id,
        });

        if (error) throw error;
        if (!data) {
          return createErrorResponse(ERROR_CODES.NOT_FOUND, "Key not found or access denied", 404);
        }

        return createSuccessResponse({ value: data });
      }

      // ------------------------------------------------------------------
      // DELETE — Remove da tabela E do Vault atomicamente
      // ------------------------------------------------------------------
      case "delete": {
        const { id } = body;
        if (!id) {
          return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        }

        const { data, error } = await client.rpc("delete_project_api_key", {
          p_key_id:  id,
          p_user_id: user.id,
        });

        if (error) throw error;
        if (!data) {
          return createErrorResponse(ERROR_CODES.NOT_FOUND, "Key not found or access denied", 404);
        }

        return createSuccessResponse({ success: true });
      }

      default:
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          `Unknown action: ${action}. Valid: list, create, read, delete`,
          422
        );
    }
  } catch (err) {
    console.error("[project-api-keys-crud]", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
