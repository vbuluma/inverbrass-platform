/**
 * Purpose:
 * Reusable orchestration for regulatory identifier capture, validation, and profile assembly.
 *
 * Architecture:
 * Consumer modules → IdentityRegulatoryService → PartyIdentityIdentifierRepository
 *                                               ↘ RegulatoryIdentifierRequirementsService (ENG-003b)
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

import { eq } from "drizzle-orm";

import {
  DEFAULT_IDENTIFIER_VERIFICATION_METHOD,
  IDENTIFIER_STATUS_CODES,
  IDENTIFIER_VERIFICATION_STATUSES,
} from "@/core/identity-regulatory/constants";
import { formatIdentifierForDisplay } from "@/core/identity-regulatory/helpers/masking";
import {
  buildIdentifierProfileSummary,
  buildIdentifierRequirementRows,
  validateIdentifierPattern,
} from "@/core/identity-regulatory/services/identifier-profile-assembler";
import {
  createPartyIdentityIdentifierRepository,
  type PartyIdentityIdentifierRepository,
} from "@/core/identity-regulatory/repositories/party-identity-identifier-repository";
import type {
  CaptureIdentifierPayload,
  CapturedIdentifierRecord,
  CapturedIdentifierView,
  IdentifierVerificationRow,
  RegulatoryIdentifierProfile,
  UpdateIdentifierPayload,
  VerifyIdentifierPayload,
} from "@/core/identity-regulatory/types";
import { createRegulatoryIdentifierRequirementsService } from "@/core/localization-regulatory/services/regulatory-identifier-requirements-service";
import type { RegulatorySubjectContext } from "@/core/localization-regulatory/types";
import { getDb } from "@/db/client";
import { identifierType } from "@/db/schema/identifier-type";

export class IdentityRegulatoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string
  ) {
    super(message);
    this.name = "IdentityRegulatoryError";
  }
}

type IdentifierTypeCatalogueRow = {
  code: string;
  name: string;
  validationPattern: string | null;
};

export class IdentityRegulatoryService {
  constructor(
    private readonly identifierRepository: PartyIdentityIdentifierRepository = createPartyIdentityIdentifierRepository(),
    private readonly requirementsService = createRegulatoryIdentifierRequirementsService()
  ) {}

  async buildRegulatoryProfile(
    businessId: string,
    partyId: string,
    regulatoryContext: RegulatorySubjectContext,
    options: {
      countryName: string;
      canViewFullValues: boolean;
      documentNameById?: Map<string, string>;
      verifierNameById?: Map<string, string>;
    }
  ): Promise<RegulatoryIdentifierProfile> {
    const [capturedRows, identifierTypes, resolvedRuleSet] = await Promise.all([
      this.identifierRepository.listByPartyId(businessId, partyId),
      this.loadIdentifierTypes(),
      this.requirementsService.resolveIdentifierRequirements(regulatoryContext),
    ]);

    const typeNameByCode = new Map(identifierTypes.map((t) => [t.code, t.name]));
    const captured = capturedRows.map((row) => this.toRecord(row));
    const requirements = resolvedRuleSet?.requirements ?? [];

    const requirementRows = buildIdentifierRequirementRows({
      requirements,
      captured,
      typeNameByCode,
    });

    const summary = buildIdentifierProfileSummary({
      countryCode: regulatoryContext.countryCode,
      countryName: options.countryName,
      ruleSetCode: resolvedRuleSet?.code ?? "—",
      ruleSetName: resolvedRuleSet?.name ?? "No applicable rule set",
      requirementRows,
    });

    const capturedIdentifiers = captured.map((row) =>
      this.toCapturedView(row, typeNameByCode, options)
    );

    const verifications = captured
      .filter(
        (row) =>
          row.verificationStatus === IDENTIFIER_VERIFICATION_STATUSES.VERIFIED ||
          row.verificationStatus === IDENTIFIER_VERIFICATION_STATUSES.PENDING
      )
      .map((row) =>
        this.toVerificationRow(row, typeNameByCode, options)
      );

    return {
      summary,
      requiredIdentifiers: requirementRows,
      capturedIdentifiers,
      verifications,
    };
  }

  async captureIdentifier(
    businessId: string,
    partyId: string,
    payload: CaptureIdentifierPayload,
    actorId: string | null,
    validationPattern: string | null
  ) {
    const normalizedValue = payload.identifierValue.trim();

    if (!validateIdentifierPattern(normalizedValue, validationPattern)) {
      throw new IdentityRegulatoryError(
        "INVALID_IDENTIFIER_VALUE",
        "Identifier value does not match the required format.",
        "identifierValue"
      );
    }

    const duplicate = await this.identifierRepository.findByTypeAndValue(
      businessId,
      payload.identifierTypeCode,
      normalizedValue
    );

    if (duplicate) {
      throw new IdentityRegulatoryError(
        "DUPLICATE_IDENTIFIER",
        "This identifier value is already registered for another party.",
        "identifierValue"
      );
    }

    return this.identifierRepository.insert({
      businessId,
      partyId,
      identifierTypeCode: payload.identifierTypeCode,
      identifierValue: normalizedValue,
      issuingCountryCode: payload.issuingCountryCode ?? null,
      issuingAuthority: payload.issuingAuthority ?? null,
      issueDate: payload.issueDate ?? null,
      expiryDate: payload.expiryDate ?? null,
      statusCode: IDENTIFIER_STATUS_CODES.ACTIVE,
      verificationStatus: IDENTIFIER_VERIFICATION_STATUSES.PENDING,
      primaryIdentifier: payload.primaryIdentifier ?? false,
      linkedDocumentId: payload.linkedDocumentId ?? null,
      notes: payload.notes ?? null,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  async updateIdentifier(
    businessId: string,
    identifierId: string,
    payload: UpdateIdentifierPayload,
    actorId: string | null,
    validationPattern: string | null
  ) {
    const existing = await this.identifierRepository.findById(
      businessId,
      identifierId
    );

    if (!existing) {
      throw new IdentityRegulatoryError(
        "IDENTIFIER_NOT_FOUND",
        "Identifier not found."
      );
    }

    if (payload.identifierValue !== undefined) {
      const normalizedValue = payload.identifierValue.trim();

      if (!validateIdentifierPattern(normalizedValue, validationPattern)) {
        throw new IdentityRegulatoryError(
          "INVALID_IDENTIFIER_VALUE",
          "Identifier value does not match the required format.",
          "identifierValue"
        );
      }

      const duplicate = await this.identifierRepository.findByTypeAndValue(
        businessId,
        existing.identifierTypeCode,
        normalizedValue,
        identifierId
      );

      if (duplicate) {
        throw new IdentityRegulatoryError(
          "DUPLICATE_IDENTIFIER",
          "This identifier value is already registered for another party.",
          "identifierValue"
        );
      }
    }

    const updated = await this.identifierRepository.updateById(
      businessId,
      identifierId,
      payload.version,
      {
        identifierValue: payload.identifierValue?.trim(),
        issuingCountryCode: payload.issuingCountryCode,
        issuingAuthority: payload.issuingAuthority,
        issueDate: payload.issueDate,
        expiryDate: payload.expiryDate,
        primaryIdentifier: payload.primaryIdentifier,
        linkedDocumentId: payload.linkedDocumentId,
        notes: payload.notes,
        verificationStatus: IDENTIFIER_VERIFICATION_STATUSES.PENDING,
        verificationMethod: null,
        verifiedBy: null,
        verifiedAt: null,
        updatedBy: actorId,
      }
    );

    if (!updated) {
      throw new IdentityRegulatoryError(
        "VERSION_CONFLICT",
        "This identifier was updated elsewhere. Refresh and try again."
      );
    }

    return updated;
  }

  async verifyIdentifier(
    businessId: string,
    identifierId: string,
    payload: VerifyIdentifierPayload,
    actorId: string | null
  ) {
    const existing = await this.identifierRepository.findById(
      businessId,
      identifierId
    );

    if (!existing) {
      throw new IdentityRegulatoryError(
        "IDENTIFIER_NOT_FOUND",
        "Identifier not found."
      );
    }

    const updated = await this.identifierRepository.updateById(
      businessId,
      identifierId,
      payload.version,
      {
        verificationStatus: IDENTIFIER_VERIFICATION_STATUSES.VERIFIED,
        verificationMethod:
          payload.verificationMethod ?? DEFAULT_IDENTIFIER_VERIFICATION_METHOD,
        verifiedBy: actorId,
        verifiedAt: new Date(),
        notes: payload.notes ?? existing.notes,
        updatedBy: actorId,
      }
    );

    if (!updated) {
      throw new IdentityRegulatoryError(
        "VERSION_CONFLICT",
        "This identifier was updated elsewhere. Refresh and try again."
      );
    }

    return updated;
  }

  async linkDocument(
    businessId: string,
    identifierId: string,
    documentId: string,
    version: number,
    actorId: string | null
  ) {
    const updated = await this.identifierRepository.updateById(
      businessId,
      identifierId,
      version,
      {
        linkedDocumentId: documentId,
        updatedBy: actorId,
      }
    );

    if (!updated) {
      throw new IdentityRegulatoryError(
        "VERSION_CONFLICT",
        "This identifier was updated elsewhere. Refresh and try again."
      );
    }

    return updated;
  }

  async removeIdentifier(
    businessId: string,
    identifierId: string,
    version: number,
    actorId: string | null
  ) {
    const updated = await this.identifierRepository.updateById(
      businessId,
      identifierId,
      version,
      {
        statusCode: IDENTIFIER_STATUS_CODES.INACTIVE,
        deletedAt: new Date(),
        updatedBy: actorId,
      }
    );

    if (!updated) {
      throw new IdentityRegulatoryError(
        "VERSION_CONFLICT",
        "This identifier was updated elsewhere. Refresh and try again."
      );
    }

    return updated;
  }

  async findValidationPattern(identifierTypeCode: string): Promise<string | null> {
    const types = await this.loadIdentifierTypes();
    return types.find((t) => t.code === identifierTypeCode)?.validationPattern ?? null;
  }

  private async loadIdentifierTypes(): Promise<IdentifierTypeCatalogueRow[]> {
    return getDb()
      .select({
        code: identifierType.code,
        name: identifierType.name,
        validationPattern: identifierType.validationPattern,
      })
      .from(identifierType)
      .where(eq(identifierType.isActive, true));
  }

  private toRecord(row: {
    id: string;
    identifierTypeCode: string;
    identifierValue: string;
    issuingCountryCode: string | null;
    issuingAuthority: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    statusCode: string;
    verificationStatus: string;
    verificationMethod: string | null;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    primaryIdentifier: boolean;
    linkedDocumentId: string | null;
    notes: string | null;
    version: number;
  }): CapturedIdentifierRecord {
    return {
      id: row.id,
      identifierTypeCode: row.identifierTypeCode,
      identifierValue: row.identifierValue,
      issuingCountryCode: row.issuingCountryCode,
      issuingAuthority: row.issuingAuthority,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      statusCode: row.statusCode as CapturedIdentifierRecord["statusCode"],
      verificationStatus:
        row.verificationStatus as CapturedIdentifierRecord["verificationStatus"],
      verificationMethod: row.verificationMethod,
      verifiedBy: row.verifiedBy,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      primaryIdentifier: row.primaryIdentifier,
      linkedDocumentId: row.linkedDocumentId,
      notes: row.notes,
      version: row.version,
    };
  }

  private toCapturedView(
    row: CapturedIdentifierRecord,
    typeNameByCode: Map<string, string>,
    options: {
      canViewFullValues: boolean;
      documentNameById?: Map<string, string>;
    }
  ): CapturedIdentifierView {
    return {
      id: row.id,
      identifierTypeCode: row.identifierTypeCode,
      identifierTypeName:
        typeNameByCode.get(row.identifierTypeCode) ?? row.identifierTypeCode,
      maskedValue: formatIdentifierForDisplay(
        row.identifierValue,
        options.canViewFullValues
      ),
      fullValueAvailable: options.canViewFullValues,
      verificationStatus: row.verificationStatus,
      verificationMethod: row.verificationMethod,
      linkedDocumentId: row.linkedDocumentId,
      linkedDocumentName: row.linkedDocumentId
        ? (options.documentNameById?.get(row.linkedDocumentId) ?? null)
        : null,
      expiryDate: row.expiryDate,
      statusCode: row.statusCode,
      primaryIdentifier: row.primaryIdentifier,
      version: row.version,
    };
  }

  private toVerificationRow(
    row: CapturedIdentifierRecord,
    typeNameByCode: Map<string, string>,
    options: {
      canViewFullValues: boolean;
      documentNameById?: Map<string, string>;
      verifierNameById?: Map<string, string>;
    }
  ): IdentifierVerificationRow {
    return {
      identifierId: row.id,
      identifierTypeName:
        typeNameByCode.get(row.identifierTypeCode) ?? row.identifierTypeCode,
      maskedValue: formatIdentifierForDisplay(
        row.identifierValue,
        options.canViewFullValues
      ),
      verificationStatus: row.verificationStatus,
      verificationMethod: row.verificationMethod ?? DEFAULT_IDENTIFIER_VERIFICATION_METHOD,
      verifiedByDisplay: row.verifiedBy
        ? (options.verifierNameById?.get(row.verifiedBy) ?? row.verifiedBy)
        : null,
      verifiedAt: row.verifiedAt,
      linkedDocumentName: row.linkedDocumentId
        ? (options.documentNameById?.get(row.linkedDocumentId) ?? null)
        : null,
    };
  }
}

export function createIdentityRegulatoryService(): IdentityRegulatoryService {
  return new IdentityRegulatoryService();
}
