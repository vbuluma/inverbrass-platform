/**
 * Purpose:
 * Party Document Management — upload, verify, replace, download.
 *
 * Architecture:
 * Server Actions → PartyDocumentService → Repositories + StorageProvider
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import { createHash, randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createStorageProvider } from "@/core/shared/storage";
import {
  PARTY_DOCUMENT_ALLOWED_MIME_TYPES,
  PARTY_DOCUMENT_MAX_SIZE_BYTES,
  PARTY_DOCUMENT_STATUS_CODES,
  PARTY_DOCUMENT_STORAGE_BUCKET,
  STORAGE_PROVIDER_CODES,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
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
import type {
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
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly storageProvider = createStorageProvider(
      STORAGE_PROVIDER_CODES.SUPABASE
    )
  ) {}

  async getPartyDocuments(
    context: CurrentBusinessContext,
    partyId: string,
    filterDocumentTypeCode?: string
  ): Promise<PartyDocumentsPanelView> {
    await this.requireParty(context, partyId);

    const [rows, documentTypes] = await Promise.all([
      this.partyDocumentRepository.listByPartyId(
        context.businessId,
        partyId,
        filterDocumentTypeCode?.trim() || undefined
      ),
      this.referenceRepository.listActiveDocumentTypes(),
    ]);

    if (documentTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Document Type catalogue is empty. Seed Party Document catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(documentTypes.map((t) => [t.code, t.name]));

    return {
      documents: rows.map((row) => this.toView(row, typeNameByCode)),
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
        ...(parsed.data.notes
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
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
    await this.requireDocument(context, partyId, partyDocumentId);

    await this.partyDocumentRepository.updateById(
      context.businessId,
      partyDocumentId,
      {
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
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

  private toView(
    row: {
      id: string;
      partyId: string;
      documentTypeCode: string;
      originalFileName: string;
      mimeType: string;
      fileSizeBytes: number;
      issueDate: string | null;
      expiryDate: string | null;
      statusCode: string;
      isVerified: boolean;
      verifiedAt: Date | null;
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
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      statusCode: row.statusCode as PartyDocumentView["statusCode"],
      isVerified: row.isVerified,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
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
