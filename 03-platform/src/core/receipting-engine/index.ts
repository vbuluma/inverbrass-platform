/**
 * Purpose:
 * Public exports for ENG-007 Receipting Engine (financial document production).
 *
 * Engine:
 * ENG-007 – Receipting Engine
 */

export {
  RECEIPTING_DOCUMENT_STATES,
  RECEIPTING_DOCUMENT_TYPES,
  RECEIPTING_ENGINE_ID,
} from "@/core/receipting-engine/constants";
export type { ReceiptingEnginePort } from "@/core/receipting-engine/ports";
export type {
  FinancialDocumentHandle,
  ProduceFinancialDocumentInput,
} from "@/core/receipting-engine/types";
export {
  InProcessReceiptingAdapter,
  createInProcessReceiptingAdapter,
} from "@/core/receipting-engine/adapters/in-process-receipting-adapter";
