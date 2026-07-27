/**
 * Purpose:
 * Register and maintain Organization Party profiles.
 *
 * Architecture:
 * Server Actions → OrganizationProfileService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 * BP-002 / IP-003 – Contacts & Communication
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { getDb } from "@/db/client";
import {
  CONTACT_TYPE_CODES,
  PARTY_CONTACT_STATUS_CODES,
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createOrganizationProfileRepository } from "@/modules/party/repositories/organization-profile-repository";
import { createPartyContactRepository } from "@/modules/party/repositories/party-contact-repository";
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
import { validateContactValueForType } from "@/modules/party/validators/party-contact-validators";
import { registerOrganizationSchema } from "@/modules/party/validators/party-validators";
import {
  normalizeRegistrationMobile,
  requireBusinessPhoneContext,
} from "@/modules/party/services/party-phone";

export class OrganizationProfileService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly organizationProfileRepository = createOrganizationProfileRepository(),
    private readonly partyContactRepository = createPartyContactRepository(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  /**
   * WHAT: Register an Organization Party with optional Mobile/Email contacts.
   * WHY: IP-003 — registration stays simple; additional contacts via Workspace.
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

    const mobile = parsed.data.mobile?.trim() || "";
    const email = parsed.data.email?.trim() || "";

    let mobileE164: string | null = null;
    if (mobile) {
      const mobileCheck = validateContactValueForType(
        CONTACT_TYPE_CODES.MOBILE,
        mobile
      );
      if (!mobileCheck.ok) {
        throw new PartyError(
          "INVALID_INPUT",
          mobileCheck.message,
          400,
          "mobile"
        );
      }
      const phoneContext = await requireBusinessPhoneContext(
        this.referenceRepository,
        context.businessId
      );
      mobileE164 = normalizeRegistrationMobile(mobile, phoneContext, "mobile");
    }
    if (email) {
      const emailCheck = validateContactValueForType(
        CONTACT_TYPE_CODES.EMAIL,
        email
      );
      if (!emailCheck.ok) {
        throw new PartyError(
          "INVALID_INPUT",
          emailCheck.message,
          400,
          "email"
        );
      }
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

    if (mobileE164 || email) {
      const needed = [
        ...(mobileE164 ? [CONTACT_TYPE_CODES.MOBILE] : []),
        ...(email ? [CONTACT_TYPE_CODES.EMAIL] : []),
      ];
      for (const code of needed) {
        const typeRow =
          await this.referenceRepository.findContactTypeByCode(code);
        if (!typeRow) {
          throw new PartyError(
            "REFERENCE_DATA_MISSING",
            `Contact Type ${code} is missing. Seed Party Contact catalogues before continuing.`,
            503
          );
        }
      }
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

      if (mobileE164) {
        await this.partyContactRepository.insert(
          {
            businessId: context.businessId,
            partyId: partyRow.id,
            contactTypeCode: CONTACT_TYPE_CODES.MOBILE,
            contactValue: mobileE164,
            isPreferred: true,
            isVerified: false,
            statusCode: PARTY_CONTACT_STATUS_CODES.ACTIVE,
            notes: null,
            createdBy: context.platformUserId,
            updatedBy: context.platformUserId,
          },
          tx
        );
      }

      if (email) {
        await this.partyContactRepository.insert(
          {
            businessId: context.businessId,
            partyId: partyRow.id,
            contactTypeCode: CONTACT_TYPE_CODES.EMAIL,
            contactValue: email,
            isPreferred: true,
            isVerified: false,
            statusCode: PARTY_CONTACT_STATUS_CODES.ACTIVE,
            notes: null,
            createdBy: context.platformUserId,
            updatedBy: context.platformUserId,
          },
          tx
        );
      }

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
