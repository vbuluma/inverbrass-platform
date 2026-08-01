/**
 * Purpose:
 * Product orchestration for Offering Documents & Compliance — consumer of
 * Core Platform Document & Compliance module.
 *
 * Architecture:
 * Server Actions → OfferingDocumentService → Repositories
 *                                      ↘ Core Document & Compliance
 *                                      ↘ ENG-003b RegulatoryDocumentRequirementsService
 *                                      ↘ StorageProvider
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import { createHash, randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildComplianceSummary,
  buildRequirementRows,
  buildVerificationRows,
  DEFAULT_VERIFICATION_METHOD_CODE,
} from "@/core/document-compliance";
import { createVerificationMethodRepository } from "@/core/document-compliance/repositories/verification-method-repository";
import { createRegulatoryDocumentRequirementsService } from "@/core/localization-regulatory";
import { createStorageProvider } from "@/core/shared/storage";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline";
import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { country } from "@/db/schema/country";
import { documentType } from "@/db/schema/document-type";
import { platformUser } from "@/db/schema/platform-user";
import { mapOfferingDocumentsToEvidence } from "@/modules/product/adapters/offering-document-evidence-adapter";
import {
  OFFERING_DOCUMENT_ALLOWED_MIME_TYPES,
  OFFERING_DOCUMENT_MAX_SIZE_BYTES,
  OFFERING_DOCUMENT_STATUS_CODES,
  OFFERING_DOCUMENT_STORAGE_BUCKET,
  OFFERING_TYPE_CODES,
  PRODUCT_STATUS_CODES,
  STORAGE_PROVIDER_CODES,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createOfferingDocumentLinkRepository } from "@/modules/product/repositories/offering-document-link-repository";
import { createOfferingDocumentRepository } from "@/modules/product/repositories/offering-document-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  buildStorageObjectPath,
  canDeactivateDocument,
  canDownloadDocument,
  canReactivateDocument,
  canVerifyDocument,
  deriveComplianceStatus,
  formatFileSizeDisplay,
  isAllowedFileSize,
  isAllowedMimeType,
  isOfferingDocumentStatusCode,
} from "@/modules/product/services/offering-document-rules";
import type {
  OfferingComplianceSummaryView,
  OfferingDocumentsPanelView,
  OfferingDocumentView,
  UploadOfferingDocumentMetadata,
  VerifyOfferingDocumentPayload,
} from "@/modules/product/types";
import {
  nullableTrimmed,
  uploadOfferingDocumentMetadataSchema,
  verifyOfferingDocumentSchema,
} from "@/modules/product/validators/offering-document-validators";

type UploadFileInput = {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
};

type DocumentRow = {
  id: string;
  productId: string;
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
  storageBucket: string;
  fileReference: string;
};

export class OfferingDocumentService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly offeringDocumentRepository = createOfferingDocumentRepository(),
    private readonly offeringDocumentLinkRepository = createOfferingDocumentLinkRepository(),
    private readonly regulatoryRequirementsService = createRegulatoryDocumentRequirementsService(),
    private readonly verificationMethodRepository = createVerificationMethodRepository(),
    private readonly storageProvider = createStorageProvider(
      STORAGE_PROVIDER_CODES.SUPABASE
    ),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getOfferingDocumentsPanel(
    context: CurrentBusinessContext,
    productId: string,
    filterDocumentTypeCode?: string
  ): Promise<OfferingDocumentsPanelView> {
    const product = await this.requireProduct(context, productId);

    const [rows, documentTypes, regulatoryContext] = await Promise.all([
      this.offeringDocumentRepository.listByProductId(
        context.businessId,
        productId,
        filterDocumentTypeCode?.trim() || undefined
      ),
      this.listActiveDocumentTypes(),
      this.resolveOfferingRegulatoryContext(context, product),
    ]);

    if (documentTypes.length === 0) {
      throw new ProductError(
        "REFERENCE_DATA_MISSING",
        "Document Type catalogue is empty. Seed document catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(documentTypes.map((t) => [t.code, t.name]));
    const documents = rows.map((row) => this.toView(row, typeNameByCode));

    const resolvedRuleSet =
      await this.regulatoryRequirementsService.resolveDocumentRequirements(
        regulatoryContext
      );

    const countryRow =
      (await this.findCountryByCode(regulatoryContext.countryCode)) ?? {
        code: regulatoryContext.countryCode,
        name: regulatoryContext.countryCode,
      };

    const evidence = mapOfferingDocumentsToEvidence(
      documents.map((document, index) => ({
        ...document,
        fileHash: rows[index]?.fileHash ?? null,
      }))
    );

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
      offeringDocumentId: row.evidenceId,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
    }));

    const platformSummary = resolvedRuleSet
      ? buildComplianceSummary({
          countryCode: countryRow.code,
          countryName: countryRow.name,
          ruleSetCode: resolvedRuleSet.code,
          ruleSetName: resolvedRuleSet.name,
          requiredDocuments: platformRequirements,
        })
      : null;

    const complianceSummary: OfferingComplianceSummaryView = platformSummary
      ? {
          countryCode: platformSummary.countryCode,
          countryName: platformSummary.countryName,
          ruleSetCode: platformSummary.ruleSetCode,
          ruleSetName: platformSummary.ruleSetName,
          complianceScore: platformSummary.compliancePercent,
          complianceStatus: deriveComplianceStatus({
            complianceScore: platformSummary.compliancePercent,
            missingCount: platformSummary.missingCount,
            expiredCount: platformSummary.expiredCount,
            requiredCount: platformSummary.requiredCount,
            verifiedCount: platformSummary.verifiedCount,
          }),
          mandatoryCount: platformSummary.requiredCount,
          uploadedCount: platformSummary.uploadedCount,
          missingCount: platformSummary.missingCount,
          expiredCount: platformSummary.expiredCount,
          verifiedCount: platformSummary.verifiedCount,
        }
      : this.buildEmptySummaryView(countryRow);

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
      offeringDocumentId: row.evidenceId,
      documentTypeName: row.documentTypeName,
      originalFileName: row.originalFileName,
      verificationStatus: row.verificationStatus,
      verifiedByDisplay: row.verifiedByDisplay,
      verifiedAt: row.verifiedAt,
      verificationMethodName: row.verificationMethod,
    }));

    const activeDocuments = documents.filter(
      (document) => document.statusCode === OFFERING_DOCUMENT_STATUS_CODES.ACTIVE
    );

    return {
      documents,
      documentTypes,
      requiredDocuments,
      complianceSummary,
      verifications,
      summaryCards: {
        totalDocuments: activeDocuments.length,
        verified: activeDocuments.filter((document) => document.isVerified)
          .length,
        pending: activeDocuments.filter((document) => !document.isVerified)
          .length,
        expired: requiredDocuments.filter((row) => row.status === "EXPIRED")
          .length,
        complianceScore: complianceSummary.complianceScore,
      },
    };
  }

  async uploadDocument(
    context: CurrentBusinessContext,
    productId: string,
    file: UploadFileInput,
    metadata: UploadOfferingDocumentMetadata
  ): Promise<OfferingDocumentsPanelView> {
    const parsed = uploadOfferingDocumentMetadataSchema.safeParse(metadata);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireMutableProduct(context, productId);

    const documentTypeRow = await this.findDocumentTypeByCode(
      parsed.data.documentTypeCode
    );
    if (!documentTypeRow) {
      throw new ProductError(
        "INVALID_INPUT",
        "Select a valid document type.",
        400,
        "documentTypeCode"
      );
    }

    this.validateUploadFile(file);

    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const duplicate =
      await this.offeringDocumentRepository.findDuplicateByTypeAndHash(
        context.businessId,
        productId,
        parsed.data.documentTypeCode,
        fileHash
      );
    if (duplicate) {
      throw new ProductError(
        "INVALID_INPUT",
        "This document has already been uploaded for this product.",
        409
      );
    }

    const documentId = randomUUID();
    const storagePath = buildStorageObjectPath(
      context.businessId,
      productId,
      documentId,
      file.name
    );

    try {
      await this.storageProvider.upload({
        bucket: OFFERING_DOCUMENT_STORAGE_BUCKET,
        path: storagePath,
        data: file.buffer,
        contentType: file.type,
      });
    } catch (error) {
      throw this.toStorageError(error);
    }

    const inserted = await this.offeringDocumentRepository.insert({
      businessId: context.businessId,
      productId,
      documentTypeCode: parsed.data.documentTypeCode,
      storageProviderCode: this.storageProvider.providerCode,
      storageBucket: OFFERING_DOCUMENT_STORAGE_BUCKET,
      fileReference: storagePath,
      originalFileName: file.name,
      mimeType: file.type.toLowerCase(),
      fileSizeBytes: file.size,
      fileHash,
      issueDate: nullableTrimmed(parsed.data.issueDate ?? null),
      expiryDate: nullableTrimmed(parsed.data.expiryDate ?? null),
      statusCode: OFFERING_DOCUMENT_STATUS_CODES.ACTIVE,
      notes: nullableTrimmed(parsed.data.notes ?? null),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.offeringDocumentLinkRepository.insert({
      businessId: context.businessId,
      offeringId: productId,
      offeringType: OFFERING_TYPE_CODES.PRODUCT,
      documentId: inserted.id,
      isPrimary: true,
    });

    await this.recordDocumentTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_DOCUMENT_UPLOADED,
      `${documentTypeRow.name} uploaded`,
      inserted.id
    );

    return this.getOfferingDocumentsPanel(context, productId);
  }

  async replaceDocument(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string,
    file: UploadFileInput,
    metadata: UploadOfferingDocumentMetadata
  ): Promise<OfferingDocumentsPanelView> {
    const existing = await this.requireDocument(
      context,
      productId,
      offeringDocumentId
    );
    await this.requireMutableProduct(context, productId);
    this.validateUploadFile(file);

    await this.offeringDocumentRepository.updateById(
      context.businessId,
      offeringDocumentId,
      {
        statusCode: OFFERING_DOCUMENT_STATUS_CODES.INACTIVE,
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    const parsed = uploadOfferingDocumentMetadataSchema.safeParse({
      documentTypeCode: metadata.documentTypeCode || existing.documentTypeCode,
      issueDate: metadata.issueDate,
      expiryDate: metadata.expiryDate,
      notes: metadata.notes,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const newDocumentId = randomUUID();
    const storagePath = buildStorageObjectPath(
      context.businessId,
      productId,
      newDocumentId,
      file.name
    );

    try {
      await this.storageProvider.upload({
        bucket: OFFERING_DOCUMENT_STORAGE_BUCKET,
        path: storagePath,
        data: file.buffer,
        contentType: file.type,
      });
    } catch (error) {
      throw this.toStorageError(error);
    }

    const inserted = await this.offeringDocumentRepository.insert({
      businessId: context.businessId,
      productId,
      documentTypeCode: parsed.data.documentTypeCode,
      storageProviderCode: this.storageProvider.providerCode,
      storageBucket: OFFERING_DOCUMENT_STORAGE_BUCKET,
      fileReference: storagePath,
      originalFileName: file.name,
      mimeType: file.type.toLowerCase(),
      fileSizeBytes: file.size,
      fileHash,
      issueDate: nullableTrimmed(parsed.data.issueDate ?? null),
      expiryDate: nullableTrimmed(parsed.data.expiryDate ?? null),
      statusCode: OFFERING_DOCUMENT_STATUS_CODES.ACTIVE,
      notes: nullableTrimmed(parsed.data.notes ?? null),
      supersedesDocumentId: offeringDocumentId,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.offeringDocumentLinkRepository.insert({
      businessId: context.businessId,
      offeringId: productId,
      offeringType: OFFERING_TYPE_CODES.PRODUCT,
      documentId: inserted.id,
      isPrimary: true,
    });

    await this.recordDocumentTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_DOCUMENT_REPLACED,
      `${existing.documentTypeCode} replaced`,
      inserted.id
    );

    return this.getOfferingDocumentsPanel(context, productId);
  }

  async verifyDocument(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string,
    payload: VerifyOfferingDocumentPayload
  ): Promise<OfferingDocumentsPanelView> {
    const parsed = verifyOfferingDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ProductError(
        "INVALID_INPUT",
        PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const document = await this.requireDocument(
      context,
      productId,
      offeringDocumentId
    );
    await this.requireMutableProduct(context, productId);

    if (!isOfferingDocumentStatusCode(document.statusCode)) {
      throw new ProductError(
        "INVALID_INPUT",
        "This document cannot be verified in its current state.",
        400
      );
    }

    if (!canVerifyDocument(document.statusCode, document.isVerified)) {
      throw new ProductError(
        "INVALID_INPUT",
        "This document is not eligible for verification.",
        400
      );
    }

    await this.offeringDocumentRepository.updateById(
      context.businessId,
      offeringDocumentId,
      {
        isVerified: true,
        verifiedBy: context.platformUserId,
        verifiedAt: new Date(),
        verificationMethodCode:
          parsed.data.verificationMethodCode ||
          DEFAULT_VERIFICATION_METHOD_CODE,
        ...(parsed.data.notes
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    const documentTypeRow = await this.findDocumentTypeByCode(
      document.documentTypeCode
    );
    await this.recordDocumentTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_DOCUMENT_VERIFIED,
      `${documentTypeRow?.name ?? document.documentTypeCode} verified`,
      offeringDocumentId
    );

    return this.getOfferingDocumentsPanel(context, productId);
  }

  async deactivateDocument(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string
  ): Promise<OfferingDocumentsPanelView> {
    const document = await this.requireDocument(
      context,
      productId,
      offeringDocumentId
    );
    await this.requireMutableProduct(context, productId);

    if (
      !isOfferingDocumentStatusCode(document.statusCode) ||
      !canDeactivateDocument(document.statusCode)
    ) {
      throw new ProductError(
        "INVALID_INPUT",
        "This document cannot be deactivated in its current state.",
        400
      );
    }

    await this.offeringDocumentRepository.updateById(
      context.businessId,
      offeringDocumentId,
      {
        statusCode: OFFERING_DOCUMENT_STATUS_CODES.INACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    const documentTypeRow = await this.findDocumentTypeByCode(
      document.documentTypeCode
    );
    await this.recordDocumentTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_DOCUMENT_DEACTIVATED,
      `${documentTypeRow?.name ?? document.documentTypeCode} deactivated`,
      offeringDocumentId
    );

    return this.getOfferingDocumentsPanel(context, productId);
  }

  async reactivateDocument(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string
  ): Promise<OfferingDocumentsPanelView> {
    const document = await this.requireDocument(
      context,
      productId,
      offeringDocumentId
    );
    await this.requireMutableProduct(context, productId);

    if (
      !isOfferingDocumentStatusCode(document.statusCode) ||
      !canReactivateDocument(document.statusCode)
    ) {
      throw new ProductError(
        "INVALID_INPUT",
        "This document cannot be reactivated in its current state.",
        400
      );
    }

    await this.offeringDocumentRepository.updateById(
      context.businessId,
      offeringDocumentId,
      {
        statusCode: OFFERING_DOCUMENT_STATUS_CODES.ACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getOfferingDocumentsPanel(context, productId);
  }

  async removeDocument(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string
  ): Promise<OfferingDocumentsPanelView> {
    const document = await this.requireDocument(
      context,
      productId,
      offeringDocumentId
    );
    await this.requireMutableProduct(context, productId);

    await this.offeringDocumentRepository.updateById(
      context.businessId,
      offeringDocumentId,
      {
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    const documentTypeRow = await this.findDocumentTypeByCode(
      document.documentTypeCode
    );
    await this.recordDocumentTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_DOCUMENT_REMOVED,
      `${documentTypeRow?.name ?? document.documentTypeCode} removed`,
      offeringDocumentId
    );

    return this.getOfferingDocumentsPanel(context, productId);
  }

  async getDownloadUrl(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string
  ): Promise<{ url: string; fileName: string }> {
    const document = await this.requireDocument(
      context,
      productId,
      offeringDocumentId
    );

    if (
      !isOfferingDocumentStatusCode(document.statusCode) ||
      !canDownloadDocument(document.statusCode)
    ) {
      throw new ProductError(
        "INVALID_INPUT",
        "This document cannot be downloaded in its current state.",
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
    productId: string,
    offeringDocumentId: string
  ): Promise<{ url: string }> {
    const result = await this.getDownloadUrl(
      context,
      productId,
      offeringDocumentId
    );
    return { url: result.url };
  }

  private toStorageError(error: unknown): ProductError {
    const message =
      error instanceof Error
        ? error.message
        : "Document storage is not configured.";

    if (message.includes("admin credentials are not configured")) {
      return new ProductError(
        "PROVIDER_ERROR",
        "Document storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        503
      );
    }

    return new ProductError(
      "PROVIDER_ERROR",
      message.includes("Storage") ? message : "Document storage is not configured.",
      503
    );
  }

  private validateUploadFile(file: UploadFileInput): void {
    if (!file.name?.trim()) {
      throw new ProductError(
        "INVALID_INPUT",
        "Select a file to upload.",
        400,
        "file"
      );
    }

    if (!isAllowedMimeType(file.type)) {
      throw new ProductError(
        "INVALID_INPUT",
        "This file type is not allowed.",
        400,
        "file"
      );
    }

    if (!isAllowedFileSize(file.size)) {
      throw new ProductError(
        "INVALID_INPUT",
        `File size must not exceed ${formatFileSizeDisplay(OFFERING_DOCUMENT_MAX_SIZE_BYTES)}.`,
        400,
        "file"
      );
    }
  }

  private async requireProduct(
    context: CurrentBusinessContext,
    productId: string
  ) {
    const product = await this.productRepository.findById(
      context.businessId,
      productId
    );
    if (!product) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }
    return product;
  }

  private async requireMutableProduct(
    context: CurrentBusinessContext,
    productId: string
  ) {
    const product = await this.requireProduct(context, productId);
    if (product.statusCode === PRODUCT_STATUS_CODES.ARCHIVED) {
      throw new ProductError(
        "ARCHIVED_PRODUCT_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_PRODUCT_IMMUTABLE,
        400
      );
    }
    return product;
  }

  private async requireDocument(
    context: CurrentBusinessContext,
    productId: string,
    offeringDocumentId: string
  ): Promise<DocumentRow> {
    const document = await this.offeringDocumentRepository.findById(
      context.businessId,
      offeringDocumentId
    );

    if (!document || document.productId !== productId) {
      throw new ProductError(
        "OFFERING_DOCUMENT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.OFFERING_DOCUMENT_NOT_FOUND,
        404
      );
    }

    return document;
  }

  private async resolveOfferingRegulatoryContext(
    context: CurrentBusinessContext,
    product: { productTypeCode: string }
  ) {
    const [businessRow] = await getDb()
      .select({ countryCode: business.countryCode })
      .from(business)
      .where(eq(business.id, context.businessId))
      .limit(1);

    return {
      countryCode: businessRow?.countryCode ?? "KE",
      partyTypeCode: product.productTypeCode,
      industryCode: null as string | null,
    };
  }

  private buildEmptySummaryView(country: {
    code: string;
    name: string;
  }): OfferingComplianceSummaryView {
    return {
      countryCode: country.code,
      countryName: country.name,
      ruleSetCode: null,
      ruleSetName: "No applicable rule set",
      complianceScore: 0,
      complianceStatus: "Not Required",
      mandatoryCount: 0,
      uploadedCount: 0,
      verifiedCount: 0,
      expiredCount: 0,
      missingCount: 0,
    };
  }

  private async recordDocumentTimeline(
    context: CurrentBusinessContext,
    productId: string,
    eventType: string,
    summary: string,
    referenceId?: string
  ) {
    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.DOCUMENTS,
        summary,
        referenceEntity: AUDIT_ENTITY_NAMES.OFFERING_DOCUMENT,
        referenceId,
      })
    );

    if (referenceId) {
      const product = await this.productRepository.findById(
        context.businessId,
        productId
      );

      await recordProductEntityAudit(this.auditService, context, {
        productId,
        ownerPartyId: product?.ownerPartyId ?? null,
        entityName: AUDIT_ENTITY_NAMES.OFFERING_DOCUMENT,
        entityId: referenceId,
        operation: this.inferAuditOperation(eventType),
        sourceModule: AUDIT_SOURCE_MODULES.OFFERING_DOCUMENTS,
      });
    }
  }

  private inferAuditOperation(eventType: string): string {
    const normalized = eventType.toUpperCase();
    if (normalized.includes("UPLOADED")) {
      return AUDIT_OPERATIONS.CREATE;
    }
    if (normalized.includes("REMOVED")) {
      return AUDIT_OPERATIONS.DELETE;
    }
    if (normalized.includes("VERIFIED")) {
      return AUDIT_OPERATIONS.VERIFY;
    }
    if (normalized.includes("DEACTIVATED")) {
      return AUDIT_OPERATIONS.DEACTIVATE;
    }
    return AUDIT_OPERATIONS.UPDATE;
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

  private async listActiveDocumentTypes() {
    return getDb()
      .select({
        code: documentType.code,
        name: documentType.name,
        description: documentType.description,
      })
      .from(documentType)
      .where(eq(documentType.isActive, true))
      .orderBy(asc(documentType.displayOrder), asc(documentType.name));
  }

  private async findDocumentTypeByCode(code: string) {
    const [row] = await getDb()
      .select({ code: documentType.code, name: documentType.name })
      .from(documentType)
      .where(and(eq(documentType.code, code), eq(documentType.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  private async findCountryByCode(code: string) {
    const [row] = await getDb()
      .select({ code: country.code, name: country.name })
      .from(country)
      .where(and(eq(country.code, code.toUpperCase()), eq(country.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  private toView(
    row: DocumentRow,
    typeNameByCode: Map<string, string>
  ): OfferingDocumentView {
    return {
      id: row.id,
      documentTypeCode: row.documentTypeCode,
      documentTypeName:
        typeNameByCode.get(row.documentTypeCode) ?? row.documentTypeCode,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
      fileSizeDisplay: formatFileSizeDisplay(row.fileSizeBytes),
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      statusCode: row.statusCode,
      isVerified: row.isVerified,
      verifiedBy: row.verifiedBy,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      verificationMethodCode: row.verificationMethodCode,
      notes: row.notes,
      uploadedAt: row.createdAt.toISOString(),
      supersedesDocumentId: row.supersedesDocumentId,
    };
  }
}

export function createOfferingDocumentService(): OfferingDocumentService {
  return new OfferingDocumentService();
}

export type { UploadFileInput };
