/**
 * Purpose:
 * ENG-006 Payment Engine ports consumed by BP-007.
 * IP-01 establishes the contract; initiation/query/refund are not executed.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import type {
  CataloguePaymentCandidate,
  EligibleChannelQuery,
  EligiblePaymentOption,
  InitiatePaymentInput,
  NormalizedPaymentOutcome,
  PaymentCapabilities,
  PaymentCapabilityRecord,
  PaymentLimits,
  QueryPaymentInput,
  QuerySettlementInput,
  RefundPaymentInput,
  NormalizedSettlementOutcome,
} from "@/core/payment-engine/types";

export type PaymentCapabilityStorePort = {
  findByProviderAndChannel(
    providerId: string,
    channelId: string
  ): Promise<PaymentCapabilityRecord | null>;
  listByProvider(providerId: string): Promise<PaymentCapabilityRecord[]>;
};

export type PaymentInitiationAdapterPort = {
  initiate(input: InitiatePaymentInput): Promise<NormalizedPaymentOutcome>;
  query(input: QueryPaymentInput): Promise<NormalizedPaymentOutcome>;
  refund(input: RefundPaymentInput): Promise<NormalizedPaymentOutcome>;
  getSettlement(input: QuerySettlementInput): Promise<NormalizedSettlementOutcome>;
};

export type PaymentEnginePort = {
  getEligibleChannels(
    query: EligibleChannelQuery,
    candidates: CataloguePaymentCandidate[]
  ): Promise<EligiblePaymentOption[]>;
  getLimits(providerId: string, channelId: string): Promise<PaymentLimits | null>;
  getCapabilities(
    providerId: string,
    channelId?: string | null
  ): Promise<PaymentCapabilities | null>;
  initiatePayment(input: InitiatePaymentInput): Promise<NormalizedPaymentOutcome>;
  queryPayment(input: QueryPaymentInput): Promise<NormalizedPaymentOutcome>;
  refundPayment(input: RefundPaymentInput): Promise<NormalizedPaymentOutcome>;
  getSettlementDetails(input: QuerySettlementInput): Promise<NormalizedSettlementOutcome>;
};
