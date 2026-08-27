/**
 * Purpose:
 * Public exports for ENG-015 Document Engine (storage slice).
 *
 * Engine:
 * ENG-015 – Document Engine
 */

export { DOCUMENT_ENGINE_ID } from "@/core/document-engine/constants";
export type { DocumentEnginePort } from "@/core/document-engine/ports";
export type {
  StoreFinancialDocumentInput,
  StoredFinancialDocument,
} from "@/core/document-engine/types";
export {
  InProcessDocumentAdapter,
  createInProcessDocumentAdapter,
} from "@/core/document-engine/adapters/in-process-document-adapter";
