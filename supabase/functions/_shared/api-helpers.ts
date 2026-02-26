/**
 * api-helpers.ts — Helpers de resposta padronizados para Edge Functions.
 *
 * Centraliza a criação de respostas de sucesso e erro, garantindo
 * consistência no formato JSON e nos headers CORS em toda a API.
 *
 * BREAKING CHANGE: createSuccessResponse e createErrorResponse agora
 * recebem `req` como primeiro argumento para aplicar CORS correto
 * por origem (cors-v2 com allowlist), em vez do "*" inseguro.
 */

import { getCorsHeaders } from "./cors-v2.ts";
export { handleCorsV2 } from "./cors-v2.ts";

// Mantido para compatibilidade retroativa durante a migração
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_API_KEY: "INVALID_API_KEY",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Cria uma resposta de sucesso padronizada com CORS correto para a origem.
 * Prefira esta versão que recebe `req` para CORS seguro com allowlist.
 */
export function createSuccessResponse(
  reqOrData: Request | unknown,
  dataOrStatus?: unknown,
  statusCode = 200,
): Response {
  // Sobrecarga: createSuccessResponse(req, data, status?) — nova forma segura
  if (reqOrData instanceof Request) {
    const req = reqOrData;
    const data = dataOrStatus;
    const status = statusCode;
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
  // Sobrecarga legada: createSuccessResponse(data, status?) — mantida para compatibilidade
  const data = reqOrData;
  const status = typeof dataOrStatus === "number" ? dataOrStatus : 200;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Cria uma resposta de erro padronizada com CORS correto para a origem.
 * Prefira esta versão que recebe `req` para CORS seguro com allowlist.
 */
export function createErrorResponse(
  reqOrCode: Request | ErrorCode,
  codeOrMessage: ErrorCode | string,
  messageOrStatus: string | number,
  statusCode?: number,
): Response {
  // Sobrecarga: createErrorResponse(req, code, message, status) — nova forma segura
  if (reqOrCode instanceof Request) {
    const req = reqOrCode;
    const code = codeOrMessage as ErrorCode;
    const message = messageOrStatus as string;
    const status = statusCode ?? 500;
    return new Response(
      JSON.stringify({ error: { code, message } }),
      {
        status,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
  // Sobrecarga legada: createErrorResponse(code, message, status) — mantida para compatibilidade
  const code = reqOrCode as ErrorCode;
  const message = codeOrMessage as string;
  const status = messageOrStatus as number;
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Trata requisições OPTIONS (preflight CORS) — forma legada.
 * @deprecated Use handleCorsV2 importado de cors-v2.ts
 */
export function handleCors(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: corsHeaders });
}

/**
 * Extrai o IP real do cliente, considerando proxies e Cloudflare.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Extrai o token Bearer do header Authorization.
 * Retorna null se o header estiver ausente ou malformado.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  return token.length > 0 ? token : null;
}
