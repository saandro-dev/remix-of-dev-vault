import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createErrorResponse, ERROR_CODES } from "./api-helpers.ts";

export interface AuthenticatedContext {
  user: { id: string; email?: string };
  client: ReturnType<typeof createClient>;
}

/**
 * Authenticates a request using the Bearer token from the Authorization header.
 * Returns an AuthenticatedContext on success, or a Response with secure CORS on failure.
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthenticatedContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, key);

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
  }

  return { user, client };
}

/**
 * Type guard to check if the result of authenticateRequest is an error Response.
 */
export function isResponse(
  result: AuthenticatedContext | Response
): result is Response {
  return result instanceof Response;
}
