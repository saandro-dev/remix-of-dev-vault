import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuditLogEntry {
  apiKeyId?: string;
  userId: string;
  ipAddress: string;
  action: string;
  success: boolean;
  httpStatus: number;
  errorCode?: string;
  errorMessage?: string;
  requestBody?: unknown;
  processingTimeMs?: number;
}

/**
 * Logs an API call to the audit log table.
 * Uses fire-and-forget pattern — errors are silently ignored.
 */
export function logApiCall(entry: AuditLogEntry): void {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("DEVVAULT_SECRET_KEY")!;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  serviceClient
    .from("devvault_api_audit_log")
    .insert({
      api_key_id: entry.apiKeyId ?? null,
      user_id: entry.userId,
      ip_address: entry.ipAddress,
      action: entry.action,
      success: entry.success,
      http_status: entry.httpStatus,
      error_code: entry.errorCode ?? null,
      error_message: entry.errorMessage ?? null,
      request_body: entry.requestBody ?? null,
      processing_time_ms: entry.processingTimeMs ?? null,
    })
    .then(() => {})
    .catch(() => {});
}
