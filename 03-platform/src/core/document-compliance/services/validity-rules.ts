/**
 * Purpose:
 * Validity status resolution for document evidence.
 *
 * Module:
 * Core Platform – Document & Compliance
 */

import {
  DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES,
  DOCUMENT_VALIDITY_STATUSES,
  type DocumentValidityStatus,
} from "@/core/document-compliance/constants";
import type { DocumentEvidenceRecord } from "@/core/document-compliance/types";

export function isDocumentExpired(
  expiryDate: string | null,
  referenceDate: Date = new Date()
): boolean {
  if (!expiryDate) {
    return false;
  }

  const expiry = new Date(`${expiryDate}T23:59:59.999Z`);
  if (Number.isNaN(expiry.getTime())) {
    return false;
  }

  return expiry.getTime() < referenceDate.getTime();
}

export function resolveValidityStatus(
  evidence: DocumentEvidenceRecord | null,
  referenceDate: Date = new Date()
): DocumentValidityStatus {
  if (!evidence) {
    return DOCUMENT_VALIDITY_STATUSES.MISSING;
  }

  if (evidence.lifecycleStatusCode === DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES.INACTIVE) {
    return DOCUMENT_VALIDITY_STATUSES.REVOKED;
  }

  if (evidence.lifecycleStatusCode !== DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES.ACTIVE) {
    return DOCUMENT_VALIDITY_STATUSES.MISSING;
  }

  if (isDocumentExpired(evidence.expiryDate, referenceDate)) {
    return DOCUMENT_VALIDITY_STATUSES.EXPIRED;
  }

  return DOCUMENT_VALIDITY_STATUSES.VALID;
}
