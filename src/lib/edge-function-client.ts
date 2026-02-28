import { supabase } from "@/integrations/supabase/client";

export async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  // Fetch the current session to send the logged-in user's JWT in the Authorization header
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers,
  });

  if (error) {
    throw new Error(error.message ?? "Edge function invocation failed");
  }

  if (data?.error) {
    throw new Error(data.error.message ?? "Edge function returned an error");
  }

  return data as T;
}
