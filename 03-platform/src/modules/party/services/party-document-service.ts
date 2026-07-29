/**
 * Purpose:
 * Party orchestration for Document & Compliance — first consumer of the
 * Core Platform Document & Compliance module.
 *
 * Architecture:
 * Server Actions → PartyDocumentService → PartyDocumentRepository
 *                                      ↘ Core Document & Compliance
 *                                      ↘ ENG-003b RegulatoryDocumentRequirementsService
 *                                      ↘ StorageProvider
 *
 * Implementation Package:
 * BP-002 / IP-007 – Documents & Compliance (Party consumer)
 */

import { createHash, randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
} from "@/core/party-timeline";
import {
  buildComplianceSummary,
  buildRequirementRows,
  buildVerificationRows,
  DEFAULT_VERIFICATION_METHOD_CODE,
} from "@/core/document-compliance";
import { createVerificationMethodRepository } from "@/core/document-compliance/repositories/verification-method-repository";
import { createRegulatoryDocumentRequirementsService } from "@/core/localization-regulatory";
import { createStorageProvider } from "@/core/shared/storage";
import { inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import { mapPartyDocumentsToEvidence } from "@/modules/party/adapters/party-document-evidence-adapter";
import {
  PARTY_DOCUMENT_ALLOWED_MIME_TYPES,
  PARTY_DOCUMENT_MAX_SIZE_BYTES,
  PARTY_DOCUMENT_STATUS_CODES,
  PARTY_DOCUMENT_STORAGE_BUCKET,
  PARTY_TYPE_CODES,
  STORAGE_PROVIDER_CODES,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createOrganizationProfileRepository } from "@/modules/party/repositories/organization-profile-repository";
import { createPartyAddressRepository } from "@/modules/party/repositories/party-address-repository";
import { createPartyDocumentRepository } from "@/modules/party/repositories/party-document-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  buildStorageObjectPath,
  canDeactivateDocument,
  canDownloadDocument,
  canReactivateDocument,
  canVerifyDocument,
  formatFileSizeDisplay,
  isAllowedFileSize,
  isAllowedMimeType,
  isPartyDocumentStatusCode,
} from "@/modules/party/services/party-document-rules";
import {
  inferAuditOperationFromEventType,
  recordPartyEntityAudit,
} from "@/modules/party/services/party-audit-helper";
import type {
  PartyComplianceSummaryView,
  PartyDocumentsPanelView,
  PartyDocumentView,
  UploadPartyDocumentMetadata,
  VerifyPartyDocumentPayload,
} from "@/modules/party/types";
import {
  nullableTrimmed,
  uploadPartyDocumentMetadataSchema,
  verifyPartyDocumentSchema,
} from "@/modules/party/validators/party-document-validators";

type UploadFileInput = {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
};

