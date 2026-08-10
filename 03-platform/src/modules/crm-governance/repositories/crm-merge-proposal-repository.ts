import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmMergeProposal } from "@/db/schema/crm-merge-proposal";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmMergeProposalInsertValues = {
  businessId: string;
  survivorPartyId: string;
  duplicatePartyId: string;
  status: string;
  matchReason?: string | null;
  fieldResolutionJson?: Record<string, unknown> | null;
  proposedBy?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CrmMergeProposalUpdateValues = {
  status?: string;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  executedAt?: Date | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  fieldResolutionJson?: Record<string, unknown> | null;
};

export class CrmMergeProposalRepository {
  async insert(
    values: CrmMergeProposalInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmMergeProposal)
      .values({
        businessId: values.businessId,
        survivorPartyId: values.survivorPartyId,
        duplicatePartyId: values.duplicatePartyId,
        status: values.status,
        matchReason: values.matchReason ?? null,
        fieldResolutionJson: values.fieldResolutionJson ?? null,
        proposedBy: values.proposedBy ?? null,
        notes: values.notes ?? null,
        metadata: values.metadata ?? null,
      })
      .returning();
    return row;
  }

  async findById(businessId: string, id: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmMergeProposal)
      .where(
        and(
          eq(crmMergeProposal.businessId, businessId),
          eq(crmMergeProposal.id, id),
          isNull(crmMergeProposal.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async findPendingPair(
    businessId: string,
    partyA: string,
    partyB: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmMergeProposal)
      .where(
        and(
          eq(crmMergeProposal.businessId, businessId),
          eq(crmMergeProposal.status, "PENDING"),
          isNull(crmMergeProposal.deletedAt),
          or(
            and(
              eq(crmMergeProposal.survivorPartyId, partyA),
              eq(crmMergeProposal.duplicatePartyId, partyB)
            ),
            and(
              eq(crmMergeProposal.survivorPartyId, partyB),
              eq(crmMergeProposal.duplicatePartyId, partyA)
            )
          )
        )
      )
      .limit(1);
    return row ?? null;
  }

  async listByStatus(
    businessId: string,
    status: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmMergeProposal)
      .where(
        and(
          eq(crmMergeProposal.businessId, businessId),
          eq(crmMergeProposal.status, status),
          isNull(crmMergeProposal.deletedAt)
        )
      )
      .orderBy(desc(crmMergeProposal.createdAt));
  }

  async updateById(
    businessId: string,
    id: string,
    values: CrmMergeProposalUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmMergeProposal)
      .set({
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.reviewedBy !== undefined
          ? { reviewedBy: values.reviewedBy }
          : {}),
        ...(values.reviewedAt !== undefined
          ? { reviewedAt: values.reviewedAt }
          : {}),
        ...(values.executedAt !== undefined
          ? { executedAt: values.executedAt }
          : {}),
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        ...(values.fieldResolutionJson !== undefined
          ? { fieldResolutionJson: values.fieldResolutionJson }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmMergeProposal.businessId, businessId),
          eq(crmMergeProposal.id, id),
          isNull(crmMergeProposal.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }
}

export function createCrmMergeProposalRepository() {
  return new CrmMergeProposalRepository();
}
