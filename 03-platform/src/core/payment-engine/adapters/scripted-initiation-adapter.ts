/**
 * Purpose:
 * Test-only ENG-006 initiation adapter. Returns scripted normalized
 * outcomes. Does not call external providers.
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

export class ScriptedPaymentInitiationAdapter implements PaymentInitiationAdapterPort {
  nextInitiate: NormalizedPaymentOutcome | ((input: InitiatePaymentInput) => NormalizedPaymentOutcome);
  nextQuery: NormalizedPaymentOutcome | ((input: QueryPaymentInput) => NormalizedPaymentOutcome);
  nextRefund: NormalizedPaymentOutcome | ((input: RefundPaymentInput) => NormalizedPaymentOutcome);
  nextSettlement:
    | NormalizedSettlementOutcome
    | ((input: QuerySettlementInput) => NormalizedSettlementOutcome);
  readonly initiateCalls: InitiatePaymentInput[] = [];
  readonly queryCalls: QueryPaymentInput[] = [];
  readonly refundCalls: RefundPaymentInput[] = [];
  readonly settlementCalls: QuerySettlementInput[] = [];

  constructor(initial?: Partial<NormalizedPaymentOutcome>) {
    this.nextInitiate = {
      outcome: "ACCEPTED",
      providerTransactionReference: "prov-ref-1",
      amount: null,
      currency: null,
      obligationId: null,
      failureCode: null,
      failureReason: null,
      ...initial,
    };
    this.nextQuery = {
      outcome: "UNKNOWN",
      providerTransactionReference: null,
      amount: null,
      currency: null,
      obligationId: null,
      failureCode: null,
      failureReason: null,
    };
    this.nextRefund = {
      outcome: "SUCCESSFUL",
      providerTransactionReference: "prov-refund-1",
      amount: null,
      currency: null,
      obligationId: null,
      failureCode: null,
      failureReason: null,
    };
    this.nextSettlement = {
      settlementStatus: "PENDING",
      expectedAmount: null,
      receivedAmount: null,
      currency: null,
      settlementReference: null,
      settlementBatchReference: null,
      settlementDate: null,
    };
  }

  async initiate(input: InitiatePaymentInput): Promise<NormalizedPaymentOutcome> {
    this.initiateCalls.push(input);
    const next =
      typeof this.nextInitiate === "function"
        ? this.nextInitiate(input)
        : this.nextInitiate;
    return {
      ...next,
      amount: next.amount ?? input.amount,
      currency: next.currency ?? input.currency,
      obligationId: next.obligationId ?? input.obligationId,
    };
  }

  async query(input: QueryPaymentInput): Promise<NormalizedPaymentOutcome> {
    this.queryCalls.push(input);
    const next =
      typeof this.nextQuery === "function" ? this.nextQuery(input) : this.nextQuery;
    return {
      ...next,
      providerTransactionReference:
        next.providerTransactionReference ?? input.providerTransactionReference,
    };
  }

  async refund(input: RefundPaymentInput): Promise<NormalizedPaymentOutcome> {
    this.refundCalls.push(input);
    const next =
      typeof this.nextRefund === "function" ? this.nextRefund(input) : this.nextRefund;
    return {
      ...next,
      amount: next.amount ?? input.amount,
      currency: next.currency ?? input.currency,
      providerTransactionReference:
        next.providerTransactionReference ??
        `prov-refund-${input.originalPaymentTransactionId ?? input.idempotencyKey ?? "1"}`,
    };
  }

  async getSettlement(input: QuerySettlementInput): Promise<NormalizedSettlementOutcome> {
    this.settlementCalls.push(input);
    const next =
      typeof this.nextSettlement === "function"
        ? this.nextSettlement(input)
        : this.nextSettlement;
    return {
      ...next,
      expectedAmount: next.expectedAmount ?? input.expectedAmount ?? null,
      currency: next.currency ?? input.currency ?? null,
    };
  }
}
