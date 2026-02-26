import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createErrorResponse, ERROR_CODES } from "./api-helpers.ts";

export interface AuthenticatedContext {
  user: { id: string; email?: string };
  client: ReturnType<typeof createClient>;
}

export async function authenticateRequest(
  req: Request
): Promise<AuthenticatedContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
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
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
  }

  return { user, client };
}

export function isResponse(
  result: AuthenticatedContext | Response
): result is Response {
  return result instanceof Response;
}
