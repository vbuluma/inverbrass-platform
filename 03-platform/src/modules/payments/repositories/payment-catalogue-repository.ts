/**
 * Purpose:
 * Load payment catalogues and capability metadata.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { getDb } from "@/db/client";
import { paymentChannel } from "@/db/schema/payment-channel";
import { paymentChannelCapability } from "@/db/schema/payment-channel-capability";
import { paymentMethod } from "@/db/schema/payment-method";
import { paymentNetwork } from "@/db/schema/payment-network";
import { paymentProvider } from "@/db/schema/payment-provider";
import type { PaymentCapabilityStorePort } from "@/core/payment-engine/ports";
import type { PaymentCapabilityRecord } from "@/core/payment-engine/types";
import type {
  PaymentCatalogueRepositoryPort,
  PaymentCatalogueSnapshot,
} from "@/modules/payments/ports";

function asString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

export class PaymentCatalogueRepository implements PaymentCatalogueRepositoryPort {
  constructor(private readonly db = getDb()) {}

  async loadSnapshot(): Promise<PaymentCatalogueSnapshot> {
    const [methods, networks, providers, channels, capabilities] = await Promise.all([
      this.db.select().from(paymentMethod),
      this.db.select().from(paymentNetwork),
      this.db.select().from(paymentProvider),
      this.db.select().from(paymentChannel),
      this.db.select().from(paymentChannelCapability),
    ]);

    return {
      methods: methods.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        customerLabel: row.customerLabel,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        requiresRail: row.requiresRail,
        requiresProvider: row.requiresProvider,
        requiresChannel: row.requiresChannel,
        enablementFlag: row.enablementFlag,
      })),
      networks: networks.map((row) => ({
        id: row.id,
        paymentMethodId: row.paymentMethodId,
        code: row.code,
        name: row.name,
        description: row.description,
        customerLabel: row.customerLabel,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })),
      providers: providers.map((row) => ({
        id: row.id,
        paymentNetworkId: row.paymentNetworkId,
        code: row.code,
        name: row.name,
        description: row.description,
        integrationRef: row.integrationRef,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })),
      channels: channels.map((row) => ({
        id: row.id,
        paymentProviderId: row.paymentProviderId,
        code: row.code,
        name: row.name,
        description: row.description,
        customerLabel: row.customerLabel,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })),
      capabilities: capabilities.map((row) => ({
        id: row.id,
        paymentChannelId: row.paymentChannelId,
        paymentProviderId: row.paymentProviderId,
        minAmount: asString(row.minAmount),
        maxAmount: asString(row.maxAmount),
        dailyLimit: asString(row.dailyLimit),
        transactionLimit: asString(row.transactionLimit),
        supportedCurrencies: row.supportedCurrencies,
        supportsInitiation: row.supportsInitiation,
        supportsRefund: row.supportsRefund,
        supportsStatusQuery: row.supportsStatusQuery,
        isAvailable: row.isAvailable,
        metadata: row.metadata ?? null,
      })),
    };
  }
}

export class PaymentCapabilityStoreAdapter implements PaymentCapabilityStorePort {
  constructor(private readonly catalogues: PaymentCatalogueRepositoryPort) {}

  private async records(): Promise<PaymentCapabilityRecord[]> {
    const snapshot = await this.catalogues.loadSnapshot();
    return snapshot.capabilities.map((row) => ({
      providerId: row.paymentProviderId,
      channelId: row.paymentChannelId,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      dailyLimit: row.dailyLimit,
      transactionLimit: row.transactionLimit,
      supportedCurrencies: row.supportedCurrencies,
      supportsInitiation: row.supportsInitiation,
      supportsRefund: row.supportsRefund,
      supportsStatusQuery: row.supportsStatusQuery,
      isAvailable: row.isAvailable,
    }));
  }

  async findByProviderAndChannel(providerId: string, channelId: string) {
    const records = await this.records();
    return (
      records.find(
        (row) => row.providerId === providerId && row.channelId === channelId
      ) ?? null
    );
  }

  async listByProvider(providerId: string) {
    const records = await this.records();
    return records.filter((row) => row.providerId === providerId);
  }
}

export function createPaymentCatalogueRepository() {
  return new PaymentCatalogueRepository();
}

export function createPaymentCapabilityStoreAdapter(
  catalogues: PaymentCatalogueRepositoryPort = createPaymentCatalogueRepository()
) {
  return new PaymentCapabilityStoreAdapter(catalogues);
}
