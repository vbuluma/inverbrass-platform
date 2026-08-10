/**
 * Purpose:
 * Persist and read CRM Activity rows.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
 */

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmActivity } from "@/db/schema/crm-activity";
import { crmActivityEntityLink } from "@/db/schema/crm-activity-entity-link";
import {
  CRM_ACTIVITY_LIST_VIEWS,
  CRM_ACTIVITY_OPEN_STATUS_CODES,
  CRM_ACTIVITY_STATUS_CODES,
  type CrmActivityListView,
} from "@/modules/crm-activity/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmActivityInsertValues = {
  businessId: string;
  activityNumber: string;
  activityTypeCode: string;
  subject: string;
  description?: string | null;
  statusCode: string;
  priorityCode: string;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  ownerUserId: string;
  primaryPartyId: string;
  recordSourceCode?: string;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CrmActivityUpdateValues = {
  subject?: string;
  description?: string | null;
  statusCode?: string;
  priorityCode?: string;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  ownerUserId?: string;
  outcomeCode?: string | null;
  outcomeNotes?: string | null;
  cancelReason?: string | null;
  deferReason?: string | null;
  deferredUntil?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  overdueEventEmittedAt?: Date | null;
  updatedBy?: string | null;
  version?: number;
};

export type CrmActivityListQueryFilters = {
  view?: CrmActivityListView | string;
  currentUserId?: string;
  activityTypeCode?: string;
  statusCode?: string;
  ownerUserId?: string;
  primaryPartyId?: string;
  entityTypeCode?: string;
  entityId?: string;
  dueFrom?: Date;
  dueTo?: Date;
  search?: string;
  overdueOnly?: boolean;
};

export class CrmActivityRepository {
  async insert(values: CrmActivityInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmActivity)
      .values({
        businessId: values.businessId,
        activityNumber: values.activityNumber,
        activityTypeCode: values.activityTypeCode,
        subject: values.subject,
        description: values.description ?? null,
        statusCode: values.statusCode,
        priorityCode: values.priorityCode,
        dueDate: values.dueDate ?? null,
        scheduledStart: values.scheduledStart ?? null,
        scheduledEnd: values.scheduledEnd ?? null,
        ownerUserId: values.ownerUserId,
        primaryPartyId: values.primaryPartyId,
        recordSourceCode: values.recordSourceCode ?? "MANUAL",
        sourceReferenceType: values.sourceReferenceType ?? null,
        sourceReferenceId: values.sourceReferenceId ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async updateById(
    businessId: string,
    activityId: string,
    values: CrmActivityUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmActivity)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmActivity.businessId, businessId),
          eq(crmActivity.id, activityId),
          isNull(crmActivity.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async findById(
    businessId: string,
    activityId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmActivity)
      .where(
        and(
          eq(crmActivity.businessId, businessId),
          eq(crmActivity.id, activityId),
          isNull(crmActivity.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async getNextSequenceNumber(
    businessId: string,
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmActivity)
      .where(eq(crmActivity.businessId, businessId));

    return Number(result?.total ?? 0) + 1;
  }

  async listByFilters(
    businessId: string,
    filters: CrmActivityListQueryFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmActivity.businessId, businessId),
      isNull(crmActivity.deletedAt),
    ];

    if (filters.activityTypeCode) {
      conditions.push(eq(crmActivity.activityTypeCode, filters.activityTypeCode));
    }

    if (filters.statusCode) {
      conditions.push(eq(crmActivity.statusCode, filters.statusCode));
    } else if (filters.overdueOnly) {
      conditions.push(inArray(crmActivity.statusCode, [...CRM_ACTIVITY_OPEN_STATUS_CODES]));
    }

    if (filters.ownerUserId) {
      conditions.push(eq(crmActivity.ownerUserId, filters.ownerUserId));
    }

    if (filters.view === CRM_ACTIVITY_LIST_VIEWS.MY && filters.currentUserId) {
      conditions.push(eq(crmActivity.ownerUserId, filters.currentUserId));
    }

    if (filters.primaryPartyId) {
      conditions.push(eq(crmActivity.primaryPartyId, filters.primaryPartyId));
    }

    if (filters.dueFrom) {
      conditions.push(gte(crmActivity.dueDate, filters.dueFrom));
    }

    if (filters.dueTo) {
      conditions.push(lte(crmActivity.dueDate, filters.dueTo));
    }

    if (filters.search) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmActivity.subject, pattern),
          ilike(crmActivity.activityNumber, pattern),
          ilike(crmActivity.description, pattern)
        )!
      );
    }

    if (filters.entityTypeCode && filters.entityId) {
      const linkedRows = await dbClient
        .select({ activityId: crmActivityEntityLink.activityId })
        .from(crmActivityEntityLink)
        .where(
          and(
            eq(crmActivityEntityLink.businessId, businessId),
            eq(crmActivityEntityLink.entityTypeCode, filters.entityTypeCode),
            eq(crmActivityEntityLink.entityId, filters.entityId)
          )
        );

      const linkedIds = linkedRows.map((row) => row.activityId);
      if (linkedIds.length === 0) {
        return [];
      }

      conditions.push(inArray(crmActivity.id, linkedIds));
    }

    return dbClient
      .select()
      .from(crmActivity)
      .where(and(...conditions))
      .orderBy(asc(crmActivity.dueDate), desc(crmActivity.updatedAt));
  }

  async countOpenByOwner(
    businessId: string,
    ownerUserId: string,
    dbClient: DbClient = getDb()
  ) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmActivity)
      .where(
        and(
          eq(crmActivity.businessId, businessId),
          eq(crmActivity.ownerUserId, ownerUserId),
          isNull(crmActivity.deletedAt),
          inArray(crmActivity.statusCode, [...CRM_ACTIVITY_OPEN_STATUS_CODES])
        )
      );

    return Number(result?.total ?? 0);
  }

  async countOverdue(
    businessId: string,
    ownerUserId?: string,
    dbClient: DbClient = getDb()
  ) {
    const now = new Date();
    const conditions = [
      eq(crmActivity.businessId, businessId),
      isNull(crmActivity.deletedAt),
      lte(crmActivity.dueDate, now),
      inArray(crmActivity.statusCode, [...CRM_ACTIVITY_OPEN_STATUS_CODES]),
    ];

    if (ownerUserId) {
      conditions.push(eq(crmActivity.ownerUserId, ownerUserId));
    }

    const [result] = await dbClient
      .select({ total: count() })
      .from(crmActivity)
      .where(and(...conditions));

    return Number(result?.total ?? 0);
  }
}

export function createCrmActivityRepository() {
  return new CrmActivityRepository();
}
