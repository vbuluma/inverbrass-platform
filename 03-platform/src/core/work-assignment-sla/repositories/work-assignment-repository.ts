/**
 * Purpose:
 * ENG-003n — Work Assignment & SLA persistence.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  workAssignment,
  workAssignmentHistory,
  workSlaPolicy,
  workSlaSegment,
} from "@/db/schema/work-assignment-sla";

type DbClient = PostgresJsDatabase<typeof schema>;

export class WorkAssignmentRepository {
  async findActivePolicyByEntityType(
    entityType: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(workSlaPolicy)
      .where(
        and(eq(workSlaPolicy.entityType, entityType), eq(workSlaPolicy.isActive, true))
      )
      .orderBy(workSlaPolicy.displayOrder)
      .limit(1);

    return row ?? null;
  }

  async findCurrentAssignment(
    businessId: string,
    subjectType: string,
    subjectId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(workAssignment)
      .where(
        and(
          eq(workAssignment.businessId, businessId),
          eq(workAssignment.subjectType, subjectType),
          eq(workAssignment.subjectId, subjectId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async upsertAssignment(
    values: {
      businessId: string;
      subjectType: string;
      subjectId: string;
      ownerType: string;
      ownerId: string;
      ownerPartyId?: string | null;
      assignedBy?: string | null;
      assignmentType: string;
      reasonCode?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const existing = await this.findCurrentAssignment(
      values.businessId,
      values.subjectType,
      values.subjectId,
      dbClient
    );

    if (existing) {
      const [row] = await dbClient
        .update(workAssignment)
        .set({
          ownerType: values.ownerType,
          ownerId: values.ownerId,
          ownerPartyId: values.ownerPartyId ?? null,
          assignedAt: new Date(),
          assignedBy: values.assignedBy ?? null,
          assignmentType: values.assignmentType,
          reasonCode: values.reasonCode ?? null,
          updatedAt: new Date(),
        })
        .where(eq(workAssignment.id, existing.id))
        .returning();

      return { row: row!, previous: existing };
    }

    const [row] = await dbClient
      .insert(workAssignment)
      .values({
        businessId: values.businessId,
        subjectType: values.subjectType,
        subjectId: values.subjectId,
        ownerType: values.ownerType,
        ownerId: values.ownerId,
        ownerPartyId: values.ownerPartyId ?? null,
        assignedBy: values.assignedBy ?? null,
        assignmentType: values.assignmentType,
        reasonCode: values.reasonCode ?? null,
      })
      .returning();

    return { row: row!, previous: null };
  }

  async insertAssignmentHistory(
    values: {
      businessId: string;
      subjectType: string;
      subjectId: string;
      previousOwnerType?: string | null;
      previousOwnerId?: string | null;
      previousOwnerPartyId?: string | null;
      newOwnerType: string;
      newOwnerId: string;
      newOwnerPartyId?: string | null;
      assignedBy?: string | null;
      assignmentType: string;
      reasonCode?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient.insert(workAssignmentHistory).values(values).returning();
    return row!;
  }

  async findOpenSegment(
    businessId: string,
    subjectType: string,
    subjectId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(workSlaSegment)
      .where(
        and(
          eq(workSlaSegment.businessId, businessId),
          eq(workSlaSegment.subjectType, subjectType),
          eq(workSlaSegment.subjectId, subjectId),
          isNull(workSlaSegment.endedAt)
        )
      )
      .orderBy(desc(workSlaSegment.startedAt))
      .limit(1);

    return row ?? null;
  }

  async closeSegment(
    segmentId: string,
    endedAt: Date,
    activeSeconds: number,
    isBreached: boolean,
    breachedSeconds: number,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .update(workSlaSegment)
      .set({
        endedAt,
        activeSeconds,
        isBreached,
        breachedSeconds,
      })
      .where(eq(workSlaSegment.id, segmentId));
  }

  async insertSegment(
    values: {
      businessId: string;
      subjectType: string;
      subjectId: string;
      assigneeType: string;
      assigneeId: string;
      assigneePartyId?: string | null;
      slaPolicyId?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient.insert(workSlaSegment).values(values).returning();
    return row!;
  }

  async listSegments(
    businessId: string,
    subjectType: string,
    subjectId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(workSlaSegment)
      .where(
        and(
          eq(workSlaSegment.businessId, businessId),
          eq(workSlaSegment.subjectType, subjectType),
          eq(workSlaSegment.subjectId, subjectId)
        )
      )
      .orderBy(workSlaSegment.startedAt);
  }

  async listAssignmentHistory(
    businessId: string,
    subjectType: string,
    subjectId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(workAssignmentHistory)
      .where(
        and(
          eq(workAssignmentHistory.businessId, businessId),
          eq(workAssignmentHistory.subjectType, subjectType),
          eq(workAssignmentHistory.subjectId, subjectId)
        )
      )
      .orderBy(desc(workAssignmentHistory.assignedAt));
  }
}

export function createWorkAssignmentRepository() {
  return new WorkAssignmentRepository();
}
