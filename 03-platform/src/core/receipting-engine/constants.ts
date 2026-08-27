/**
 * Purpose:
 * ENG-007 Receipting Engine identifiers. Produces financial documents;
 * does not own payment capture or refunds.
 *
 * Engine:
 * ENG-007 – Receipting Engine
 */

export const RECEIPTING_ENGINE_ID = "ENG-007";

export const RECEIPTING_DOCUMENT_TYPES = {
  INVOICE: "INVOICE",
  RECEIPT: "RECEIPT",
  REFUND: "REFUND",
} as const;

export const RECEIPTING_DOCUMENT_STATES = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
} as const;
