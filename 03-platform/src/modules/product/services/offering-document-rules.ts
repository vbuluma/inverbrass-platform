/**
 * Purpose:
 * Pure Offering Document business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import {
  OFFERING_DOCUMENT_ALLOWED_MIME_TYPES,
  OFFERING_DOCUMENT_MAX_SIZE_BYTES,
  OFFERING_DOCUMENT_STATUS_CODES,
  type OfferingDocumentStatusCode,
} from "@/modules/product/constants";

export function isOfferingDocumentStatusCode(
  value: string
): value is OfferingDocumentStatusCode {
  return (
    value === OFFERING_DOCUMENT_STATUS_CODES.ACTIVE ||
    value === OFFERING_DOCUMENT_STATUS_CODES.INACTIVE ||
    value === OFFERING_DOCUMENT_STATUS_CODES.EXPIRED
  );
}

export function canVerifyDocument(
  statusCode: OfferingDocumentStatusCode,
  isVerified: boolean
): boolean {
  return statusCode === OFFERING_DOCUMENT_STATUS_CODES.ACTIVE && !isVerified;
}

export function canDownloadDocument(
  statusCode: OfferingDocumentStatusCode
): boolean {
  return statusCode === OFFERING_DOCUMENT_STATUS_CODES.ACTIVE;
}

export function canDeactivateDocument(
  statusCode: OfferingDocumentStatusCode
): boolean {
  return statusCode === OFFERING_DOCUMENT_STATUS_CODES.ACTIVE;
}

export function canReactivateDocument(
  statusCode: OfferingDocumentStatusCode
): boolean {
  return statusCode === OFFERING_DOCUMENT_STATUS_CODES.INACTIVE;
}

export function isAllowedMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return (OFFERING_DOCUMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    normalized
  );
}

export function isAllowedFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= OFFERING_DOCUMENT_MAX_SIZE_BYTES;
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
  productId: string,
  documentId: string,
  originalFileName: string
): string {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${businessId}/${productId}/${documentId}/${safeName}`;
}

export function deriveComplianceStatus(input: {
  complianceScore: number;
  missingCount: number;
  expiredCount: number;
  requiredCount: number;
  verifiedCount: number;
}): string {
  if (input.requiredCount === 0) {
    return "Not Required";
  }
  if (input.missingCount > 0) {
    return "Incomplete";
  }
  if (input.expiredCount > 0) {
    return "Expired";
  }
  if (input.verifiedCount < input.requiredCount) {
    return "Pending Verification";
  }
  if (input.complianceScore >= 100) {
    return "Complete";
  }
  return "Incomplete";
}
