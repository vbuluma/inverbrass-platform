/**
 * Purpose:
 * ENG-002 — Resolve effective permission codes for a business membership.
 *
 * Design rationale:
 * Server actions and channel adapters must not grant permissions implicitly.
 * Permissions are resolved from role assignments at runtime.
 */

import { and, eq, isNull } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { getDb } from "@/db/client";
import { permission } from "@/db/schema/permission";
import { role } from "@/db/schema/role";
import { rolePermission } from "@/db/schema/role-permission";
import { userRole } from "@/db/schema/user-role";

export type ResolvedMembershipPermissions = {
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
};

export class PermissionResolutionService {
  async resolveForMembership(
    businessMembershipId: string
  ): Promise<ResolvedMembershipPermissions> {
    const db = getDb();

    const rows = await db
      .select({
        roleCode: role.code,
        permissionCode: permission.code,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .innerJoin(rolePermission, eq(rolePermission.roleId, role.id))
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(
        and(
          eq(userRole.businessMembershipId, businessMembershipId),
          isNull(userRole.effectiveTo),
          eq(permission.isActive, true)
        )
      );

    const roleCodes = [...new Set(rows.map((row) => row.roleCode))];
    const permissionCodes = [...new Set(rows.map((row) => row.permissionCode))];

    return { roleCodes, permissionCodes };
  }

  async resolveForContext(
    context: CurrentBusinessContext
  ): Promise<ResolvedMembershipPermissions> {
    return this.resolveForMembership(context.businessMembershipId);
  }
}

export function createPermissionResolutionService(): PermissionResolutionService {
  return new PermissionResolutionService();
}
