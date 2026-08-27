/**
 * Purpose:
 * ENG-006 payment-engine types consumed by BP-007.
 * No provider SDK types.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export type PaymentCapabilityRecord = {
  providerId: string;
  channelId: string;
  minAmount: string | null;
  maxAmount: string | null;
  dailyLimit: string | null;
  transactionLimit: string | null;
  supportedCurrencies: string[] | null;
  supportsInitiation: boolean;
  supportsRefund: boolean;
  supportsStatusQuery: boolean;
  isAvailable: boolean;
};

export type PaymentLimits = {
  providerId: string;
  channelId: string;
  minAmount: string | null;
  maxAmount: string | null;
  dailyLimit: string | null;
  transactionLimit: string | null;
  supportedCurrencies: string[] | null;
};

export type PaymentCapabilities = {
  providerId: string;
  channelId: string | null;
  supportsInitiation: boolean;
  supportsRefund: boolean;
  supportsStatusQuery: boolean;
  isAvailable: boolean;
  limits: PaymentLimits | null;
};

export type EligibleChannelQuery = {
  businessId: string;
  methodCode?: string | null;
  amount: string;
  currency: string;
};

export type CataloguePaymentCandidate = {
  methodId: string;
  methodCode: string;
  methodName: string;
  customerLabel: string;
  requiresRail: boolean;
  requiresProvider: boolean;
  requiresChannel: boolean;
  railId: string | null;
  railCode: string | null;
  railName: string | null;
  providerId: string | null;
  providerCode: string | null;
  providerName: string | null;
  channelId: string | null;
  channelCode: string | null;
  channelName: string | null;
};

export type EligiblePaymentOption = CataloguePaymentCandidate & {
  limits: PaymentLimits | null;
  capabilities: PaymentCapabilities | null;
};

export type InitiatePaymentInput = {
  businessId: string;
  obligationId: string;
  paymentTransactionId?: string;
  methodId?: string | null;
  networkId?: string | null;
  providerId: string;
  channelId: string;
  amount: string;
  currency: string;
  idempotencyKey?: string;
};

export type NormalizedPaymentOutcomeKind =
  | "ACCEPTED"
  | "PENDING"
  | "SUCCESSFUL"
  | "FAILED"
  | "EXPIRED"
  | "UNKNOWN"
  | "NOT_ACCEPTED";

export type NormalizedPaymentOutcome = {
  outcome: NormalizedPaymentOutcomeKind;
  providerTransactionReference: string | null;
  amount: string | null;
  currency: string | null;
  obligationId?: string | null;
  failureCode: string | null;
  failureReason: string | null;
  metadata?: Record<string, unknown> | null;
};

export type QueryPaymentInput = {
  businessId: string;
  providerId: string;
  providerTransactionReference: string;
  paymentTransactionId?: string;
};

export type RefundPaymentInput = {
  businessId: string;
  providerId: string;
  channelId: string;
  amount: string;
  currency: string;
  originalProviderTransactionReference: string;
  originalPaymentTransactionId?: string;
  idempotencyKey?: string;
};

export type QuerySettlementInput = {
  businessId: string;
  paymentTransactionId: string;
  providerId?: string | null;
  channelId?: string | null;
  providerTransactionReference?: string | null;
  expectedAmount?: string | null;
  currency?: string | null;
};

export type NormalizedSettlementOutcome = {
  settlementStatus:
    | "NOT_APPLICABLE"
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "EXCEPTION";
  expectedAmount: string | null;
  receivedAmount: string | null;
  currency: string | null;
  settlementReference: string | null;
  settlementBatchReference: string | null;
  settlementDate: string | null;
  metadata?: Record<string, unknown> | null;
};
