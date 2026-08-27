/**
 * Purpose:
 * Public exports for ENG-006 Payment Engine foundation.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export { PAYMENT_ENGINE_ID, PAYMENT_ENGINE_OPERATIONS } from "@/core/payment-engine/constants";
export type { PaymentEngineOperation } from "@/core/payment-engine/constants";
export {
  PAYMENT_ENGINE_ERROR_CODES,
  PaymentEngineError,
} from "@/core/payment-engine/errors";
export type { PaymentEngineErrorCode } from "@/core/payment-engine/errors";
export type {
  PaymentCapabilityStorePort,
  PaymentEnginePort,
  PaymentInitiationAdapterPort,
} from "@/core/payment-engine/ports";
export type {
  CataloguePaymentCandidate,
  EligibleChannelQuery,
  EligiblePaymentOption,
  InitiatePaymentInput,
  NormalizedPaymentOutcome,
  NormalizedPaymentOutcomeKind,
  PaymentCapabilities,
  PaymentCapabilityRecord,
  PaymentLimits,
  QueryPaymentInput,
  QuerySettlementInput,
  NormalizedSettlementOutcome,
  RefundPaymentInput,
} from "@/core/payment-engine/types";
export {
  addPaymentAmounts,
  comparePaymentAmount,
  currencySupported,
  formatScaledPaymentAmount,
  isAmountWithinConfiguredLimits,
  isPositivePaymentAmount,
  parsePaymentAmount,
  subtractPaymentAmounts,
} from "@/core/payment-engine/limit-rules";
export {
  CatalogueCapabilityPaymentEngine,
  createCatalogueCapabilityPaymentEngine,
} from "@/core/payment-engine/adapters/catalogue-capability-adapter";
export {
  InProcessPaymentInitiationAdapter,
  createInProcessPaymentInitiationAdapter,
} from "@/core/payment-engine/adapters/in-process-initiation-adapter";
export { ScriptedPaymentInitiationAdapter } from "@/core/payment-engine/adapters/scripted-initiation-adapter";
