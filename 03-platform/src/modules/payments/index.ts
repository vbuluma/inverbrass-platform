/**
 * Purpose:
 * Public exports for BP-007 Payments, Billing & Receipting (IP-01 foundation).
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export {
  PAYMENTS_BUILD_PACK,
  PAYMENTS_IP,
  PAYMENTS_IP_02,
  PAYMENTS_IP_03,
  PAYMENTS_IP_04,
  PAYMENTS_IP_05,
  PAYMENTS_IP_06,
  PAYMENTS_IP_07,
  PAYMENTS_IP_08,
  PAYMENT_ALLOCATION_STATUS,
  INVOICE_STATUS,
  RECEIPT_STATUS,
  REFUND_STATUS,
  SETTLEMENT_STATUS,
  PAYMENT_EXCEPTION_STATUSES,
  PAYMENT_EXCEPTION_TYPES,
  PAYMENT_EXCEPTION_RESOLUTION_CODES,
  PAYMENT_AUDIT_ACTIONS,
  CREDIT_ENABLEMENT_FLAG,
  PAYMENT_CAPTURE_MODES,
  PAYMENT_IP01_STATUS,
  PAYMENT_OBLIGATION_NUMBER_PREFIX,
  PAYMENT_STATUS_CODES,
  PAYMENT_TRANSACTION_NUMBER_PREFIX,
} from "@/modules/payments/constants";

export {
  PaymentObligationError,
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
} from "@/modules/payments/errors";

export type {
  AdjustAllocationCommand,
  AllocatePaymentCommand,
  ApplyPaymentOutcomeCommand,
  CreateInvoiceCommand,
  InvoiceDashboardView,
  InvoiceDetailView,
  InvoicePaymentTermRecord,
  InvoiceView,
  InitiatePaymentCommand,
  PaymentAllocationResult,
  PaymentAllocationView,
  PaymentDashboardView,
  PaymentInitiationResult,
  PaymentObligationDetailView,
  PaymentObligationView,
  PaymentOptionView,
  PaymentReadyContract,
  PaymentTransactionView,
  ReceiptDashboardView,
  ReceiptDetailView,
  ReceiptView,
  RefundDetailView,
  RefundEligibilityView,
  RefundView,
  SettlementView,
  ReconciliationHandoffPayload,
  PaymentExceptionDashboardView,
  PaymentExceptionDetailView,
  PaymentExceptionView,
} from "@/modules/payments/types";

export {
  PaymentObligationService,
  createDefaultPaymentObligationDependencies,
  createPaymentObligationService,
} from "@/modules/payments/services/payment-obligation-service";

export {
  PaymentAllocationService,
  createDefaultPaymentAllocationDependencies,
  createPaymentAllocationService,
} from "@/modules/payments/services/payment-allocation-service";

export {
  PaymentInitiationService,
  createDefaultPaymentInitiationDependencies,
  createPaymentInitiationService,
} from "@/modules/payments/services/payment-initiation-service";

export {
  PaymentInvoiceService,
  ConfigurableInvoiceClock,
  createDefaultPaymentInvoiceDependencies,
  createPaymentInvoiceService,
} from "@/modules/payments/services/payment-invoice-service";

export {
  PaymentReceiptService,
  createDefaultPaymentReceiptDependencies,
  createPaymentReceiptService,
} from "@/modules/payments/services/payment-receipt-service";

export {
  PaymentRefundService,
  createDefaultPaymentRefundDependencies,
  createPaymentRefundService,
} from "@/modules/payments/services/payment-refund-service";

export {
  PaymentSettlementService,
  createDefaultPaymentSettlementDependencies,
  createPaymentSettlementService,
} from "@/modules/payments/services/payment-settlement-service";

export {
  PaymentExceptionService,
  createDefaultPaymentExceptionDependencies,
  createPaymentExceptionService,
} from "@/modules/payments/services/payment-exception-service";

export {
  billedAmountFromObligation,
  dueDateFromTerm,
  invoiceSettlement,
} from "@/modules/payments/services/payment-invoice-rules";

export {
  assertTrustedPaymentReadyContract,
  copiedAmountDueFromContract,
  copiedCurrencyFromContract,
} from "@/modules/payments/services/payment-obligation-rules";

export { buildCatalogueCandidates } from "@/modules/payments/services/payment-catalogue-rules";

export {
  assertPaymentStatusTransition,
  canTransitionPaymentStatus,
  mapNormalizedOutcomeToStatus,
} from "@/modules/payments/services/payment-lifecycle-rules";
