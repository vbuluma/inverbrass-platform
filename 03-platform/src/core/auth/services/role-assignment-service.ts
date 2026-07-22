import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { businessMembership } from "@/db/schema/business-membership";
import { role } from "@/db/schema/role";
import { userRole } from "@/db/schema/user-role";

type DbClient = PostgresJsDatabase<typeof schema>;

export class RoleAssignmentService {
  async assignPlatformRole(
    businessMembershipId: string,
    roleCode: string,
    assignedBy?: string,
    assignmentReason?: string,
    dbClient: DbClient = getDb()
  ): Promise<string> {
    const [membership] = await dbClient
      .select({
        membershipId: businessMembership.id,
        businessId: businessMembership.businessId,
      })
      .from(businessMembership)
      .where(eq(businessMembership.id, businessMembershipId))
      .limit(1);

    if (!membership) {
      throw new AuthError(
        AUTH_ERROR_CODES.NO_BUSINESS_ACCESS,
        AUTH_USER_MESSAGES.NO_BUSINESS_ACCESS,
        403
      );
    }

    const [platformRole] = await dbClient
      .select({
        id: role.id,
        businessId: role.businessId,
      })
      .from(role)
      .where(and(eq(role.code, roleCode), isNull(role.businessId)))
      .limit(1);

    if (!platformRole) {
      throw new AuthError(
        AUTH_ERROR_CODES.REGISTRATION_FAILED,
        AUTH_USER_MESSAGES.REGISTRATION_FAILED,
        500
      );
    }

    if (platformRole.businessId !== null) {
      throw new AuthError(
        AUTH_ERROR_CODES.REGISTRATION_FAILED,
        AUTH_USER_MESSAGES.REGISTRATION_FAILED,
        500
      );
    }

    const [createdRole] = await dbClient
      .insert(userRole)
      .values({
        businessMembershipId,
        roleId: platformRole.id,
        assignedBy: assignedBy ?? null,
        assignmentReason: assignmentReason ?? null,
      })
      .returning({ id: userRole.id });

    return createdRole.id;
  }
}

export function createRoleAssignmentService(): RoleAssignmentService {
  return new RoleAssignmentService();
}
