/**
 * Purpose:
 * Party orchestration for Identity & Regulatory Information — first consumer of ENG-003j.
 *
 * Architecture:
 * Server Actions → PartyIdentityRegulatoryService → IdentityRegulatoryService (ENG-003j)
 *                                               ↘ RegulatoryIdentifierRequirementsService (ENG-003b)
 *                                               ↘ PartyTimelineService / AuditService
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

import { inArray } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  createIdentityRegulatoryService,
  createPartyIdentityIdentifierRepository,
  IdentityRegulatoryError,
  IDENTIFIER_VIEW_FULL_PERMISSION,
  type CaptureIdentifierPayload,
  type UpdateIdentifierPayload,
  type VerifyIdentifierPayload,
} from "@/core/identity-regulatory";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
} from "@/core/party-timeline";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import {
  PARTY_TYPE_CODES,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createOrganizationProfileRepository } from "@/modules/party/repositories/organization-profile-repository";
import { createPartyAddressRepository } from "@/modules/party/repositories/party-address-repository";
import { createPartyDocumentRepository } from "@/modules/party/repositories/party-document-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { recordPartyEntityAudit } from "@/modules/party/services/party-audit-helper";
import type { PartyIdentityRegulatoryPanelView } from "@/modules/party/types";
import {
  capturePartyIdentifierSchema,
  linkPartyIdentifierDocumentSchema,
  removePartyIdentifierSchema,
  updatePartyIdentifierSchema,
  verifyPartyIdentifierSchema,
} from "@/modules/party/validators/party-identity-regulatory-validators";

export class PartyIdentityRegulatoryService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyAddressRepository = createPartyAddressRepository(),
    private readonly organizationProfileRepository = createOrganizationProfileRepository(),
    private readonly partyDocumentRepository = createPartyDocumentRepository(),
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly identifierRepository = createPartyIdentityIdentifierRepository(),
    private readonly identityRegulatoryService = createIdentityRegulatoryService(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getIdentityRegulatoryPanel(
    context: CurrentBusinessContext,
    partyId: string,
    canViewFullValues = false
  ): Promise<PartyIdentityRegulatoryPanelView> {
    const party = await this.requireParty(context, partyId);
    const regulatoryContext = await this.resolvePartyRegulatoryContext(context, party);
    const country =
      (await this.referenceRepository.findCountryByCode(regulatoryContext.countryCode)) ?? {
        code: regulatoryContext.countryCode,
        name: regulatoryContext.countryCode,
      };

    const [documents, identifierTypes] = await Promise.all([
      this.partyDocumentRepository.listByPartyId(context.businessId, partyId),
      this.referenceRepository.listActiveIdentifierTypes(),
    ]);

    const documentNameById = new Map(
      documents.map((doc) => [doc.id, doc.originalFileName])
    );

    const profile = await this.identityRegulatoryService.buildRegulatoryProfile(
      context.businessId,
      partyId,
      regulatoryContext,
      {
        countryName: country.name,
        canViewFullValues,
        documentNameById,
        verifierNameById: await this.loadVerifierNames(
          context.businessId,
          partyId
        ),
      }
    );

    return {
      ...profile,
      availableIdentifierTypes: identifierTypes,
      availableDocuments: documents.map((doc) => ({
        id: doc.id,
        name: doc.originalFileName,
        documentTypeCode: doc.documentTypeCode,
      })),
      canViewFullValues,
      viewFullPermissionCode: IDENTIFIER_VIEW_FULL_PERMISSION,
    };
  }

  async captureIdentifier(
    context: CurrentBusinessContext,
    partyId: string,
    payload: CaptureIdentifierPayload
  ): Promise<PartyIdentityRegulatoryPanelView> {
    const parsed = capturePartyIdentifierSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);

    try {
      const validationPattern =
        await this.identityRegulatoryService.findValidationPattern(
          parsed.data.identifierTypeCode
        );

      const created = await this.identityRegulatoryService.captureIdentifier(
        context.businessId,
        partyId,
        parsed.data,
        context.platformUserId,
        validationPattern
      );

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.IDENTIFIER_CAPTURED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMPLIANCE,
          summary: "Identifier captured",
          description: `${parsed.data.identifierTypeCode} identifier recorded.`,
          referenceEntity: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
          referenceId: created.id,
          metadata: { identifierId: created.id, identifierTypeCode: created.identifierTypeCode },
        })
      );

      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
        entityId: created.id,
        operation: AUDIT_OPERATIONS.CREATE,
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_IDENTITY_REGULATORY,
        createValues: {
          identifierTypeCode: created.identifierTypeCode,
          identifierValue: created.identifierValue,
          statusCode: created.statusCode,
        },
      });

      return this.getIdentityRegulatoryPanel(context, partyId);
    } catch (error) {
      throw this.mapEngineError(error);
    }
  }

  async updateIdentifier(
    context: CurrentBusinessContext,
    partyId: string,
    identifierId: string,
    payload: UpdateIdentifierPayload
  ): Promise<PartyIdentityRegulatoryPanelView> {
    const parsed = updatePartyIdentifierSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);

    try {
      const existing = await this.identifierRepository.findById(
        context.businessId,
        identifierId
      );

      if (!existing || existing.partyId !== partyId) {
        throw new PartyError(
          "PARTY_IDENTITY_IDENTIFIER_NOT_FOUND",
          "Identifier not found.",
          404
        );
      }

      const validationPattern =
        await this.identityRegulatoryService.findValidationPattern(
          existing.identifierTypeCode
        );

      const updated = await this.identityRegulatoryService.updateIdentifier(
        context.businessId,
        identifierId,
        parsed.data,
        context.platformUserId,
        validationPattern
      );

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.IDENTIFIER_UPDATED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMPLIANCE,
          summary: "Identifier updated",
          description: `${updated.identifierTypeCode} identifier updated.`,
          referenceEntity: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
          referenceId: updated.id,
          metadata: { identifierId: updated.id },
        })
      );

      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
        entityId: updated.id,
        operation: AUDIT_OPERATIONS.UPDATE,
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_IDENTITY_REGULATORY,
        before: {
          identifierValue: existing.identifierValue,
          expiryDate: existing.expiryDate,
          verificationStatus: existing.verificationStatus,
        },
        after: {
          identifierValue: updated.identifierValue,
          expiryDate: updated.expiryDate,
          verificationStatus: updated.verificationStatus,
        },
        trackFields: ["identifierValue", "expiryDate", "verificationStatus"],
      });

      return this.getIdentityRegulatoryPanel(context, partyId);
    } catch (error) {
      throw this.mapEngineError(error);
    }
  }

  async verifyIdentifier(
    context: CurrentBusinessContext,
    partyId: string,
    identifierId: string,
    payload: VerifyIdentifierPayload
  ): Promise<PartyIdentityRegulatoryPanelView> {
    const parsed = verifyPartyIdentifierSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);

    try {
      const updated = await this.identityRegulatoryService.verifyIdentifier(
        context.businessId,
        identifierId,
        parsed.data,
        context.platformUserId
      );

      if (updated.partyId !== partyId) {
        throw new PartyError(
          "PARTY_IDENTITY_IDENTIFIER_NOT_FOUND",
          "Identifier not found.",
          404
        );
      }

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.IDENTIFIER_VERIFIED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMPLIANCE,
          summary: "Identifier verified",
          description: `${updated.identifierTypeCode} identifier verified.`,
          referenceEntity: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
          referenceId: updated.id,
          metadata: { identifierId: updated.id },
        })
      );

      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
        entityId: updated.id,
        operation: AUDIT_OPERATIONS.VERIFY,
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_IDENTITY_REGULATORY,
        changes: [
          {
            fieldName: "verificationStatus",
            oldValue: "PENDING",
            newValue: "VERIFIED",
          },
        ],
      });

      return this.getIdentityRegulatoryPanel(context, partyId);
    } catch (error) {
      throw this.mapEngineError(error);
    }
  }

  async linkDocument(
    context: CurrentBusinessContext,
    partyId: string,
    identifierId: string,
    payload: { documentId: string; version: number }
  ): Promise<PartyIdentityRegulatoryPanelView> {
    const parsed = linkPartyIdentifierDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);

    const document = await this.partyDocumentRepository.findById(
      context.businessId,
      parsed.data.documentId
    );

    if (!document || document.partyId !== partyId) {
      throw new PartyError(
        "PARTY_DOCUMENT_NOT_FOUND",
        "Document not found for this party.",
        404
      );
    }

    try {
      const updated = await this.identityRegulatoryService.linkDocument(
        context.businessId,
        identifierId,
        parsed.data.documentId,
        parsed.data.version,
        context.platformUserId
      );

      if (updated.partyId !== partyId) {
        throw new PartyError(
          "PARTY_IDENTITY_IDENTIFIER_NOT_FOUND",
          "Identifier not found.",
          404
        );
      }

      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
        entityId: updated.id,
        operation: AUDIT_OPERATIONS.UPDATE,
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_IDENTITY_REGULATORY,
        changes: [
          {
            fieldName: "linkedDocumentId",
            oldValue: null,
            newValue: parsed.data.documentId,
          },
        ],
      });

      return this.getIdentityRegulatoryPanel(context, partyId);
    } catch (error) {
      throw this.mapEngineError(error);
    }
  }

  async removeIdentifier(
    context: CurrentBusinessContext,
    partyId: string,
    identifierId: string,
    payload: { version: number }
  ): Promise<PartyIdentityRegulatoryPanelView> {
    const parsed = removePartyIdentifierSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);

    try {
      const updated = await this.identityRegulatoryService.removeIdentifier(
        context.businessId,
        identifierId,
        parsed.data.version,
        context.platformUserId
      );

      if (updated.partyId !== partyId) {
        throw new PartyError(
          "PARTY_IDENTITY_IDENTIFIER_NOT_FOUND",
          "Identifier not found.",
          404
        );
      }

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.IDENTIFIER_REMOVED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMPLIANCE,
          summary: "Identifier removed",
          description: `${updated.identifierTypeCode} identifier removed.`,
          referenceEntity: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
          referenceId: updated.id,
          metadata: { identifierId: updated.id },
        })
      );

      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_IDENTITY_IDENTIFIER,
        entityId: updated.id,
        operation: AUDIT_OPERATIONS.DELETE,
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_IDENTITY_REGULATORY,
      });

      return this.getIdentityRegulatoryPanel(context, partyId);
    } catch (error) {
      throw this.mapEngineError(error);
    }
  }

  private async requireParty(context: CurrentBusinessContext, partyId: string) {
    const party = await this.partyRepository.findById(context.businessId, partyId);
    if (!party) {
      throw new PartyError("PARTY_NOT_FOUND", PARTY_USER_MESSAGES.PARTY_NOT_FOUND, 404);
    }
    return party;
  }

  private async resolvePartyRegulatoryContext(
    context: CurrentBusinessContext,
    party: { partyTypeCode: string; id: string }
  ) {
    const [addressCountry, businessContext, organizationProfile] =
      await Promise.all([
        this.partyAddressRepository.findPrimaryCountryCode(
          context.businessId,
          party.id
        ),
        this.referenceRepository.findBusinessPhoneContext(context.businessId),
        party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION
          ? this.organizationProfileRepository.findByPartyId(party.id)
          : Promise.resolve(null),
      ]);

    const countryCode = addressCountry ?? businessContext?.countryCode ?? "KE";

    return {
      countryCode,
      partyTypeCode: party.partyTypeCode,
      industryCode: organizationProfile?.industryCode ?? null,
    };
  }

  private async loadVerifierNames(
    businessId: string,
    partyId: string
  ): Promise<Map<string, string>> {
    const identifiers = await this.identifierRepository.listByPartyId(
      businessId,
      partyId
    );

    const verifierIds = [
      ...new Set(
        identifiers
          .map((row) => row.verifiedBy)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (verifierIds.length === 0) {
      return new Map();
    }

    const users = await getDb()
      .select({
        id: platformUser.id,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
      })
      .from(platformUser)
      .where(inArray(platformUser.id, verifierIds));

    return new Map(
      users.map((user) => [
        user.id,
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.id,
      ])
    );
  }

  private mapEngineError(error: unknown): PartyError {
    if (error instanceof IdentityRegulatoryError) {
      const codeMap: Record<string, PartyError["code"]> = {
        IDENTIFIER_NOT_FOUND: "PARTY_IDENTITY_IDENTIFIER_NOT_FOUND",
        DUPLICATE_IDENTIFIER: "DUPLICATE_IDENTIFIER",
        INVALID_IDENTIFIER_VALUE: "INVALID_IDENTIFIER_VALUE",
        VERSION_CONFLICT: "VERSION_CONFLICT",
      };
      return new PartyError(
        codeMap[error.code] ?? "INVALID_INPUT",
        error.message,
        400,
        error.field
      );
    }
    if (error instanceof PartyError) {
      return error;
    }
    throw error;
  }
}

export function createPartyIdentityRegulatoryService(): PartyIdentityRegulatoryService {
  return new PartyIdentityRegulatoryService();
}
