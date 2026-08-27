import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisit } from "@/db/schema/crm-visit";
import {
  CRM_VISIT_LIST_VIEWS,
  CRM_VISIT_STATUS_CODES,
  type CrmVisitListView,
} from "@/modules/crm-visit/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmVisitInsertValues = {
  businessId: string;
  visitNumber: string;
  visitTypeCode: string;
  subject: string;
  statusCode: string;
  visitDate: Date;
  startTime?: Date | null;
  endTime?: Date | null;
  location?: string | null;
  objectives?: string | null;
  agenda?: string | null;
  priorityCode?: string;
  ownerUserId: string;
  primaryPartyId: string;
  linkedAppointmentId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export class CrmVisitRepository {
  async insert(values: CrmVisitInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmVisit)
      .values({
        ...values,
        startTime: values.startTime ?? null,
        endTime: values.endTime ?? null,
        location: values.location ?? null,
        objectives: values.objectives ?? null,
        agenda: values.agenda ?? null,
        priorityCode: values.priorityCode ?? "NORMAL",
        linkedAppointmentId: values.linkedAppointmentId ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row;
  }

  async updateById(
    businessId: string,
    visitId: string,
    values: Record<string, unknown>,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmVisit)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(crmVisit.businessId, businessId),
          eq(crmVisit.id, visitId),
          isNull(crmVisit.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async findById(businessId: string, visitId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmVisit)
      .where(
        and(
          eq(crmVisit.businessId, businessId),
          eq(crmVisit.id, visitId),
          isNull(crmVisit.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async getNextSequenceNumber(businessId: string, dbClient: DbClient = getDb()) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmVisit)
      .where(eq(crmVisit.businessId, businessId));
    return Number(result?.total ?? 0) + 1;
  }

  async listByFilters(
    businessId: string,
    filters: {
      view?: CrmVisitListView | string;
      currentUserId?: string;
      visitTypeCode?: string;
      statusCode?: string;
      ownerUserId?: string;
      primaryPartyId?: string;
      search?: string;
    } = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmVisit.businessId, businessId),
      isNull(crmVisit.deletedAt),
    ];

    if (filters.visitTypeCode) {
      conditions.push(eq(crmVisit.visitTypeCode, filters.visitTypeCode));
    }
    if (filters.statusCode) {
      conditions.push(eq(crmVisit.statusCode, filters.statusCode));
    } else if (filters.view === CRM_VISIT_LIST_VIEWS.PENDING_APPROVAL) {
      conditions.push(eq(crmVisit.statusCode, CRM_VISIT_STATUS_CODES.SUBMITTED));
    }
    if (filters.ownerUserId) {
      conditions.push(eq(crmVisit.ownerUserId, filters.ownerUserId));
    }
    if (filters.view === CRM_VISIT_LIST_VIEWS.MY && filters.currentUserId) {
      conditions.push(eq(crmVisit.ownerUserId, filters.currentUserId));
    }
    if (filters.primaryPartyId) {
      conditions.push(eq(crmVisit.primaryPartyId, filters.primaryPartyId));
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(ilike(crmVisit.subject, term), ilike(crmVisit.visitNumber, term))!
      );
    }

    return dbClient
      .select()
      .from(crmVisit)
      .where(and(...conditions))
      .orderBy(desc(crmVisit.visitDate));
  }

  async countByStatus(
    businessId: string,
    statusCodes: string[],
    dbClient: DbClient = getDb()
  ) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmVisit)
      .where(
        and(
          eq(crmVisit.businessId, businessId),
          isNull(crmVisit.deletedAt),
          inArray(crmVisit.statusCode, statusCodes)
        )
      );
    return Number(result?.total ?? 0);
  }

  async listRecent(businessId: string, limit: number, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmVisit)
      .where(and(eq(crmVisit.businessId, businessId), isNull(crmVisit.deletedAt)))
      .orderBy(desc(crmVisit.updatedAt))
      .limit(limit);
  }

  async listRecentForParty(
    businessId: string,
    partyId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmVisit)
      .where(
        and(
          eq(crmVisit.businessId, businessId),
          eq(crmVisit.primaryPartyId, partyId),
          isNull(crmVisit.deletedAt)
        )
      )
      .orderBy(desc(crmVisit.visitDate))
      .limit(limit);
  }

  async listUpcomingForParty(
    businessId: string,
    partyId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmVisit)
      .where(
        and(
          eq(crmVisit.businessId, businessId),
          eq(crmVisit.primaryPartyId, partyId),
          isNull(crmVisit.deletedAt),
          ne(crmVisit.statusCode, CRM_VISIT_STATUS_CODES.CANCELLED),
          gte(crmVisit.visitDate, new Date())
        )
      )
      .orderBy(asc(crmVisit.visitDate))
      .limit(limit);
  }
}

export function createCrmVisitRepository() {
  return new CrmVisitRepository();
}
