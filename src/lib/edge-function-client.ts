import { supabase } from "@/integrations/supabase/client";

export async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    throw new Error(error.message ?? "Edge function invocation failed");
  }

  if (data?.error) {
    throw new Error(data.error.message ?? "Edge function returned an error");
  }

  return data as T;
}
