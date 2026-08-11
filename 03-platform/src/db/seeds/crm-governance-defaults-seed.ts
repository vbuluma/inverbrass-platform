/**
 * Purpose:
 * Idempotent seed of CRM governance defaults.
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmApprovalMatrix } from "@/db/schema/crm-approval-matrix";
import { crmBusinessHours } from "@/db/schema/crm-business-hours";
import { crmGovernanceChecklistDefinition } from "@/db/schema/crm-governance-checklist-definition";
import { crmGovernanceStatus } from "@/db/schema/crm-governance-status";
import { crmSlaPolicy } from "@/db/schema/crm-sla-policy";
import {
  defaultCrmApprovalMatrix,
  defaultCrmBusinessHours,
  defaultCrmGovernanceChecklist,
  defaultCrmGovernanceStatuses,
  defaultCrmSlaPolicies,
} from "@/db/seeds/crm-governance-defaults";

type DbClient = PostgresJsDatabase<typeof schema>;

export async function seedCrmGovernanceReferenceData(
  db: DbClient = getDb()
): Promise<void> {
  for (const status of defaultCrmGovernanceStatuses) {
    const [existing] = await db
      .select({ id: crmGovernanceStatus.id })
      .from(crmGovernanceStatus)
      .where(eq(crmGovernanceStatus.code, status.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmGovernanceStatus).values({
        code: status.code,
        name: status.name,
        description: status.description,
        displayOrder: status.displayOrder,
        isActive: true,
      });
    }
  }
}

export async function seedDefaultCrmGovernanceChecklistForBusiness(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  for (const item of defaultCrmGovernanceChecklist) {
    const [existing] = await db
      .select({ id: crmGovernanceChecklistDefinition.id })
      .from(crmGovernanceChecklistDefinition)
      .where(
        and(
          eq(crmGovernanceChecklistDefinition.businessId, businessId),
          eq(crmGovernanceChecklistDefinition.code, item.code)
        )
      )
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(crmGovernanceChecklistDefinition).values({
      businessId,
      code: item.code,
      name: item.name,
      description: item.description,
      sourceModule: item.sourceModule,
      evaluatorKey: item.evaluatorKey,
      isMandatory: item.isMandatory,
      weight: item.weight,
      displayOrder: item.displayOrder,
      isActive: true,
    });
  }
}

export async function seedDefaultCrmSlaPoliciesForBusiness(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  for (const policy of defaultCrmSlaPolicies) {
    const priorityCondition =
      policy.priorityCode === null
        ? isNull(crmSlaPolicy.priorityCode)
        : eq(crmSlaPolicy.priorityCode, policy.priorityCode);

    const [existing] = await db
      .select({ id: crmSlaPolicy.id })
      .from(crmSlaPolicy)
      .where(
        and(
          eq(crmSlaPolicy.businessId, businessId),
          eq(crmSlaPolicy.entityTypeCode, policy.entityTypeCode),
          priorityCondition,
          isNull(crmSlaPolicy.deletedAt)
        )
      )
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(crmSlaPolicy).values({
      businessId,
      entityTypeCode: policy.entityTypeCode,
      priorityCode: policy.priorityCode,
      name: policy.name,
      firstResponseTargetHours: policy.firstResponseTargetHours,
      resolutionTargetHours: policy.resolutionTargetHours,
      pauseReasonCodes: policy.pauseReasonCodes,
      escalationEnabled: policy.escalationEnabled,
      isActive: true,
    });
  }
}

export async function seedDefaultCrmBusinessHoursForBusiness(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  for (const hours of defaultCrmBusinessHours) {
    const [existing] = await db
      .select({ id: crmBusinessHours.id })
      .from(crmBusinessHours)
      .where(
        and(
          eq(crmBusinessHours.businessId, businessId),
          eq(crmBusinessHours.dayOfWeek, hours.dayOfWeek)
        )
      )
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(crmBusinessHours).values({
      businessId,
      dayOfWeek: hours.dayOfWeek,
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      isClosed: hours.isClosed,
      timezone: hours.timezone,
    });
  }
}

export async function seedDefaultCrmApprovalMatrixForBusiness(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  for (const entry of defaultCrmApprovalMatrix) {
    const [existing] = await db
      .select({ id: crmApprovalMatrix.id })
      .from(crmApprovalMatrix)
      .where(
        and(
          eq(crmApprovalMatrix.businessId, businessId),
          eq(crmApprovalMatrix.actionCode, entry.actionCode)
        )
      )
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(crmApprovalMatrix).values({
      businessId,
      actionCode: entry.actionCode,
      minRoleCode: entry.minRoleCode,
      requiresDualApproval: entry.requiresDualApproval,
      isActive: true,
    });
  }
}

export async function ensureCrmGovernanceDefaults(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  await seedCrmGovernanceReferenceData(db);
  await seedDefaultCrmGovernanceChecklistForBusiness(businessId, db);
  await seedDefaultCrmSlaPoliciesForBusiness(businessId, db);
  await seedDefaultCrmBusinessHoursForBusiness(businessId, db);
  await seedDefaultCrmApprovalMatrixForBusiness(businessId, db);
}
