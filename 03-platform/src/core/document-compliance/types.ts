/**
 * Purpose:
 * Core Platform Document & Compliance types (domain-neutral).
 *
 * Module:
 * Core Platform – Document & Compliance
 */

import type {
  ComplianceDisplayStatus,
  DocumentValidityStatus,
  DocumentVerificationStatus,
} from "@/core/document-compliance/constants";
import type { RequiredDocumentConfig } from "@/core/localization-regulatory/types";

export type DocumentEvidenceRecord = {
  id: string;
  documentTypeCode: string;
  issueDate: string | null;
  expiryDate: string | null;
  lifecycleStatusCode: string;
  isVerified: boolean;
  verificationMethodCode: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  fileHash: string | null;
  originalFileName: string;
};

export type ResolvedRequirementStatus = {
  validityStatus: DocumentValidityStatus;
  verificationStatus: DocumentVerificationStatus;
  displayStatus: ComplianceDisplayStatus;
};

export type ComplianceRequirementRow = {
  documentTypeCode: string;
  documentTypeName: string;
  isRequired: boolean;
  validityStatus: DocumentValidityStatus;
  verificationStatus: DocumentVerificationStatus;
  status: ComplianceDisplayStatus;
  evidenceId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
};

export type ComplianceSummary = {
  countryCode: string;
  countryName: string;
  ruleSetCode: string;
  ruleSetName: string;
  compliancePercent: number;
  requiredCount: number;
  uploadedCount: number;
  verifiedCount: number;
  expiredCount: number;
  missingCount: number;
};

export type DocumentVerificationRow = {
  evidenceId: string;
  documentTypeName: string;
  originalFileName: string;
  validityStatus: DocumentValidityStatus;
  verificationStatus: DocumentVerificationStatus;
  verifiedByDisplay: string | null;
  verifiedAt: string | null;
  verificationMethod: string;
  comments: string | null;
};

export type BuildRequirementRowsInput = {
  requirements: RequiredDocumentConfig[];
  evidence: DocumentEvidenceRecord[];
  typeNameByCode: Map<string, string>;
  referenceDate?: Date;
};
