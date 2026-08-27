/**
 * Purpose:
 * In-process ENG-006 initiation adapter for environments without an
 * external provider adapter. Returns accepted/pending — never success.
 * Does not call external providers.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import type { PaymentInitiationAdapterPort } from "@/core/payment-engine/ports";
import type {
  InitiatePaymentInput,
  NormalizedPaymentOutcome,
  NormalizedSettlementOutcome,
  QueryPaymentInput,
  QuerySettlementInput,
  RefundPaymentInput,
} from "@/core/payment-engine/types";

export class InProcessPaymentInitiationAdapter implements PaymentInitiationAdapterPort {
  async initiate(input: InitiatePaymentInput): Promise<NormalizedPaymentOutcome> {
    const reference = `eng006:${input.paymentTransactionId ?? input.idempotencyKey ?? input.obligationId}`;
    return {
      outcome: "ACCEPTED",
      providerTransactionReference: reference,
      amount: input.amount,
      currency: input.currency,
      obligationId: input.obligationId,
      failureCode: null,
      failureReason: null,
      metadata: { source: "in-process" },
    };
  }

  async query(input: QueryPaymentInput): Promise<NormalizedPaymentOutcome> {
    return {
      outcome: "UNKNOWN",
      providerTransactionReference: input.providerTransactionReference,
      amount: null,
      currency: null,
      obligationId: null,
      failureCode: null,
      failureReason: null,
      metadata: { source: "in-process" },
    };
  }

  async refund(input: RefundPaymentInput): Promise<NormalizedPaymentOutcome> {
    const reference = `eng006-refund:${input.originalPaymentTransactionId ?? input.idempotencyKey ?? input.originalProviderTransactionReference}`;
    return {
      outcome: "ACCEPTED",
      providerTransactionReference: reference,
      amount: input.amount,
      currency: input.currency,
      obligationId: null,
      failureCode: null,
      failureReason: null,
      metadata: { source: "in-process" },
    };
  }

  async getSettlement(input: QuerySettlementInput): Promise<NormalizedSettlementOutcome> {
    return {
      settlementStatus: "PENDING",
      expectedAmount: input.expectedAmount ?? null,
      receivedAmount: null,
      currency: input.currency ?? null,
      settlementReference: null,
      settlementBatchReference: null,
      settlementDate: null,
      metadata: { source: "in-process" },
    };
  }
}

export function createInProcessPaymentInitiationAdapter(): PaymentInitiationAdapterPort {
  return new InProcessPaymentInitiationAdapter();
}
