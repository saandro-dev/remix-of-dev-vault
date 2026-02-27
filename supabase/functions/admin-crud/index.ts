/**
 * admin-crud — Edge Function for admin panel operations.
 *
 * Actions:
 *   - get-my-role:          Returns the authenticated user's role
 *   - list-users:           Returns all users with profiles and roles (admin+)
 *   - change-role:          Changes a target user's role (owner only)
 *   - admin-stats:          System health metrics (admin+)
 *   - list-api-keys:        All API keys with owner info (admin+)
 *   - admin-revoke-api-key: Force-revoke any user's API key (owner only)
 *   - list-global-modules:  All modules with visibility = 'global' (admin+)
 *   - unpublish-module:     Set module visibility back to 'private' (admin+)
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

        const { data: profiles, error: profilesError } = await client
          .from("profiles")
          .select("id, display_name, avatar_url, bio, created_at")
          .order("created_at", { ascending: true });

        if (profilesError) throw profilesError;

        const { data: roles, error: rolesError } = await client
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        const roleMap = new Map<string, string>();
        for (const r of roles ?? []) {
          const existing = roleMap.get(r.user_id);
          if (!existing) {
            roleMap.set(r.user_id, r.role);
          }
        }

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

        if (targetUserId === user.id) {
          return createErrorResponse(
            req,
            ERROR_CODES.VALIDATION_ERROR,
            "Cannot change your own role",
            422,
          );
        }

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

      case "admin-stats": {
        await requireRole(client, user.id, "admin");

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const [
          profilesRes,
          modulesRes,
          globalModulesRes,
          activeKeysRes,
          auditLogsRes,
          openBugsRes,
          projectsRes,
          sharesRes,
        ] = await Promise.all([
          client.from("profiles").select("id", { count: "exact", head: true }),
          client.from("vault_modules").select("id", { count: "exact", head: true }),
          client.from("vault_modules").select("id", { count: "exact", head: true }).eq("visibility", "global"),
          client.from("devvault_api_keys").select("id", { count: "exact", head: true }).is("revoked_at", null),
          client.from("devvault_api_audit_log").select("id", { count: "exact", head: true }).gte("created_at", twentyFourHoursAgo),
          client.from("bugs").select("id", { count: "exact", head: true }).eq("status", "open"),
          client.from("projects").select("id", { count: "exact", head: true }),
          client.from("vault_module_shares").select("module_id", { count: "exact", head: true }),
        ]);

        return createSuccessResponse(req, {
          stats: {
            totalUsers: profilesRes.count ?? 0,
            totalModules: modulesRes.count ?? 0,
            globalModules: globalModulesRes.count ?? 0,
            activeApiKeys: activeKeysRes.count ?? 0,
            auditLogs24h: auditLogsRes.count ?? 0,
            openBugs: openBugsRes.count ?? 0,
            totalProjects: projectsRes.count ?? 0,
            activeShares: sharesRes.count ?? 0,
          },
        });
      }

      case "list-api-keys": {
        await requireRole(client, user.id, "admin");

        const { data: keys, error: keysError } = await client
          .from("devvault_api_keys")
          .select("id, user_id, key_name, key_prefix, created_at, last_used_at, revoked_at, expires_at")
          .order("created_at", { ascending: false });

        if (keysError) throw keysError;

        const userIds = [...new Set((keys ?? []).map((k) => k.user_id))];

        const { data: profiles, error: profilesError } = await client
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map<string, string>();
        for (const p of profiles ?? []) {
          profileMap.set(p.id, p.display_name);
        }

        const apiKeys = (keys ?? []).map((k) => ({
          id: k.id,
          userId: k.user_id,
          ownerName: profileMap.get(k.user_id) ?? "Unknown",
          keyName: k.key_name,
          keyPrefix: k.key_prefix,
          createdAt: k.created_at,
          lastUsedAt: k.last_used_at,
          revokedAt: k.revoked_at,
          expiresAt: k.expires_at,
        }));

        return createSuccessResponse(req, { apiKeys });
      }

      case "admin-revoke-api-key": {
        await requireRole(client, user.id, "owner");

        const { keyId } = body;

        if (!keyId) {
          return createErrorResponse(
            req,
            ERROR_CODES.VALIDATION_ERROR,
            "Missing keyId",
            422,
          );
        }

        const { error } = await client
          .from("devvault_api_keys")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", keyId)
          .is("revoked_at", null);

        if (error) throw error;

        return createSuccessResponse(req, { success: true });
      }

      case "list-global-modules": {
        await requireRole(client, user.id, "admin");

        const { data: modules, error: modulesError } = await client
          .from("vault_modules")
          .select("id, title, description, domain, language, tags, created_at, user_id")
          .eq("visibility", "global")
          .order("created_at", { ascending: false });

        if (modulesError) throw modulesError;

        const userIds = [...new Set((modules ?? []).map((m) => m.user_id))];

        const { data: profiles, error: profilesError } = await client
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map<string, string>();
        for (const p of profiles ?? []) {
          profileMap.set(p.id, p.display_name);
        }

        const globalModules = (modules ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          domain: m.domain,
          language: m.language,
          tags: m.tags,
          authorName: profileMap.get(m.user_id) ?? "Unknown",
          createdAt: m.created_at,
        }));

        return createSuccessResponse(req, { globalModules });
      }

      case "unpublish-module": {
        await requireRole(client, user.id, "admin");

        const { moduleId } = body;

        if (!moduleId) {
          return createErrorResponse(
            req,
            ERROR_CODES.VALIDATION_ERROR,
            "Missing moduleId",
            422,
          );
        }

        const { error } = await client
          .from("vault_modules")
          .update({ visibility: "private" })
          .eq("id", moduleId)
          .eq("visibility", "global");

        if (error) throw error;

        return createSuccessResponse(req, { success: true });
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

    if (message.startsWith("Insufficient permissions")) {
      return createErrorResponse(req, ERROR_CODES.FORBIDDEN, message, 403);
    }

    console.error("[admin-crud]", message);
    return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, message, 500);
  }
});
