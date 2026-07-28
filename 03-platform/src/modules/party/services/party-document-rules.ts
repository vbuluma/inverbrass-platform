/**
 * Purpose:
 * Pure Party Document business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import {
  PARTY_DOCUMENT_ALLOWED_MIME_TYPES,
  PARTY_DOCUMENT_MAX_SIZE_BYTES,
  PARTY_DOCUMENT_STATUS_CODES,
  type PartyDocumentStatusCode,
} from "@/modules/party/constants";

export function isPartyDocumentStatusCode(
  value: string
): value is PartyDocumentStatusCode {
  return (
    value === PARTY_DOCUMENT_STATUS_CODES.ACTIVE ||
    value === PARTY_DOCUMENT_STATUS_CODES.INACTIVE
  );
}

export function canVerifyDocument(
  statusCode: PartyDocumentStatusCode,
  isVerified: boolean
): boolean {
  return statusCode === PARTY_DOCUMENT_STATUS_CODES.ACTIVE && !isVerified;
}

export function canDownloadDocument(statusCode: PartyDocumentStatusCode): boolean {
  return statusCode === PARTY_DOCUMENT_STATUS_CODES.ACTIVE;
}

export function canDeactivateDocument(
  statusCode: PartyDocumentStatusCode
): boolean {
  return statusCode === PARTY_DOCUMENT_STATUS_CODES.ACTIVE;
}

export function canReactivateDocument(
  statusCode: PartyDocumentStatusCode
): boolean {
  return statusCode === PARTY_DOCUMENT_STATUS_CODES.INACTIVE;
}

export function isAllowedMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return (PARTY_DOCUMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    normalized
  );
}

export function isAllowedFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= PARTY_DOCUMENT_MAX_SIZE_BYTES;
}

export function formatFileSizeDisplay(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildStorageObjectPath(
  businessId: string,
  partyId: string,
  documentId: string,
  originalFileName: string
): string {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${businessId}/${partyId}/${documentId}/${safeName}`;
}
