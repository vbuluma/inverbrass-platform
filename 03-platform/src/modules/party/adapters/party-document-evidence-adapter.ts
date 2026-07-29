/**
 * Purpose:
 * Map Party document views to platform-neutral evidence records.
 *
 * Architecture:
 * Party Module → Document & Compliance Core Platform
 *
 * Implementation Package:
 * BP-002 / IP-007 – Documents & Compliance (Party consumer)
 */

import type { DocumentEvidenceRecord } from "@/core/document-compliance/types";
import type { PartyDocumentView } from "@/modules/party/types";

export function mapPartyDocumentsToEvidence(
  documents: PartyDocumentView[]
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
    fileHash: document.fileHash,
    originalFileName: document.originalFileName,
  }));
}
