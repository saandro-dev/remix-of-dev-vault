import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { AppRole } from "../types/admin.types";

interface ChangeRoleResponse {
  success: boolean;
  newRole: AppRole;
}

export async function changeUserRole(
  targetUserId: string,
  newRole: AppRole,
): Promise<ChangeRoleResponse> {
  return invokeEdgeFunction<ChangeRoleResponse>("admin-crud", {
    action: "change-role",
    targetUserId,
    newRole,
  });
}