export class PartyDocumentService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyDocumentRepository = createPartyDocumentRepository(),
    private readonly partyAddressRepository = createPartyAddressRepository(),
    private readonly organizationProfileRepository = createOrganizationProfileRepository(),
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly regulatoryRequirementsService = createRegulatoryDocumentRequirementsService(),
    private readonly verificationMethodRepository = createVerificationMethodRepository(),
    private readonly storageProvider = createStorageProvider(
      STORAGE_PROVIDER_CODES.SUPABASE
    ),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getPartyDocuments(
    context: CurrentBusinessContext,
    partyId: string,
    filterDocumentTypeCode?: string
  ): Promise<PartyDocumentsPanelView> {
    const party = await this.requireParty(context, partyId);

    const [rows, documentTypes, regulatoryContext] = await Promise.all([
      this.partyDocumentRepository.listByPartyId(
        context.businessId,
        partyId,
        filterDocumentTypeCode?.trim() || undefined
      ),
      this.referenceRepository.listActiveDocumentTypes(),
      this.resolvePartyRegulatoryContext(context, party),
    ]);

    if (documentTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Document Type catalogue is empty. Seed Party Document catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(documentTypes.map((t) => [t.code, t.name]));
    const documents = rows.map((row) => this.toView(row, typeNameByCode));

    const resolvedRuleSet =
      await this.regulatoryRequirementsService.resolveDocumentRequirements(
        regulatoryContext
      );

    const country =
      (await this.referenceRepository.findCountryByCode(
        regulatoryContext.countryCode
      )) ?? {
        code: regulatoryContext.countryCode,
        name: regulatoryContext.countryCode,
      };

    const evidence = mapPartyDocumentsToEvidence(documents);
    const verificationMethods = await this.verificationMethodRepository.listActive();
    const methodNameByCode = new Map(
      verificationMethods.map((method) => [method.code, method.name])
    );

    const platformRequirements = resolvedRuleSet
      ? buildRequirementRows({
          requirements: resolvedRuleSet.requirements,
          evidence,
          typeNameByCode,
        })
      : [];

    const requiredDocuments = platformRequirements.map((row) => ({
      documentTypeCode: row.documentTypeCode,
      documentTypeName: row.documentTypeName,
      isRequired: row.isRequired,
      status: row.status,
      partyDocumentId: row.evidenceId,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
    }));

    const complianceSummary = resolvedRuleSet
      ? buildComplianceSummary({
          countryCode: country.code,
          countryName: country.name,
          ruleSetCode: resolvedRuleSet.code,
          ruleSetName: resolvedRuleSet.name,
          requiredDocuments: platformRequirements,
        })
      : this.buildEmptySummaryView(country);

    const verifiedByNameById = await this.loadVerifiedByNames(
      documents
        .map((document) => document.verifiedBy)
        .filter((value): value is string => Boolean(value))
    );

    const verifications = buildVerificationRows({
      evidence,
      typeNameByCode,
      verifiedByNameById,
      methodNameByCode,
    }).map((row) => ({
      partyDocumentId: row.evidenceId,
      documentTypeName: row.documentTypeName,
      originalFileName: row.originalFileName,
      verificationStatus: row.verificationStatus,
      verifiedByDisplay: row.verifiedByDisplay,
      verifiedAt: row.verifiedAt,
      verificationMethod: row.verificationMethod,
      comments: row.comments,
    }));

    return {
      complianceSummary,
      requiredDocuments,
      documents,
      verifications,
      availableDocumentTypes: documentTypes,
      maxUploadSizeBytes: PARTY_DOCUMENT_MAX_SIZE_BYTES,
      allowedMimeTypes: PARTY_DOCUMENT_ALLOWED_MIME_TYPES,
    };
  }

  async uploadDocument(
    context: CurrentBusinessContext,
    partyId: string,
    file: UploadFileInput,
    metadata: UploadPartyDocumentMetadata
  ): Promise<PartyDocumentsPanelView> {
    const parsed = uploadPartyDocumentMetadataSchema.safeParse(metadata);
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

    const documentType = await this.referenceRepository.findDocumentTypeByCode(
      parsed.data.documentTypeCode
    );
    if (!documentType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid document type.",
        400,
        "documentTypeCode"
      );
    }

    this.validateUploadFile(file);

    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const duplicate = await this.partyDocumentRepository.findDuplicateByTypeAndHash(
      context.businessId,
      partyId,
      parsed.data.documentTypeCode,
      fileHash
    );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_PARTY_DOCUMENT",
        PARTY_USER_MESSAGES.DUPLICATE_PARTY_DOCUMENT,
        409
      );
    }

    const documentId = randomUUID();
    const storagePath = buildStorageObjectPath(
      context.businessId,
      partyId,
      documentId,
      file.name
    );

    try {
      await this.storageProvider.upload({
        bucket: PARTY_DOCUMENT_STORAGE_BUCKET,
        path: storagePath,
        data: file.buffer,
        contentType: file.type,
      });
    } catch (error) {
      throw this.toStorageError(error);
    }

    await this.partyDocumentRepository.insert({
      businessId: context.businessId,
      partyId,
      documentTypeCode: parsed.data.documentTypeCode,
      storageProviderCode: this.storageProvider.providerCode,
      storageBucket: PARTY_DOCUMENT_STORAGE_BUCKET,
      fileReference: storagePath,
      originalFileName: file.name,
      mimeType: file.type.toLowerCase(),
      fileSizeBytes: file.size,
      fileHash,
      issueDate: nullableTrimmed(parsed.data.issueDate ?? null),
      expiryDate: nullableTrimmed(parsed.data.expiryDate ?? null),
      statusCode: PARTY_DOCUMENT_STATUS_CODES.ACTIVE,
      notes: nullableTrimmed(parsed.data.notes ?? null),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.recordDocumentTimeline(
      context,
      partyId,
      PARTY_TIMELINE_EVENT_TYPES.DOCUMENT_UPLOADED,
      `${documentType.name} uploaded`,
      documentId
    );

    return this.getPartyDocuments(context, partyId);
  }

  async replaceDocument(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string,
    file: UploadFileInput,
    metadata: UploadPartyDocumentMetadata
  ): Promise<PartyDocumentsPanelView> {
    const existing = await this.requireDocument(context, partyId, partyDocumentId);
    this.validateUploadFile(file);

    await this.partyDocumentRepository.updateById(
      context.businessId,
      partyDocumentId,
      {
        statusCode: PARTY_DOCUMENT_STATUS_CODES.INACTIVE,
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    const parsed = uploadPartyDocumentMetadataSchema.safeParse({
      documentTypeCode: metadata.documentTypeCode || existing.documentTypeCode,
      issueDate: metadata.issueDate,
      expiryDate: metadata.expiryDate,
      notes: metadata.notes,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const newDocumentId = randomUUID();
    const storagePath = buildStorageObjectPath(
      context.businessId,
      partyId,
      newDocumentId,
      file.name
    );

    try {
      await this.storageProvider.upload({
        bucket: PARTY_DOCUMENT_STORAGE_BUCKET,
        path: storagePath,
        data: file.buffer,
        contentType: file.type,
      });
    } catch (error) {
      throw this.toStorageError(error);
    }

    await this.partyDocumentRepository.insert({
      businessId: context.businessId,
      partyId,
      documentTypeCode: parsed.data.documentTypeCode,
      storageProviderCode: this.storageProvider.providerCode,
      storageBucket: PARTY_DOCUMENT_STORAGE_BUCKET,
      fileReference: storagePath,
      originalFileName: file.name,
      mimeType: file.type.toLowerCase(),
      fileSizeBytes: file.size,
      fileHash,
      issueDate: nullableTrimmed(parsed.data.issueDate ?? null),
      expiryDate: nullableTrimmed(parsed.data.expiryDate ?? null),
      statusCode: PARTY_DOCUMENT_STATUS_CODES.ACTIVE,
      notes: nullableTrimmed(parsed.data.notes ?? null),
      supersedesDocumentId: partyDocumentId,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    return this.getPartyDocuments(context, partyId);
  }

  async verifyDocument(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string,
    payload: VerifyPartyDocumentPayload
  ): Promise<PartyDocumentsPanelView> {
    const parsed = verifyPartyDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new PartyError("INVALID_INPUT", PARTY_USER_MESSAGES.INVALID_INPUT, 400);
    }

    const document = await this.requireDocument(context, partyId, partyDocumentId);
    const statusCode = document.statusCode;

    if (!isPartyDocumentStatusCode(statusCode)) {
      throw new PartyError("INVALID_DOCUMENT_TRANSITION", PARTY_USER_MESSAGES.INVALID_DOCUMENT_TRANSITION);
    }

    if (!canVerifyDocument(statusCode, document.isVerified)) {
      throw new PartyError(
        "DOCUMENT_NOT_VERIFIABLE",
        PARTY_USER_MESSAGES.DOCUMENT_NOT_VERIFIABLE,
        400
      );
    }

    await this.partyDocumentRepository.updateById(
      context.businessId,
      partyDocumentId,
      {
        isVerified: true,
        verifiedBy: context.platformUserId,
        verifiedAt: new Date(),
        verificationMethodCode: DEFAULT_VERIFICATION_METHOD_CODE,
        ...(parsed.data.notes
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    const documentType = await this.referenceRepository.findDocumentTypeByCode(
      document.documentTypeCode
    );
    await this.recordDocumentTimeline(
      context,
      partyId,
      PARTY_TIMELINE_EVENT_TYPES.DOCUMENT_VERIFIED,
      `${documentType?.name ?? document.documentTypeCode} verified`,
      partyDocumentId
    );

    return this.getPartyDocuments(context, partyId);
  }

  async deactivateDocument(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string
  ): Promise<PartyDocumentsPanelView> {
    const document = await this.requireDocument(context, partyId, partyDocumentId);
    const statusCode = document.statusCode;

    if (!isPartyDocumentStatusCode(statusCode) || !canDeactivateDocument(statusCode)) {
      throw new PartyError(
        "INVALID_DOCUMENT_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_DOCUMENT_TRANSITION
      );
    }

    await this.partyDocumentRepository.updateById(
      context.businessId,
      partyDocumentId,
      {
        statusCode: PARTY_DOCUMENT_STATUS_CODES.INACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    const documentType = await this.referenceRepository.findDocumentTypeByCode(
      document.documentTypeCode
    );
    await this.recordDocumentTimeline(
      context,
      partyId,
      PARTY_TIMELINE_EVENT_TYPES.DOCUMENT_REMOVED,
      `${documentType?.name ?? document.documentTypeCode} deactivated`,
      partyDocumentId
    );

    return this.getPartyDocuments(context, partyId);
  }

  async reactivateDocument(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string
  ): Promise<PartyDocumentsPanelView> {
    const document = await this.requireDocument(context, partyId, partyDocumentId);
    const statusCode = document.statusCode;

    if (!isPartyDocumentStatusCode(statusCode) || !canReactivateDocument(statusCode)) {
      throw new PartyError(
        "INVALID_DOCUMENT_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_DOCUMENT_TRANSITION
      );
    }

    await this.partyDocumentRepository.updateById(
      context.businessId,
      partyDocumentId,
      {
        statusCode: PARTY_DOCUMENT_STATUS_CODES.ACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyDocuments(context, partyId);
  }

  async removeDocument(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string
  ): Promise<PartyDocumentsPanelView> {
    const document = await this.requireDocument(context, partyId, partyDocumentId);

    await this.partyDocumentRepository.updateById(
      context.businessId,
      partyDocumentId,
      {
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    const documentType = await this.referenceRepository.findDocumentTypeByCode(
      document.documentTypeCode
    );
    await this.recordDocumentTimeline(
      context,
      partyId,
      PARTY_TIMELINE_EVENT_TYPES.DOCUMENT_REMOVED,
      `${documentType?.name ?? document.documentTypeCode} removed`,
      partyDocumentId
    );

    return this.getPartyDocuments(context, partyId);
  }

  async getDownloadUrl(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string
  ): Promise<{ url: string; fileName: string }> {
    const document = await this.requireDocument(context, partyId, partyDocumentId);
    const statusCode = document.statusCode;

    if (!isPartyDocumentStatusCode(statusCode) || !canDownloadDocument(statusCode)) {
      throw new PartyError(
        "DOCUMENT_DOWNLOAD_NOT_ALLOWED",
        PARTY_USER_MESSAGES.DOCUMENT_DOWNLOAD_NOT_ALLOWED,
        403
      );
    }

    try {
      const signed = await this.storageProvider.createSignedDownloadUrl(
        document.storageBucket,
        document.fileReference
      );
      return { url: signed.url, fileName: document.originalFileName };
    } catch (error) {
      throw this.toStorageError(error);
    }
  }

  async getPreviewUrl(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string
  ): Promise<{ url: string }> {
    const result = await this.getDownloadUrl(context, partyId, partyDocumentId);
    return { url: result.url };
  }

  private toStorageError(error: unknown): PartyError {
    const message =
      error instanceof Error ? error.message : PARTY_USER_MESSAGES.STORAGE_NOT_CONFIGURED;

    if (message.includes("admin credentials are not configured")) {
      return new PartyError(
        "STORAGE_NOT_CONFIGURED",
        "Document storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        503
      );
    }

    return new PartyError(
      "STORAGE_NOT_CONFIGURED",
      message.includes("Storage")
        ? message
        : PARTY_USER_MESSAGES.STORAGE_NOT_CONFIGURED,
      503
    );
  }

  private validateUploadFile(file: UploadFileInput): void {
    if (!file.name?.trim()) {
      throw new PartyError(
        "DOCUMENT_UPLOAD_INVALID",
        "Select a file to upload.",
        400,
        "file"
      );
    }

    if (!isAllowedMimeType(file.type)) {
      throw new PartyError(
        "DOCUMENT_UPLOAD_INVALID",
        "Only PDF, JPG, JPEG, and PNG files are allowed.",
        400,
        "file"
      );
    }

    if (!isAllowedFileSize(file.size)) {
      throw new PartyError(
        "DOCUMENT_UPLOAD_INVALID",
        `File size must not exceed ${formatFileSizeDisplay(PARTY_DOCUMENT_MAX_SIZE_BYTES)}.`,
        400,
        "file"
      );
    }
  }

  private async requireParty(context: CurrentBusinessContext, partyId: string) {
    const party = await this.partyRepository.findById(context.businessId, partyId);
    if (!party) {
      throw new PartyError("PARTY_NOT_FOUND", PARTY_USER_MESSAGES.PARTY_NOT_FOUND, 404);
    }
    return party;
  }

  private async requireDocument(
    context: CurrentBusinessContext,
    partyId: string,
    partyDocumentId: string
  ) {
    const document = await this.partyDocumentRepository.findById(
      context.businessId,
      partyDocumentId
    );

    if (!document || document.partyId !== partyId) {
      throw new PartyError(
        "PARTY_DOCUMENT_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_DOCUMENT_NOT_FOUND,
        404
      );
    }

    return document;
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

    const countryCode =
      addressCountry ?? businessContext?.countryCode ?? "KE";

    return {
      countryCode,
      partyTypeCode: party.partyTypeCode,
      industryCode: organizationProfile?.industryCode ?? null,
    };
  }

  private buildEmptySummaryView(country: {
    code: string;
    name: string;
  }): PartyComplianceSummaryView {
    return {
      countryCode: country.code,
      countryName: country.name,
      ruleSetCode: "—",
      ruleSetName: "No applicable rule set",
      compliancePercent: 0,
      requiredCount: 0,
      uploadedCount: 0,
      verifiedCount: 0,
      expiredCount: 0,
      missingCount: 0,
    };
  }

  private async recordDocumentTimeline(
    context: CurrentBusinessContext,
    partyId: string,
    eventType: string,
    summary: string,
    referenceId?: string
  ) {
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.DOCUMENTS,
        summary,
        referenceEntity: "party_document",
        referenceId,
      })
    );

    if (referenceId) {
      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_DOCUMENT,
        entityId: referenceId,
        operation: inferAuditOperationFromEventType(eventType),
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_DOCUMENTS,
      });
    }
  }

  private async loadVerifiedByNames(
    platformUserIds: string[]
  ): Promise<Map<string, string>> {
    if (platformUserIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(platformUserIds)];
    const rows = await getDb()
      .select({
        id: platformUser.id,
        displayName: platformUser.displayName,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
      })
      .from(platformUser)
      .where(inArray(platformUser.id, uniqueIds));

    return new Map(
      rows.map((row) => [
        row.id,
        row.displayName?.trim() ||
          `${row.firstName} ${row.lastName}`.trim(),
      ])
    );
  }

  private toView(
    row: {
      id: string;
      partyId: string;
      documentTypeCode: string;
      originalFileName: string;
      mimeType: string;
      fileSizeBytes: number;
      fileHash: string | null;
      issueDate: string | null;
      expiryDate: string | null;
      statusCode: string;
      isVerified: boolean;
      verifiedBy: string | null;
      verifiedAt: Date | null;
      verificationMethodCode: string | null;
      notes: string | null;
      createdAt: Date;
      supersedesDocumentId: string | null;
    },
    typeNameByCode: Map<string, string>
  ): PartyDocumentView {
    return {
      id: row.id,
      partyId: row.partyId,
      documentTypeCode: row.documentTypeCode,
      documentTypeName: typeNameByCode.get(row.documentTypeCode) ?? row.documentTypeCode,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
      fileSizeDisplay: formatFileSizeDisplay(row.fileSizeBytes),
      fileHash: row.fileHash,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      statusCode: row.statusCode as PartyDocumentView["statusCode"],
      isVerified: row.isVerified,
      verifiedBy: row.verifiedBy,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      verificationMethodCode: row.verificationMethodCode,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      supersedesDocumentId: row.supersedesDocumentId,
    };
  }
}

export function createPartyDocumentService(): PartyDocumentService {
  return new PartyDocumentService();
}

export type { UploadFileInput };
