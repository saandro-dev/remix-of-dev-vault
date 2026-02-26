/**
 * logger.ts — Logger estruturado para Edge Functions.
 *
 * Emite logs em formato JSON estruturado, facilitando a ingestão
 * por ferramentas de observabilidade (Sentry, Datadog, etc.).
 * Inclui correlation-id para rastreamento de requisições.
 *
 * Padrão extraído do RiseCheckout (validado em produção).
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
 * Cria um logger contextualizado para uma Edge Function específica.
 *
 * @param fnName - Nome da Edge Function (ex: "create-api-key")
 * @param correlationId - ID de rastreamento da requisição (opcional)
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
