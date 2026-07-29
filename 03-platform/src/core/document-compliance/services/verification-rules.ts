/**
 * Purpose:
 * Verification status and method resolution for document evidence.
 *
 * Module:
 * Core Platform – Document & Compliance
 */

import {
  DEFAULT_VERIFICATION_METHOD_CODE,
  DOCUMENT_VALIDITY_STATUSES,
  DOCUMENT_VERIFICATION_STATUSES,
  type DocumentVerificationStatus,
} from "@/core/document-compliance/constants";
import type { DocumentEvidenceRecord } from "@/core/document-compliance/types";
import { resolveValidityStatus } from "@/core/document-compliance/services/validity-rules";

export function resolveVerificationStatus(
  evidence: DocumentEvidenceRecord | null
): DocumentVerificationStatus {
  if (!evidence?.isVerified) {
    return DOCUMENT_VERIFICATION_STATUSES.PENDING;
  }

  return DOCUMENT_VERIFICATION_STATUSES.VERIFIED;
}

export function resolveVerificationMethodCode(
  evidence: DocumentEvidenceRecord | null
): string | null {
  if (!evidence?.isVerified) {
    return null;
  }

  return evidence.verificationMethodCode ?? DEFAULT_VERIFICATION_METHOD_CODE;
}

export function resolveVerificationMethodDisplay(
  evidence: DocumentEvidenceRecord | null,
  methodNameByCode: Map<string, string> = new Map()
): string {
  const code = resolveVerificationMethodCode(evidence);
  if (!code) {
    return "—";
  }

  return methodNameByCode.get(code) ?? code;
}

export function resolvePanelVerificationStatus(
  evidence: DocumentEvidenceRecord,
  referenceDate: Date = new Date()
): DocumentVerificationStatus {
  const validity = resolveValidityStatus(evidence, referenceDate);
  const verification = resolveVerificationStatus(evidence);

  if (
    verification === DOCUMENT_VERIFICATION_STATUSES.VERIFIED &&
    validity !== DOCUMENT_VALIDITY_STATUSES.EXPIRED &&
    validity !== DOCUMENT_VALIDITY_STATUSES.REVOKED &&
    validity !== DOCUMENT_VALIDITY_STATUSES.MISSING
  ) {
    return DOCUMENT_VERIFICATION_STATUSES.VERIFIED;
  }

  return DOCUMENT_VERIFICATION_STATUSES.PENDING;
}
