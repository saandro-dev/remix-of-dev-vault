/**
 * sentry.ts — Wrapper de error reporting para Edge Functions.
 *
 * Envolve o handler principal de cada Edge Function para capturar
 * erros não tratados, registrá-los de forma estruturada e retornar
 * uma resposta 500 padronizada em vez de deixar a função travar.
 *
 * Em produção, configure SENTRY_DSN para enviar erros ao Sentry.
 * Sem a variável configurada, os erros são apenas logados no console.
 *
 * Padrão extraído do RiseCheckout (validado em produção).
 */

import { createLogger } from "./logger.ts";
import { getCorsHeaders } from "./cors-v2.ts";

export type EdgeHandler = (req: Request) => Promise<Response>;

/**
 * Envolve um handler de Edge Function com captura de erros global.
 * Garante que nenhum erro não tratado cause uma resposta vazia ou
 * um timeout silencioso.
 *
 * @param fnName - Nome da função para identificação nos logs
 * @param handler - O handler principal da Edge Function
 */
export function withSentry(fnName: string, handler: EdgeHandler): EdgeHandler {
  return async (req: Request): Promise<Response> => {
    const correlationId = req.headers.get("x-correlation-id") ?? crypto.randomUUID();
    const log = createLogger(fnName, correlationId);

    try {
      log.info("Request received", {
        method: req.method,
        url: req.url,
      });

      const response = await handler(req);

      log.info("Request completed", { status: response.status });
      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));

      log.error("Unhandled exception", {
        error: error.message,
        stack: error.stack,
      });

      // Enviar para Sentry se DSN configurado
      const sentryDsn = Deno.env.get("SENTRY_DSN");
      if (sentryDsn) {
        // Fire-and-forget: não bloqueia a resposta
        reportToSentry(sentryDsn, fnName, error, correlationId).catch(() => {});
      }

      const corsHeaders = getCorsHeaders(req);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred. Please try again later.",
            correlationId,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  };
}

async function reportToSentry(
  dsn: string,
  fnName: string,
  error: Error,
  correlationId: string,
): Promise<void> {
  try {
    // Parsear o DSN do Sentry para extrair a URL de ingestão
    const url = new URL(dsn);
    const projectId = url.pathname.replace("/", "");
    const key = url.username;
    const sentryUrl = `${url.protocol}//${url.hostname}/api/${projectId}/store/`;

    await fetch(sentryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}`,
      },
      body: JSON.stringify({
        event_id: correlationId.replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: "javascript",
        level: "error",
        logger: fnName,
        exception: {
          values: [
            {
              type: error.name,
              value: error.message,
              stacktrace: {
                frames: (error.stack ?? "").split("\n").map((line) => ({
                  filename: line.trim(),
                })),
              },
            },
          ],
        },
        tags: {
          edge_function: fnName,
          correlation_id: correlationId,
        },
      }),
    });
  } catch {
    // Silencioso — não queremos que o error reporting cause outro erro
  }
}
