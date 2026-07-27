/**
 * Purpose:
 * Register and maintain Organization Party profiles.
 *
 * Architecture:
 * Server Actions → OrganizationProfileService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { getDb } from "@/db/client";
import {
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createOrganizationProfileRepository } from "@/modules/party/repositories/organization-profile-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  generatePartyNumber,
  resolveDefaultPartyStatus,
} from "@/modules/party/services/party-rules";
import type {
  PartyDetailView,
  RegisterOrganizationPayload,
} from "@/modules/party/types";
import { registerOrganizationSchema } from "@/modules/party/validators/party-validators";

export class OrganizationProfileService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly organizationProfileRepository = createOrganizationProfileRepository(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  /**
   * WHAT: Register an Organization Party with one master Party record + profile.
   * WHY: FR-002 / BR-IP001-001 / BR-IP001-007 — registration without roles/contacts.
   */
  async registerOrganization(
    context: CurrentBusinessContext,
    payload: RegisterOrganizationPayload
  ): Promise<PartyDetailView> {
    const parsed = registerOrganizationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const partyType = await this.referenceRepository.findPartyTypeByCode(
      PARTY_TYPE_CODES.ORGANIZATION
    );
    if (!partyType) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Party Type ORGANIZATION is missing. Seed Party catalogues before continuing.",
        503
      );
    }

    const defaultStatusCode = resolveDefaultPartyStatus(false);
    const status = await this.referenceRepository.findPartyStatusByCode(
      defaultStatusCode
    );
    if (!status) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        `Party Status ${defaultStatusCode} is missing. Seed Party catalogues before continuing.`,
        503
      );
    }

    const [industry, organizationType] = await Promise.all([
      this.referenceRepository.findIndustryByCode(parsed.data.industryCode),
      this.referenceRepository.findOrganizationTypeByCode(
        parsed.data.organizationTypeCode
      ),
    ]);

    if (!industry) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid industry.",
        400,
        "industryCode"
      );
    }
    if (!organizationType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid organization type.",
        400,
        "organizationTypeCode"
      );
    }

    const db = getDb();
    let partyNumber = generatePartyNumber();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await this.partyRepository.existsPartyNumber(
        context.businessId,
        partyNumber,
        db
      );
      if (!exists) {
        break;
      }
      partyNumber = generatePartyNumber();
    }

    const website = parsed.data.website?.trim() || null;

    const created = await db.transaction(async (tx) => {
      const partyRow = await this.partyRepository.insert(
        {
          businessId: context.businessId,
          partyNumber,
          partyTypeCode: PARTY_TYPE_CODES.ORGANIZATION,
          displayName: parsed.data.organizationName,
          statusCode: PARTY_STATUS_CODES.ACTIVE,
          notes: parsed.data.notes?.trim() || null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      await this.organizationProfileRepository.insert(
        {
          partyId: partyRow.id,
          organizationName: parsed.data.organizationName,
          registrationNumber: parsed.data.registrationNumber?.trim() || null,
          taxNumber: parsed.data.taxNumber?.trim() || null,
          industryCode: parsed.data.industryCode,
          organizationTypeCode: parsed.data.organizationTypeCode,
          website,
        },
        tx
      );

      return partyRow;
    });

    return this.toDetailView(created.id, context.businessId);
  }

  private async toDetailView(
    partyId: string,
    businessId: string
  ): Promise<PartyDetailView> {
    const partyRow = await this.partyRepository.findById(businessId, partyId);
    if (!partyRow) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }

    const profile = await this.organizationProfileRepository.findByPartyId(
      partyId
    );
    const [typeRow, statusRow, industry, organizationType] = await Promise.all([
      this.referenceRepository.findPartyTypeByCode(partyRow.partyTypeCode),
      this.referenceRepository.findPartyStatusByCode(partyRow.statusCode),
      profile
        ? this.referenceRepository.findIndustryByCode(profile.industryCode)
        : Promise.resolve(null),
      profile
        ? this.referenceRepository.findOrganizationTypeByCode(
            profile.organizationTypeCode
          )
        : Promise.resolve(null),
    ]);

    return {
      id: partyRow.id,
      partyNumber: partyRow.partyNumber,
      partyTypeCode: PARTY_TYPE_CODES.ORGANIZATION,
      partyTypeName: typeRow?.name ?? partyRow.partyTypeCode,
      displayName: partyRow.displayName,
      statusCode: partyRow.statusCode as PartyDetailView["statusCode"],
      statusName: statusRow?.name ?? partyRow.statusCode,
      registrationDate: partyRow.registrationDate.toISOString(),
      notes: partyRow.notes,
      version: partyRow.version,
      individual: null,
      organization: profile
        ? {
            organizationName: profile.organizationName,
            registrationNumber: profile.registrationNumber,
            taxNumber: profile.taxNumber,
            industryCode: profile.industryCode,
            industryName: industry?.name ?? null,
            organizationTypeCode: profile.organizationTypeCode,
            organizationTypeName: organizationType?.name ?? null,
            website: profile.website,
          }
        : null,
    };
  }
}

export function createOrganizationProfileService(): OrganizationProfileService {
  return new OrganizationProfileService();
}
