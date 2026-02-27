/**
 * admin-crud — Edge Function for admin panel operations.
 *
 * Actions:
 *   - get-my-role: Returns the authenticated user's role (replaces direct RPC)
 *   - list-users:  Returns all users with profiles and roles (admin+ required)
 *   - change-role: Changes a target user's role (owner only)
 *
 * Follows the established pattern from bugs-crud/index.ts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCorsV2,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES,
} from "../_shared/api-helpers.ts";
import { authenticateRequest, isResponse } from "../_shared/auth.ts";
import {
  getUserRole,
  requireRole,
  isValidRole,
  type AppRole,
} from "../_shared/role-validator.ts";

serve(async (req) => {
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(
      req,
      ERROR_CODES.VALIDATION_ERROR,
      "Only POST allowed",
      405,
    );
  }

  const auth = await authenticateRequest(req);
  if (isResponse(auth)) return auth;
  const { user, client } = auth;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "get-my-role": {
        const role = await getUserRole(client, user.id);
        return createSuccessResponse(req, { role });
      }

      case "list-users": {
        await requireRole(client, user.id, "admin");

        // Fetch all profiles
        const { data: profiles, error: profilesError } = await client
          .from("profiles")
          .select("id, display_name, avatar_url, bio, created_at")
          .order("created_at", { ascending: true });

        if (profilesError) throw profilesError;

        // Fetch all roles
        const { data: roles, error: rolesError } = await client
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        // Build role lookup map
        const roleMap = new Map<string, string>();
        for (const r of roles ?? []) {
          const existing = roleMap.get(r.user_id);
          if (!existing) {
            roleMap.set(r.user_id, r.role);
          }
        }

        // Merge profiles with roles
        const users = (profiles ?? []).map((p) => ({
          id: p.id,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          role: roleMap.get(p.id) ?? "user",
          createdAt: p.created_at,
        }));

        return createSuccessResponse(req, { users });
      }

      case "change-role": {
        // Only owners can change roles
        await requireRole(client, user.id, "owner");

        const { targetUserId, newRole } = body;

        if (!targetUserId || !newRole) {
          return createErrorResponse(
            req,
            ERROR_CODES.VALIDATION_ERROR,
            "Missing targetUserId or newRole",
            422,
          );
        }

        if (!isValidRole(newRole)) {
          return createErrorResponse(
            req,
            ERROR_CODES.VALIDATION_ERROR,
            `Invalid role: ${newRole}. Must be one of: owner, admin, moderator, user`,
            422,
          );
        }

        // Prevent self-demotion
        if (targetUserId === user.id) {
          return createErrorResponse(
            req,
            ERROR_CODES.VALIDATION_ERROR,
            "Cannot change your own role",
            422,
          );
        }

        // Upsert the role: update if exists, insert if not
        const { data: existingRole } = await client
          .from("user_roles")
          .select("id")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (existingRole) {
          const { error } = await client
            .from("user_roles")
            .update({ role: newRole as AppRole })
            .eq("user_id", targetUserId);
          if (error) throw error;
        } else {
          const { error } = await client
            .from("user_roles")
            .insert({ user_id: targetUserId, role: newRole as AppRole });
          if (error) throw error;
        }

        return createSuccessResponse(req, { success: true, newRole });
      }

      default:
        return createErrorResponse(
          req,
          ERROR_CODES.VALIDATION_ERROR,
          `Unknown action: ${action}`,
          422,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Role validation errors should return 403
    if (message.startsWith("Insufficient permissions")) {
      return createErrorResponse(req, ERROR_CODES.FORBIDDEN, message, 403);
    }

    console.error("[admin-crud]", message);
    return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, message, 500);
  }
});
