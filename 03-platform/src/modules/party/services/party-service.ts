/**
 * Purpose:
 * Party Foundation orchestration — list, get, update overview, lifecycle.
 *
 * Architecture:
 * Server Actions → PartyService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  GENDER_OPTIONS,
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
  type PartyStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createIndividualProfileRepository } from "@/modules/party/repositories/individual-profile-repository";
import { createOrganizationProfileRepository } from "@/modules/party/repositories/organization-profile-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  canTransitionPartyStatus,
  isPartyStatusCode,
  isPartyTypeCode,
} from "@/modules/party/services/party-rules";
import { createPartyRoleService } from "@/modules/party/services/party-role-service";
import type {
  PartyDashboardView,
  PartyDetailView,
  PartyRegistrationCatalogues,
  PartySearchResultView,
  PartySummaryView,
  UpdatePartyOverviewPayload,
} from "@/modules/party/types";
import { updatePartyOverviewSchema } from "@/modules/party/validators/party-validators";
import { partySearchQuerySchema } from "@/modules/party/validators/party-relationship-validators";

export class PartyService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly individualProfileRepository = createIndividualProfileRepository(),
    private readonly organizationProfileRepository = createOrganizationProfileRepository(),
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly partyRoleService = createPartyRoleService()
  ) {}

  async getRegistrationCatalogues(): Promise<PartyRegistrationCatalogues> {
    const [partyTypes, organizationTypes, industries, languages] =
      await Promise.all([
        this.referenceRepository.listActivePartyTypes(),
        this.referenceRepository.listActiveOrganizationTypes(),
        this.referenceRepository.listActiveIndustries(),
        this.referenceRepository.listActiveLanguages(),
      ]);

    if (partyTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Party Type catalogue is empty. Seed Party catalogues before continuing.",
        503
      );
    }

    return {
      partyTypes,
      organizationTypes,
      industries,
      languages,
      genders: GENDER_OPTIONS.map((option) => ({
        code: option.code,
        name: option.name,
      })),
    };
  }

  async listParties(
    context: CurrentBusinessContext
  ): Promise<PartySummaryView[]> {
    const rows = await this.partyRepository.listByBusinessId(
      context.businessId
    );
    return Promise.all(rows.map((row) => this.toSummaryView(row)));
  }

  /**
   * WHAT: Search existing parties for relationship linking.
   * WHY: IP-005 — relationships connect existing parties; no duplicate creation.
   */
  async searchParties(
    context: CurrentBusinessContext,
    query: string,
    excludePartyId?: string
  ): Promise<PartySearchResultView[]> {
    const parsed = partySearchQuerySchema.safeParse({ query });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const rows = await this.partyRepository.searchByQuery(
      context.businessId,
      parsed.data.query,
      excludePartyId
    );

    const partyTypes = await this.referenceRepository.listActivePartyTypes();
    const typeNameByCode = new Map(partyTypes.map((t) => [t.code, t.name]));

    return rows.map((row) => ({
      id: row.id,
      partyNumber: row.partyNumber,
      displayName: row.displayName,
      partyTypeCode: row.partyTypeCode as PartySearchResultView["partyTypeCode"],
      partyTypeName: typeNameByCode.get(row.partyTypeCode) ?? row.partyTypeCode,
    }));
  }

  async getParty(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyDetailView> {
    const partyRow = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      partyId
    );

    if (!partyRow) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }

    return this.toDetailView(partyRow);
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<PartyDashboardView> {
    const [
      totalParties,
      individuals,
      organizations,
      activeParties,
      recentRows,
      roleCounts,
    ] = await Promise.all([
      this.partyRepository.countByBusinessId(context.businessId),
      this.partyRepository.countByType(
        context.businessId,
        PARTY_TYPE_CODES.INDIVIDUAL
      ),
      this.partyRepository.countByType(
        context.businessId,
        PARTY_TYPE_CODES.ORGANIZATION
      ),
      this.partyRepository.countByStatus(
        context.businessId,
        PARTY_STATUS_CODES.ACTIVE
      ),
      this.partyRepository.listRecentByBusinessId(context.businessId, 8),
      this.partyRoleService.getRoleCountsForBusiness(context),
    ]);

    const recentlyRegistered = await Promise.all(
      recentRows.map((row) => this.toSummaryView(row))
    );

    return {
      totalParties,
      individuals,
      organizations,
      activeParties,
      recentlyRegistered,
      roleCounts,
    };
  }

  /**
   * WHAT: Update overview fields without changing Party Type.
   * WHY: FR-005 / BR-IP001-003 — Party Type is immutable after creation.
   */
  async updateOverview(
    context: CurrentBusinessContext,
    partyId: string,
    payload: UpdatePartyOverviewPayload
  ): Promise<PartyDetailView> {
    const parsed = updatePartyOverviewSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const partyRow = await this.partyRepository.findById(
      context.businessId,
      partyId
    );
    if (!partyRow) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }

    if (!isPartyTypeCode(partyRow.partyTypeCode)) {
      throw new PartyError(
        "INVALID_PARTY_TYPE",
        PARTY_USER_MESSAGES.INVALID_PARTY_TYPE,
        400
      );
    }

    await this.partyRepository.updateById(context.businessId, partyId, {
      displayName: parsed.data.displayName,
      notes: parsed.data.notes?.trim() || null,
      updatedBy: context.platformUserId,
    });

    if (partyRow.partyTypeCode === PARTY_TYPE_CODES.INDIVIDUAL) {
      if (parsed.data.preferredLanguageCode) {
        const language = await this.referenceRepository.findLanguageByCode(
          parsed.data.preferredLanguageCode
        );
        if (!language) {
          throw new PartyError(
            "INVALID_INPUT",
            "Select a preferred language.",
            400,
            "preferredLanguageCode"
          );
        }
      }

      await this.individualProfileRepository.updateByPartyId(partyId, {
        fullName: parsed.data.displayName,
        dateOfBirth: parsed.data.dateOfBirth?.trim() || null,
        gender: parsed.data.gender?.trim() || null,
        preferredLanguageCode:
          parsed.data.preferredLanguageCode?.trim() || null,
      });
    }

    if (partyRow.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION) {
      if (parsed.data.industryCode) {
        const industry = await this.referenceRepository.findIndustryByCode(
          parsed.data.industryCode
        );
        if (!industry) {
          throw new PartyError(
            "INVALID_INPUT",
            "Select a valid industry.",
            400,
            "industryCode"
          );
        }
      }
      if (parsed.data.organizationTypeCode) {
        const organizationType =
          await this.referenceRepository.findOrganizationTypeByCode(
            parsed.data.organizationTypeCode
          );
        if (!organizationType) {
          throw new PartyError(
            "INVALID_INPUT",
            "Select a valid organization type.",
            400,
            "organizationTypeCode"
          );
        }
      }

      await this.organizationProfileRepository.updateByPartyId(partyId, {
        organizationName: parsed.data.displayName,
        registrationNumber: parsed.data.registrationNumber?.trim() || null,
        taxNumber: parsed.data.taxNumber?.trim() || null,
        ...(parsed.data.industryCode
          ? { industryCode: parsed.data.industryCode }
          : {}),
        ...(parsed.data.organizationTypeCode
          ? { organizationTypeCode: parsed.data.organizationTypeCode }
          : {}),
        website: parsed.data.website?.trim() || null,
      });
    }

    return this.getParty(context, partyId);
  }

  async activateParty(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyDetailView> {
    return this.transitionStatus(
      context,
      partyId,
      PARTY_STATUS_CODES.ACTIVE,
      null
    );
  }

  async suspendParty(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyDetailView> {
    return this.transitionStatus(
      context,
      partyId,
      PARTY_STATUS_CODES.SUSPENDED,
      null
    );
  }

  async archiveParty(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyDetailView> {
    return this.transitionStatus(
      context,
      partyId,
      PARTY_STATUS_CODES.ARCHIVED,
      new Date()
    );
  }

  private async transitionStatus(
    context: CurrentBusinessContext,
    partyId: string,
    nextStatus: PartyStatusCode,
    deletedAt: Date | null
  ): Promise<PartyDetailView> {
    const partyRow = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      partyId
    );
    if (!partyRow) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }

    if (!isPartyStatusCode(partyRow.statusCode)) {
      throw new PartyError(
        "INVALID_STATUS_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_STATUS_TRANSITION,
        400
      );
    }

    if (!canTransitionPartyStatus(partyRow.statusCode, nextStatus)) {
      throw new PartyError(
        "INVALID_STATUS_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_STATUS_TRANSITION,
        400
      );
    }

    const status = await this.referenceRepository.findPartyStatusByCode(
      nextStatus
    );
    if (!status) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        `Party Status ${nextStatus} is missing. Seed Party catalogues before continuing.`,
        503
      );
    }

    await this.partyRepository.updateById(context.businessId, partyId, {
      statusCode: nextStatus,
      deletedAt,
      updatedBy: context.platformUserId,
    });

    return this.getParty(context, partyId);
  }

  private async toSummaryView(partyRow: {
    id: string;
    partyNumber: string;
    partyTypeCode: string;
    displayName: string;
    statusCode: string;
    registrationDate: Date;
  }): Promise<PartySummaryView> {
    const [typeRow, statusRow] = await Promise.all([
      this.referenceRepository.findPartyTypeByCode(partyRow.partyTypeCode),
      this.referenceRepository.findPartyStatusByCode(partyRow.statusCode),
    ]);

    const partyTypeCode: PartyTypeCode = isPartyTypeCode(partyRow.partyTypeCode)
      ? partyRow.partyTypeCode
      : PARTY_TYPE_CODES.INDIVIDUAL;
    const statusCode: PartyStatusCode = isPartyStatusCode(partyRow.statusCode)
      ? partyRow.statusCode
      : PARTY_STATUS_CODES.ACTIVE;

    return {
      id: partyRow.id,
      partyNumber: partyRow.partyNumber,
      partyTypeCode,
      partyTypeName: typeRow?.name ?? partyRow.partyTypeCode,
      displayName: partyRow.displayName,
      statusCode,
      statusName: statusRow?.name ?? partyRow.statusCode,
      registrationDate: partyRow.registrationDate.toISOString(),
    };
  }

  private async toDetailView(partyRow: {
    id: string;
    partyNumber: string;
    partyTypeCode: string;
    displayName: string;
    statusCode: string;
    notes: string | null;
    version: number;
    registrationDate: Date;
  }): Promise<PartyDetailView> {
    const summary = await this.toSummaryView(partyRow);

    if (partyRow.partyTypeCode === PARTY_TYPE_CODES.INDIVIDUAL) {
      const profile = await this.individualProfileRepository.findByPartyId(
        partyRow.id
      );
      return {
        ...summary,
        notes: partyRow.notes,
        version: partyRow.version,
        individual: profile
          ? {
              fullName: profile.fullName,
              dateOfBirth: profile.dateOfBirth,
              gender: profile.gender,
              preferredLanguageCode: profile.preferredLanguageCode,
            }
          : null,
        organization: null,
      };
    }

    const profile = await this.organizationProfileRepository.findByPartyId(
      partyRow.id
    );
    const [industry, organizationType] = await Promise.all([
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
      ...summary,
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

export function createPartyService(): PartyService {
  return new PartyService();
}
