import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCommunication } from "@/db/schema/crm-communication";
import {
  CRM_COMMUNICATION_DIRECTION_CODES,
  CRM_COMMUNICATION_LIST_VIEWS,
  CRM_COMMUNICATION_STATUS_CODES,
  type CrmCommunicationListView,
} from "@/modules/crm-communication/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmCommunicationInsertValues = {
  businessId: string;
  communicationNumber: string;
  channelTypeCode: string;
  directionCode: string;
  subject?: string | null;
  summary: string;
  communicatedAt: Date;
  durationSeconds?: number | null;
  statusCode?: string;
  consentCheckResult?: string | null;
  templateCode?: string | null;
  threadId?: string | null;
  primaryPartyId: string;
  contactChannelValue?: string | null;
  ownerUserId: string;
  isSensitive?: boolean;
  addendumToId?: string | null;
  linkedActivityId?: string | null;
  linkedVisitId?: string | null;
  recordSourceCode?: string;
  deliveryStatusCode?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export class CrmCommunicationRepository {
  async insert(values: CrmCommunicationInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmCommunication)
      .values({
        businessId: values.businessId,
        communicationNumber: values.communicationNumber,
        channelTypeCode: values.channelTypeCode,
        directionCode: values.directionCode,
        subject: values.subject ?? null,
        summary: values.summary,
        communicatedAt: values.communicatedAt,
        durationSeconds: values.durationSeconds ?? null,
        statusCode: values.statusCode ?? CRM_COMMUNICATION_STATUS_CODES.LOGGED,
        consentCheckResult: values.consentCheckResult ?? null,
        templateCode: values.templateCode ?? null,
        threadId: values.threadId ?? null,
        primaryPartyId: values.primaryPartyId,
        contactChannelValue: values.contactChannelValue ?? null,
        ownerUserId: values.ownerUserId,
        isSensitive: values.isSensitive ?? false,
        addendumToId: values.addendumToId ?? null,
        linkedActivityId: values.linkedActivityId ?? null,
        linkedVisitId: values.linkedVisitId ?? null,
        recordSourceCode: values.recordSourceCode ?? "MANUAL",
        deliveryStatusCode: values.deliveryStatusCode ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row;
  }

  async updateById(
    businessId: string,
    communicationId: string,
    values: Record<string, unknown>,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmCommunication)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(crmCommunication.businessId, businessId),
          eq(crmCommunication.id, communicationId),
          isNull(crmCommunication.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async findById(
    businessId: string,
    communicationId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmCommunication)
      .where(
        and(
          eq(crmCommunication.businessId, businessId),
          eq(crmCommunication.id, communicationId),
          isNull(crmCommunication.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async getNextSequenceNumber(businessId: string, dbClient: DbClient = getDb()) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmCommunication)
      .where(eq(crmCommunication.businessId, businessId));
    return Number(result?.total ?? 0) + 1;
  }

  async listByFilters(
    businessId: string,
    filters: {
      view?: CrmCommunicationListView | string;
      currentUserId?: string;
      channelTypeCode?: string;
      directionCode?: string;
      primaryPartyId?: string;
      threadId?: string;
      search?: string;
      from?: Date;
      to?: Date;
    } = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmCommunication.businessId, businessId),
      isNull(crmCommunication.deletedAt),
    ];

    if (filters.channelTypeCode) {
      conditions.push(eq(crmCommunication.channelTypeCode, filters.channelTypeCode));
    }
    if (filters.directionCode) {
      conditions.push(eq(crmCommunication.directionCode, filters.directionCode));
    } else if (filters.view === CRM_COMMUNICATION_LIST_VIEWS.OUTBOUND) {
      conditions.push(
        eq(crmCommunication.directionCode, CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND)
      );
    } else if (filters.view === CRM_COMMUNICATION_LIST_VIEWS.INBOUND) {
      conditions.push(
        eq(crmCommunication.directionCode, CRM_COMMUNICATION_DIRECTION_CODES.INBOUND)
      );
    }
    if (filters.view === CRM_COMMUNICATION_LIST_VIEWS.MY && filters.currentUserId) {
      conditions.push(eq(crmCommunication.ownerUserId, filters.currentUserId));
    }
    if (filters.primaryPartyId) {
      conditions.push(eq(crmCommunication.primaryPartyId, filters.primaryPartyId));
    }
    if (filters.threadId) {
      conditions.push(eq(crmCommunication.threadId, filters.threadId));
    }
    if (filters.from) {
      conditions.push(gte(crmCommunication.communicatedAt, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(crmCommunication.communicatedAt, filters.to));
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmCommunication.subject, term),
          ilike(crmCommunication.summary, term),
          ilike(crmCommunication.communicationNumber, term)
        )!
      );
    }

    return dbClient
      .select()
      .from(crmCommunication)
      .where(and(...conditions))
      .orderBy(desc(crmCommunication.communicatedAt));
  }

  async listByThread(
    businessId: string,
    threadId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmCommunication)
      .where(
        and(
          eq(crmCommunication.businessId, businessId),
          eq(crmCommunication.threadId, threadId),
          isNull(crmCommunication.deletedAt)
        )
      )
      .orderBy(asc(crmCommunication.communicatedAt));
  }

  async countSince(
    businessId: string,
    since: Date,
    extras: { directionCode?: string; statusCode?: string } = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmCommunication.businessId, businessId),
      isNull(crmCommunication.deletedAt),
      gte(crmCommunication.communicatedAt, since),
    ];
    if (extras.directionCode) {
      conditions.push(eq(crmCommunication.directionCode, extras.directionCode));
    }
    if (extras.statusCode) {
      conditions.push(eq(crmCommunication.statusCode, extras.statusCode));
    }
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmCommunication)
      .where(and(...conditions));
    return Number(result?.total ?? 0);
  }

  async listRecent(businessId: string, limit: number, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmCommunication)
      .where(
        and(
          eq(crmCommunication.businessId, businessId),
          isNull(crmCommunication.deletedAt)
        )
      )
      .orderBy(desc(crmCommunication.communicatedAt))
      .limit(limit);
  }

  async listRecentForParty(
    businessId: string,
    partyId: string,
    since: Date,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmCommunication)
      .where(
        and(
          eq(crmCommunication.businessId, businessId),
          eq(crmCommunication.primaryPartyId, partyId),
          gte(crmCommunication.communicatedAt, since),
          isNull(crmCommunication.deletedAt)
        )
      )
      .orderBy(desc(crmCommunication.communicatedAt))
      .limit(limit);
  }
}

export function createCrmCommunicationRepository() {
  return new CrmCommunicationRepository();
}
