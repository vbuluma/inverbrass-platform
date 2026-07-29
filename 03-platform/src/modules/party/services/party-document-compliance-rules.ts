/**
 * Purpose:
 * Party adapter over Core Platform Document & Compliance.
 *
 * @deprecated Import from `@/core/document-compliance` for platform logic;
 * this module maps platform rows to Party panel view types.
 */

export {
  COMPLIANCE_DISPLAY_STATUSES as COMPLIANCE_REQUIREMENT_STATUSES,
  isDocumentExpired,
  resolveRequirementStatus,
} from "@/core/document-compliance";

export type { ComplianceDisplayStatus as ComplianceRequirementStatus } from "@/core/document-compliance";

import {
  buildComplianceSummary as buildPlatformComplianceSummary,
  buildRequirementRows,
  buildVerificationRows as buildPlatformVerificationRows,
} from "@/core/document-compliance";
import type {
  ComplianceRequirementRow,
  DocumentVerificationRow,
} from "@/core/document-compliance/types";
import { mapPartyDocumentsToEvidence } from "@/modules/party/adapters/party-document-evidence-adapter";
import type {
  PartyComplianceSummaryView,
  PartyDocumentRequirementView,
  PartyDocumentVerificationView,
  PartyDocumentView,
} from "@/modules/party/types";
import type { RequiredDocumentConfig } from "@/core/localization-regulatory/types";

function toPartyRequirementView(
  row: ComplianceRequirementRow
): PartyDocumentRequirementView {
  return {
    documentTypeCode: row.documentTypeCode,
    documentTypeName: row.documentTypeName,
    isRequired: row.isRequired,
    status: row.status,
    partyDocumentId: row.evidenceId,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
  };
}

function toPartyVerificationView(
  row: DocumentVerificationRow
): PartyDocumentVerificationView {
  return {
    partyDocumentId: row.evidenceId,
    documentTypeName: row.documentTypeName,
    originalFileName: row.originalFileName,
    verificationStatus: row.verificationStatus,
    verifiedByDisplay: row.verifiedByDisplay,
    verifiedAt: row.verifiedAt,
    verificationMethod: row.verificationMethod,
    comments: row.comments,
  };
}

export function toDocumentEvidenceRows(documents: PartyDocumentView[]) {
  return mapPartyDocumentsToEvidence(documents);
}

export function buildRequiredDocumentRows(input: {
  requirements: RequiredDocumentConfig[];
  documents: PartyDocumentView[];
  typeNameByCode: Map<string, string>;
  referenceDate?: Date;
}): PartyDocumentRequirementView[] {
  return buildRequirementRows({
    requirements: input.requirements,
    evidence: mapPartyDocumentsToEvidence(input.documents),
    typeNameByCode: input.typeNameByCode,
    referenceDate: input.referenceDate,
  }).map(toPartyRequirementView);
}

export function buildComplianceSummary(input: {
  countryCode: string;
  countryName: string;
  ruleSetCode: string;
  ruleSetName: string;
  requiredDocuments: PartyDocumentRequirementView[];
}): PartyComplianceSummaryView {
  const platformRows: ComplianceRequirementRow[] = input.requiredDocuments.map(
    (row) => ({
      documentTypeCode: row.documentTypeCode,
      documentTypeName: row.documentTypeName,
      isRequired: row.isRequired,
      validityStatus: "VALID",
      verificationStatus: row.status === "VERIFIED" ? "VERIFIED" : "PENDING",
      status: row.status,
      evidenceId: row.partyDocumentId,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
    })
  );

  return buildPlatformComplianceSummary({
    countryCode: input.countryCode,
    countryName: input.countryName,
    ruleSetCode: input.ruleSetCode,
    ruleSetName: input.ruleSetName,
    requiredDocuments: platformRows,
  });
}

export function buildVerificationRows(input: {
  documents: PartyDocumentView[];
  typeNameByCode: Map<string, string>;
  verifiedByNameById: Map<string, string>;
  methodNameByCode?: Map<string, string>;
  referenceDate?: Date;
}): PartyDocumentVerificationView[] {
  return buildPlatformVerificationRows({
    evidence: mapPartyDocumentsToEvidence(input.documents),
    typeNameByCode: input.typeNameByCode,
    verifiedByNameById: input.verifiedByNameById,
    methodNameByCode: input.methodNameByCode,
    referenceDate: input.referenceDate,
  }).map(toPartyVerificationView);
}
