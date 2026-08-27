/**
 * Purpose:
 * ENG-006 catalogue-backed capability adapter.
 * Reads configured/provider-supplied metadata. Does not call providers.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import {
  PAYMENT_ENGINE_ERROR_CODES,
  PaymentEngineError,
} from "@/core/payment-engine/errors";
import {
  currencySupported,
  isAmountWithinConfiguredLimits,
} from "@/core/payment-engine/limit-rules";
import type {
  PaymentCapabilityStorePort,
  PaymentEnginePort,
  PaymentInitiationAdapterPort,
} from "@/core/payment-engine/ports";
import type {
  CataloguePaymentCandidate,
  EligibleChannelQuery,
  EligiblePaymentOption,
  InitiatePaymentInput,
  NormalizedPaymentOutcome,
  NormalizedSettlementOutcome,
  PaymentCapabilities,
  PaymentLimits,
  QueryPaymentInput,
  QuerySettlementInput,
  RefundPaymentInput,
} from "@/core/payment-engine/types";

function executionUnavailable(): never {
  throw new PaymentEngineError(
    PAYMENT_ENGINE_ERROR_CODES.EXECUTION_NOT_AVAILABLE,
    "Payment execution is not available yet.",
    409
  );
}

function toLimits(
  record: {
    providerId: string;
    channelId: string;
    minAmount: string | null;
    maxAmount: string | null;
    dailyLimit: string | null;
    transactionLimit: string | null;
    supportedCurrencies: string[] | null;
  } | null
): PaymentLimits | null {
  if (!record) {
    return null;
  }
  return {
    providerId: record.providerId,
    channelId: record.channelId,
    minAmount: record.minAmount,
    maxAmount: record.maxAmount,
    dailyLimit: record.dailyLimit,
    transactionLimit: record.transactionLimit,
    supportedCurrencies: record.supportedCurrencies,
  };
}

export class CatalogueCapabilityPaymentEngine implements PaymentEnginePort {
  constructor(
    private readonly store: PaymentCapabilityStorePort,
    private readonly initiation?: PaymentInitiationAdapterPort
  ) {}

  async getLimits(
    providerId: string,
    channelId: string
  ): Promise<PaymentLimits | null> {
    const record = await this.store.findByProviderAndChannel(providerId, channelId);
    return toLimits(record);
  }

  async getCapabilities(
    providerId: string,
    channelId?: string | null
  ): Promise<PaymentCapabilities | null> {
    if (channelId) {
      const record = await this.store.findByProviderAndChannel(providerId, channelId);
      if (!record) {
        return null;
      }
      return {
        providerId: record.providerId,
        channelId: record.channelId,
        supportsInitiation: record.supportsInitiation,
        supportsRefund: record.supportsRefund,
        supportsStatusQuery: record.supportsStatusQuery,
        isAvailable: record.isAvailable,
        limits: toLimits(record),
      };
    }
    const records = await this.store.listByProvider(providerId);
    if (records.length === 0) {
      return null;
    }
    return {
      providerId,
      channelId: null,
      supportsInitiation: records.some((row) => row.supportsInitiation),
      supportsRefund: records.some((row) => row.supportsRefund),
      supportsStatusQuery: records.some((row) => row.supportsStatusQuery),
      isAvailable: records.some((row) => row.isAvailable),
      limits: null,
    };
  }

  async getEligibleChannels(
    query: EligibleChannelQuery,
    candidates: CataloguePaymentCandidate[]
  ): Promise<EligiblePaymentOption[]> {
    const eligible: EligiblePaymentOption[] = [];
    for (const candidate of candidates) {
      if (
        query.methodCode &&
        candidate.methodCode !== query.methodCode.trim()
      ) {
        continue;
      }
      if (!candidate.channelId || !candidate.providerId) {
        eligible.push({
          ...candidate,
          limits: null,
          capabilities: null,
        });
        continue;
      }
      const record = await this.store.findByProviderAndChannel(
        candidate.providerId,
        candidate.channelId
      );
      if (record && !record.isAvailable) {
        continue;
      }
      const limits = toLimits(record);
      if (limits) {
        if (!currencySupported(query.currency, limits.supportedCurrencies)) {
          continue;
        }
        if (
          !isAmountWithinConfiguredLimits({
            amount: query.amount,
            minAmount: limits.minAmount,
            maxAmount: limits.maxAmount,
            transactionLimit: limits.transactionLimit,
          })
        ) {
          continue;
        }
      }
      const capabilities = record
        ? {
            providerId: record.providerId,
            channelId: record.channelId,
            supportsInitiation: record.supportsInitiation,
            supportsRefund: record.supportsRefund,
            supportsStatusQuery: record.supportsStatusQuery,
            isAvailable: record.isAvailable,
            limits,
          }
        : null;
      eligible.push({
        ...candidate,
        limits,
        capabilities,
      });
    }
    return eligible;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<NormalizedPaymentOutcome> {
    if (!this.initiation) {
      return executionUnavailable();
    }
    return this.initiation.initiate(input);
  }

  async queryPayment(input: QueryPaymentInput): Promise<NormalizedPaymentOutcome> {
    if (!this.initiation) {
      return executionUnavailable();
    }
    return this.initiation.query(input);
  }

  async refundPayment(input: RefundPaymentInput): Promise<NormalizedPaymentOutcome> {
    if (!this.initiation) {
      return executionUnavailable();
    }
    return this.initiation.refund(input);
  }

  async getSettlementDetails(input: QuerySettlementInput): Promise<NormalizedSettlementOutcome> {
    if (!this.initiation) {
      return executionUnavailable();
    }
    return this.initiation.getSettlement(input);
  }
}

export function createCatalogueCapabilityPaymentEngine(
  store: PaymentCapabilityStorePort,
  initiation?: PaymentInitiationAdapterPort
): PaymentEnginePort {
  return new CatalogueCapabilityPaymentEngine(store, initiation);
}
