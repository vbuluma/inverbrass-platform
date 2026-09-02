/**
 * Purpose:
 * Persist procurement profiles with tenant isolation. Soft-delete only.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import { procurementProfile, procurementProfileCapability, procurementProfileCategory } from "@/db/schema/procurement-profile";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ProcurementProfileRepositoryPort } from "@/modules/procurement/ports";
import type {
  ProcurementProfileInsert,
  ProcurementProfilePatch,
  ProcurementProfileRecord,
} from "@/modules/procurement/types";

function mapRow(row: typeof procurementProfile.$inferSelect): ProcurementProfileRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    partyId: row.partyId,
    profileNumber: row.profileNumber,
    statusCode: row.statusCode,
    qualificationStatusCode: row.qualificationStatusCode,
    isPreferred: row.isPreferred,
    isApproved: row.isApproved,
    defaultDeliveryTerms: row.defaultDeliveryTerms,
    defaultPaymentTerms: row.defaultPaymentTerms,
    expectedLeadTimeDays: row.expectedLeadTimeDays,
    statusReason: row.statusReason,
    statusEffectiveDate: row.statusEffectiveDate,
    statusReviewDate: row.statusReviewDate,
    statusAuthority: row.statusAuthority,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    version: row.version,
  };
}

export class ProcurementProfileRepository implements ProcurementProfileRepositoryPort {
  constructor(private readonly db = getDb()) {}

  async insert(values: ProcurementProfileInsert) {
    try {
      const [row] = await this.db
        .insert(procurementProfile)
        .values({
          id: values.id,
          businessId: values.businessId,
          partyId: values.partyId,
          profileNumber: values.profileNumber,
          statusCode: values.statusCode,
          qualificationStatusCode: values.qualificationStatusCode,
          isPreferred: values.isPreferred,
          isApproved: values.isApproved,
          defaultDeliveryTerms: values.defaultDeliveryTerms,
          defaultPaymentTerms: values.defaultPaymentTerms,
          expectedLeadTimeDays: values.expectedLeadTimeDays,
          statusReason: values.statusReason,
          statusEffectiveDate: values.statusEffectiveDate,
          statusReviewDate: values.statusReviewDate,
          statusAuthority: values.statusAuthority,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
          version: values.version,
        })
        .returning();
      if (!row) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("procurement_profile_business_party_uidx")) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.DUPLICATE_PROFILE, undefined, 409);
      }
      throw error;
    }
  }

  async update(businessId: string, profileId: string, patch: ProcurementProfilePatch) {
    const [row] = await this.db
      .update(procurementProfile)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementProfile.businessId, businessId),
          eq(procurementProfile.id, profileId),
          isNull(procurementProfile.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    return mapRow(row);
  }

  async findById(businessId: string, profileId: string) {
    const [row] = await this.db
      .select()
      .from(procurementProfile)
      .where(
        and(
          eq(procurementProfile.businessId, businessId),
          eq(procurementProfile.id, profileId),
          isNull(procurementProfile.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByPartyId(businessId: string, partyId: string) {
    const [row] = await this.db
      .select()
      .from(procurementProfile)
      .where(
        and(
          eq(procurementProfile.businessId, businessId),
          eq(procurementProfile.partyId, partyId),
          isNull(procurementProfile.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(procurementProfile)
      .where(
        and(
          eq(procurementProfile.businessId, businessId),
          isNull(procurementProfile.deletedAt)
        )
      )
      .orderBy(desc(procurementProfile.updatedAt));
    return rows.map(mapRow);
  }

  async replaceCategories(
    businessId: string,
    profileId: string,
    codes: string[],
    actorUserId: string | null
  ) {
    await this.db
      .delete(procurementProfileCategory)
      .where(
        and(
          eq(procurementProfileCategory.businessId, businessId),
          eq(procurementProfileCategory.profileId, profileId)
        )
      );
    if (codes.length > 0) {
      await this.db.insert(procurementProfileCategory).values(
        codes.map((categoryCode) => ({
          id: randomUUID(),
          businessId,
          profileId,
          categoryCode,
          createdBy: actorUserId,
        }))
      );
    }
    return codes;
  }

  async replaceCapabilities(
    businessId: string,
    profileId: string,
    codes: string[],
    actorUserId: string | null
  ) {
    await this.db
      .delete(procurementProfileCapability)
      .where(
        and(
          eq(procurementProfileCapability.businessId, businessId),
          eq(procurementProfileCapability.profileId, profileId)
        )
      );
    if (codes.length > 0) {
      await this.db.insert(procurementProfileCapability).values(
        codes.map((capabilityCode) => ({
          id: randomUUID(),
          businessId,
          profileId,
          capabilityCode,
          createdBy: actorUserId,
        }))
      );
    }
    return codes;
  }

  async listCategoryCodes(profileId: string) {
    const rows = await this.db
      .select({ code: procurementProfileCategory.categoryCode })
      .from(procurementProfileCategory)
      .where(eq(procurementProfileCategory.profileId, profileId));
    return rows.map((row) => row.code);
  }

  async listCapabilityCodes(profileId: string) {
    const rows = await this.db
      .select({ code: procurementProfileCapability.capabilityCode })
      .from(procurementProfileCapability)
      .where(eq(procurementProfileCapability.profileId, profileId));
    return rows.map((row) => row.code);
  }
}

export function createProcurementProfileRepository() {
  return new ProcurementProfileRepository();
}
