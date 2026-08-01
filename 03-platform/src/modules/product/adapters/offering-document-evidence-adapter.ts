/**
 * Purpose:
 * Map Offering document views to platform-neutral evidence records.
 *
 * Architecture:
 * Product Module → Document & Compliance Core Platform
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import type { DocumentEvidenceRecord } from "@/core/document-compliance/types";
import type { OfferingDocumentView } from "@/modules/product/types";

type OfferingDocumentEvidenceSource = OfferingDocumentView & {
  fileHash?: string | null;
};

export function mapOfferingDocumentsToEvidence(
  documents: OfferingDocumentEvidenceSource[]
): DocumentEvidenceRecord[] {
  return documents.map((document) => ({
    id: document.id,
    documentTypeCode: document.documentTypeCode,
    issueDate: document.issueDate,
    expiryDate: document.expiryDate,
    lifecycleStatusCode: document.statusCode,
    isVerified: document.isVerified,
    verificationMethodCode: document.verificationMethodCode,
    verifiedBy: document.verifiedBy,
    verifiedAt: document.verifiedAt,
    notes: document.notes,
    fileHash: document.fileHash ?? null,
    originalFileName: document.originalFileName,
  }));
}
