/**
 * mcp-tools/types.ts — Shared types for MCP tool modules.
 *
 * Defines the AuthContext and ToolRegistrar signature used by every tool file.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  userId: string;
  keyId: string;
}

export type McpServerLike = {
  tool: (name: string, config: {
    description: string;
    inputSchema: Record<string, unknown>;
    handler: (params: Record<string, unknown>) => Promise<{
      content: Array<{ type: string; text: string }>;
    }>;
  }) => void;
};

export type ToolRegistrar = (
  server: McpServerLike,
  client: SupabaseClient,
  auth: AuthContext,
) => void;
