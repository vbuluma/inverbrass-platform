/**
 * Purpose:
 * Register and maintain Individual Party profiles.
 *
 * Architecture:
 * Server Actions → IndividualProfileService → Repositories → Drizzle
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
import { createIndividualProfileRepository } from "@/modules/party/repositories/individual-profile-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  generatePartyNumber,
  resolveDefaultPartyStatus,
} from "@/modules/party/services/party-rules";
import type {
  PartyDetailView,
  RegisterIndividualPayload,
} from "@/modules/party/types";
import { registerIndividualSchema } from "@/modules/party/validators/party-validators";

export class IndividualProfileService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly individualProfileRepository = createIndividualProfileRepository(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  /**
   * WHAT: Register an Individual Party with one master Party record + profile.
   * WHY: FR-001 / BR-IP001-001 / BR-IP001-007 — registration without roles/contacts.
   */
  async registerIndividual(
    context: CurrentBusinessContext,
    payload: RegisterIndividualPayload
  ): Promise<PartyDetailView> {
    const parsed = registerIndividualSchema.safeParse(payload);
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
      PARTY_TYPE_CODES.INDIVIDUAL
    );
    if (!partyType) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Party Type INDIVIDUAL is missing. Seed Party catalogues before continuing.",
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

    const created = await db.transaction(async (tx) => {
      const partyRow = await this.partyRepository.insert(
        {
          businessId: context.businessId,
          partyNumber,
          partyTypeCode: PARTY_TYPE_CODES.INDIVIDUAL,
          displayName: parsed.data.fullName,
          statusCode: PARTY_STATUS_CODES.ACTIVE,
          notes: parsed.data.notes?.trim() || null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      await this.individualProfileRepository.insert(
        {
          partyId: partyRow.id,
          fullName: parsed.data.fullName,
          dateOfBirth: parsed.data.dateOfBirth,
          gender: parsed.data.gender,
          preferredLanguageCode: parsed.data.preferredLanguageCode,
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

    const profile = await this.individualProfileRepository.findByPartyId(
      partyId
    );
    const [typeRow, statusRow] = await Promise.all([
      this.referenceRepository.findPartyTypeByCode(partyRow.partyTypeCode),
      this.referenceRepository.findPartyStatusByCode(partyRow.statusCode),
    ]);

    return {
      id: partyRow.id,
      partyNumber: partyRow.partyNumber,
      partyTypeCode: PARTY_TYPE_CODES.INDIVIDUAL,
      partyTypeName: typeRow?.name ?? partyRow.partyTypeCode,
      displayName: partyRow.displayName,
      statusCode: partyRow.statusCode as PartyDetailView["statusCode"],
      statusName: statusRow?.name ?? partyRow.statusCode,
      registrationDate: partyRow.registrationDate.toISOString(),
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
}

export function createIndividualProfileService(): IndividualProfileService {
  return new IndividualProfileService();
}
