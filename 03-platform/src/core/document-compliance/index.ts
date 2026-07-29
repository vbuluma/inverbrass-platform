/**
 * Purpose:
 * Public exports for Core Platform Document & Compliance module.
 */

export {
  COMPLIANCE_DISPLAY_STATUSES,
  COMPLIANCE_REQUIREMENT_STATUSES,
  DEFAULT_VERIFICATION_METHOD_CODE,
  DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES,
  DOCUMENT_VALIDITY_STATUSES,
  DOCUMENT_VERIFICATION_STATUSES,
  VERIFICATION_METHOD_CODES,
} from "@/core/document-compliance/constants";

export type {
  ComplianceDisplayStatus,
  ComplianceRequirementStatus,
  DocumentEvidenceLifecycleStatus,
  DocumentValidityStatus,
  DocumentVerificationStatus,
  VerificationMethodCode,
} from "@/core/document-compliance/constants";

export type {
  BuildRequirementRowsInput,
  ComplianceRequirementRow,
  ComplianceSummary,
  DocumentEvidenceRecord,
  DocumentVerificationRow,
  ResolvedRequirementStatus,
} from "@/core/document-compliance/types";

export {
  buildComplianceSummary,
  buildRequirementRows,
  buildVerificationRows,
  isDocumentExpired,
  resolveRequirementStatus,
  toComplianceDisplayStatus,
} from "@/core/document-compliance/services/compliance-assembler";

export { resolveValidityStatus } from "@/core/document-compliance/services/validity-rules";

export {
  resolvePanelVerificationStatus,
  resolveVerificationMethodCode,
  resolveVerificationMethodDisplay,
  resolveVerificationStatus,
} from "@/core/document-compliance/services/verification-rules";
