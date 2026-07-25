/**
 * Purpose:
 * Persist and read business employee links for setup review.
 *
 * Architecture:
 * BusinessSetupService → BusinessEmployeeRepository → Drizzle
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { branch } from "@/db/schema/branch";
import { businessEmployee } from "@/db/schema/business-employee";
import { platformUser } from "@/db/schema/platform-user";
import { role } from "@/db/schema/role";
import { userRole } from "@/db/schema/user-role";

type DbClient = PostgresJsDatabase<typeof schema>;

export type BusinessEmployeeInsertValues = {
  businessId: string;
  platformUserId: string;
  businessMembershipId: string;
  branchId: string;
  jobTitle: string;
  isActive: boolean;
};

export class BusinessEmployeeRepository {
  async listReviewRows(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        id: businessEmployee.id,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
        jobTitle: businessEmployee.jobTitle,
        branchName: branch.name,
        roleCode: role.code,
        roleName: role.name,
      })
      .from(businessEmployee)
      .innerJoin(
        platformUser,
        eq(businessEmployee.platformUserId, platformUser.id)
      )
      .innerJoin(branch, eq(businessEmployee.branchId, branch.id))
      .innerJoin(
        userRole,
        eq(userRole.businessMembershipId, businessEmployee.businessMembershipId)
      )
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(businessEmployee.businessId, businessId));
  }

  async insert(
    values: BusinessEmployeeInsertValues,
    dbClient: DbClient = getDb()
  ): Promise<string> {
    const [row] = await dbClient
      .insert(businessEmployee)
      .values(values)
      .returning({ id: businessEmployee.id });

    return row.id;
  }
}

export function createBusinessEmployeeRepository(): BusinessEmployeeRepository {
  return new BusinessEmployeeRepository();
}
