/**
 * Purpose:
 * Resolve settlement mode from catalogue/configuration, not from
 * hard-coded method, provider, rail, or channel names.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import { SETTLEMENT_MODES } from "@/modules/payments/constants";
import type {
  PaymentCatalogueRepositoryPort,
  SettlementPolicyPort,
} from "@/modules/payments/ports";
import { createPaymentCatalogueRepository } from "@/modules/payments/repositories/payment-catalogue-repository";
import type { SettlementMode } from "@/modules/payments/types";

function configuredMode(value: unknown): SettlementMode | null {
  if (value === SETTLEMENT_MODES.NOT_APPLICABLE) {
    return "NOT_APPLICABLE";
  }
  if (value === SETTLEMENT_MODES.IMMEDIATE) {
    return "IMMEDIATE";
  }
  if (value === SETTLEMENT_MODES.PROVIDER) {
    return "PROVIDER";
  }
  return null;
}

export class CatalogueSettlementPolicyAdapter implements SettlementPolicyPort {
  constructor(private readonly catalogues: PaymentCatalogueRepositoryPort) {}

  async resolveMode(input: {
    businessId: string;
    methodId: string | null;
    channelId: string | null;
    providerId: string | null;
  }): Promise<SettlementMode> {
    void input.businessId;
    const snapshot = await this.catalogues.loadSnapshot();
    const capability =
      input.channelId && input.providerId
        ? snapshot.capabilities.find(
            (row) =>
              row.paymentChannelId === input.channelId &&
              row.paymentProviderId === input.providerId
          )
        : undefined;
    const fromCapability = configuredMode(capability?.metadata?.settlementMode);
    if (fromCapability) {
      return fromCapability;
    }
    const method = snapshot.methods.find((row) => row.id === input.methodId);
    if (method && !method.requiresProvider) {
      return "NOT_APPLICABLE";
    }
    return "PROVIDER";
  }
}

export function createPaymentSettlementPolicyAdapter(
  catalogues: PaymentCatalogueRepositoryPort = createPaymentCatalogueRepository()
): SettlementPolicyPort {
  return new CatalogueSettlementPolicyAdapter(catalogues);
}
