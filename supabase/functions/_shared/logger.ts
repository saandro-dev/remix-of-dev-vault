/**
 * logger.ts — Structured logger for Edge Functions.
 *
 * Emits logs in structured JSON format, facilitating ingestion
 * by observability tools (Sentry, Datadog, etc.).
 * Includes correlation-id for request tracing.
 *
 * Pattern extracted from RiseCheckout (production-validated).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  fn: string;
  message: string;
  correlationId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Creates a contextualized logger for a specific Edge Function.
 *
 * @param fnName - Edge Function name (e.g. "create-api-key")
 * @param correlationId - Request tracing ID (optional)
 */
export function createLogger(fnName: string, correlationId?: string) {
  const log = (level: LogLevel, message: string, extra?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level,
      fn: fnName,
      message,
      ts: new Date().toISOString(),
      ...(correlationId ? { correlationId } : {}),
      ...extra,
    };
    const output = JSON.stringify(entry);
    if (level === "error" || level === "warn") {
      console.error(output);
    } else {
      console.log(output);
    }
  };

  return {
    debug: (message: string, extra?: Record<string, unknown>) => log("debug", message, extra),
    info: (message: string, extra?: Record<string, unknown>) => log("info", message, extra),
    warn: (message: string, extra?: Record<string, unknown>) => log("warn", message, extra),
    error: (message: string, extra?: Record<string, unknown>) => log("error", message, extra),
  };
}

export type Logger = ReturnType<typeof createLogger>;
