/**
 * sentry.ts — Error reporting wrapper for Edge Functions.
 *
 * Wraps the main handler of each Edge Function to capture unhandled
 * errors, log them in a structured format, and return a standardized
 * 500 response instead of letting the function crash.
 *
 * In production, set SENTRY_DSN to send errors to Sentry.
 * Without the variable set, errors are only logged to the console.
 */

import { createLogger } from "./logger.ts";
import { getCorsHeaders } from "./cors-v2.ts";

export type EdgeHandler = (req: Request) => Promise<Response>;

/**
 * Wraps an Edge Function handler with global error capture.
 * Ensures that no unhandled error causes an empty response or
 * a silent timeout.
 *
 * @param fnName  - Function name for log identification
 * @param handler - The main Edge Function handler
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

      // Send to Sentry if DSN is configured
      const sentryDsn = Deno.env.get("SENTRY_DSN");
      if (sentryDsn) {
        // Fire-and-forget: does not block the response
        reportToSentry(sentryDsn, fnName, error, correlationId).catch(() => {});
      }

      const headers = getCorsHeaders(req);
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
          headers: { ...headers, "Content-Type": "application/json" },
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
    // Silent — error reporting must never cause another error
  }
}
