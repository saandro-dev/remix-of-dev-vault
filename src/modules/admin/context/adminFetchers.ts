import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { AdminUser } from "../types/admin.types";

interface ListUsersResponse {
  users: AdminUser[];
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const response = await invokeEdgeFunction<ListUsersResponse>("admin-crud", {
    action: "list-users",
  });
  return response.users;
}
