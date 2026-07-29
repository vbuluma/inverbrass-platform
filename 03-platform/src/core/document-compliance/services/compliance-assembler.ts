/**
 * Purpose:
 * Assemble compliance views from requirements and evidence (pure logic).
 *
 * Module:
 * Core Platform – Document & Compliance
 */

import {
  DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES,
  COMPLIANCE_DISPLAY_STATUSES,
  DOCUMENT_VALIDITY_STATUSES,
  DOCUMENT_VERIFICATION_STATUSES,
  type ComplianceDisplayStatus,
} from "@/core/document-compliance/constants";
import { resolveValidityStatus } from "@/core/document-compliance/services/validity-rules";
import {
  resolvePanelVerificationStatus,
  resolveVerificationMethodDisplay,
  resolveVerificationStatus,
} from "@/core/document-compliance/services/verification-rules";
import type {
  BuildRequirementRowsInput,
  ComplianceRequirementRow,
  ComplianceSummary,
  DocumentEvidenceRecord,
  DocumentVerificationRow,
  ResolvedRequirementStatus,
} from "@/core/document-compliance/types";

export function toComplianceDisplayStatus(
  validityStatus: ResolvedRequirementStatus["validityStatus"],
  verificationStatus: ResolvedRequirementStatus["verificationStatus"]
): ComplianceDisplayStatus {
  if (validityStatus === DOCUMENT_VALIDITY_STATUSES.MISSING) {
    return COMPLIANCE_DISPLAY_STATUSES.MISSING;
  }

  if (validityStatus === DOCUMENT_VALIDITY_STATUSES.EXPIRED) {
    return COMPLIANCE_DISPLAY_STATUSES.EXPIRED;
  }

  if (
    verificationStatus === DOCUMENT_VERIFICATION_STATUSES.VERIFIED &&
    validityStatus === DOCUMENT_VALIDITY_STATUSES.VALID
  ) {
    return COMPLIANCE_DISPLAY_STATUSES.VERIFIED;
  }

  if (
    validityStatus === DOCUMENT_VALIDITY_STATUSES.VALID ||
    validityStatus === DOCUMENT_VALIDITY_STATUSES.PENDING
  ) {
    return COMPLIANCE_DISPLAY_STATUSES.UPLOADED;
  }

  return COMPLIANCE_DISPLAY_STATUSES.MISSING;
}

export function resolveRequirementStatus(
  evidence: DocumentEvidenceRecord | null,
  referenceDate: Date = new Date()
): ResolvedRequirementStatus {
  const validityStatus = resolveValidityStatus(evidence, referenceDate);
  const verificationStatus = resolveVerificationStatus(evidence);

  return {
    validityStatus,
    verificationStatus,
    displayStatus: toComplianceDisplayStatus(validityStatus, verificationStatus),
  };
}

function pickBestEvidenceByType(
  evidence: DocumentEvidenceRecord[]
): Map<string, DocumentEvidenceRecord> {
  const byType = new Map<string, DocumentEvidenceRecord>();

  for (const record of evidence) {
    if (record.lifecycleStatusCode !== DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES.ACTIVE) {
      continue;
    }

    const existing = byType.get(record.documentTypeCode);
    if (!existing) {
      byType.set(record.documentTypeCode, record);
      continue;
    }

    if (record.isVerified && !existing.isVerified) {
      byType.set(record.documentTypeCode, record);
    }
  }

  return byType;
}

export function buildRequirementRows(
  input: BuildRequirementRowsInput
): ComplianceRequirementRow[] {
  const evidenceByType = pickBestEvidenceByType(input.evidence);
  const referenceDate = input.referenceDate ?? new Date();

  return input.requirements.map((requirement) => {
    const record = evidenceByType.get(requirement.documentTypeCode) ?? null;
    const resolved = resolveRequirementStatus(record, referenceDate);

    return {
      documentTypeCode: requirement.documentTypeCode,
      documentTypeName:
        input.typeNameByCode.get(requirement.documentTypeCode) ??
        requirement.documentTypeCode,
      isRequired: requirement.requirementLevel === "REQUIRED",
      validityStatus: resolved.validityStatus,
      verificationStatus: resolved.verificationStatus,
      status: resolved.displayStatus,
      evidenceId: record?.id ?? null,
      issueDate: record?.issueDate ?? null,
      expiryDate: record?.expiryDate ?? null,
    };
  });
}

export function buildComplianceSummary(input: {
  countryCode: string;
  countryName: string;
  ruleSetCode: string;
  ruleSetName: string;
  requiredDocuments: ComplianceRequirementRow[];
}): ComplianceSummary {
  const requiredOnly = input.requiredDocuments.filter((row) => row.isRequired);

  const requiredCount = requiredOnly.length;
  const uploadedCount = requiredOnly.filter(
    (row) => row.status !== COMPLIANCE_DISPLAY_STATUSES.MISSING
  ).length;
  const verifiedCount = requiredOnly.filter(
    (row) => row.status === COMPLIANCE_DISPLAY_STATUSES.VERIFIED
  ).length;
  const expiredCount = requiredOnly.filter(
    (row) => row.status === COMPLIANCE_DISPLAY_STATUSES.EXPIRED
  ).length;
  const missingCount = requiredOnly.filter(
    (row) => row.status === COMPLIANCE_DISPLAY_STATUSES.MISSING
  ).length;

  const compliancePercent =
    requiredCount === 0
      ? 100
      : Math.round((verifiedCount / requiredCount) * 100);

  return {
    countryCode: input.countryCode,
    countryName: input.countryName,
    ruleSetCode: input.ruleSetCode,
    ruleSetName: input.ruleSetName,
    compliancePercent,
    requiredCount,
    uploadedCount,
    verifiedCount,
    expiredCount,
    missingCount,
  };
}

export function buildVerificationRows(input: {
  evidence: DocumentEvidenceRecord[];
  typeNameByCode: Map<string, string>;
  verifiedByNameById: Map<string, string>;
  methodNameByCode?: Map<string, string>;
  referenceDate?: Date;
}): DocumentVerificationRow[] {
  const referenceDate = input.referenceDate ?? new Date();
  const methodNameByCode = input.methodNameByCode ?? new Map();

  return input.evidence
    .filter(
      (record) =>
        record.lifecycleStatusCode === DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES.ACTIVE
    )
    .map((record) => {
      const validityStatus = resolveValidityStatus(record, referenceDate);
      const verificationStatus = resolvePanelVerificationStatus(
        record,
        referenceDate
      );

      return {
        evidenceId: record.id,
        documentTypeName:
          input.typeNameByCode.get(record.documentTypeCode) ??
          record.documentTypeCode,
        originalFileName: record.originalFileName,
        validityStatus,
        verificationStatus,
        verifiedByDisplay: record.verifiedBy
          ? (input.verifiedByNameById.get(record.verifiedBy) ?? record.verifiedBy)
          : null,
        verifiedAt: record.verifiedAt,
        verificationMethod: resolveVerificationMethodDisplay(
          record,
          methodNameByCode
        ),
        comments: record.notes,
      };
    });
}

export { isDocumentExpired } from "@/core/document-compliance/services/validity-rules";
