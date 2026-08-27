/**
 * Purpose:
 * Idempotent seed runner for BP-007 payment catalogues and capability metadata.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { paymentChannel } from "@/db/schema/payment-channel";
import { paymentChannelCapability } from "@/db/schema/payment-channel-capability";
import { paymentMethod } from "@/db/schema/payment-method";
import { paymentNetwork } from "@/db/schema/payment-network";
import { paymentProvider } from "@/db/schema/payment-provider";
import { paymentChannelCapabilities } from "@/db/seeds/payment-channel-capabilities";
import { paymentChannels } from "@/db/seeds/payment-channels";
import { paymentMethods } from "@/db/seeds/payment-methods";
import { paymentNetworks } from "@/db/seeds/payment-networks";
import { paymentProviders } from "@/db/seeds/payment-providers";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

function emptyCounts(): SeedCounts {
  return { inserted: 0, updated: 0, skipped: 0 };
}

export async function seedPaymentCatalogues(
  db: PostgresJsDatabase
): Promise<{
  methods: SeedCounts;
  networks: SeedCounts;
  providers: SeedCounts;
  channels: SeedCounts;
  capabilities: SeedCounts;
}> {
  const methods = emptyCounts();
  const methodIds = new Map<string, string>();

  for (const row of paymentMethods) {
    const [existing] = await db
      .select({ id: paymentMethod.id })
      .from(paymentMethod)
      .where(eq(paymentMethod.code, row.code))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(paymentMethod)
        .values(row)
        .returning({ id: paymentMethod.id });
      if (inserted) {
        methodIds.set(row.code, inserted.id);
      }
      methods.inserted += 1;
      continue;
    }

    await db
      .update(paymentMethod)
      .set({
        name: row.name,
        customerLabel: row.customerLabel,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        requiresRail: row.requiresRail,
        requiresProvider: row.requiresProvider,
        requiresChannel: row.requiresChannel,
        enablementFlag: row.enablementFlag,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethod.id, existing.id));
    methodIds.set(row.code, existing.id);
    methods.updated += 1;
  }

  const networks = emptyCounts();
  const networkIds = new Map<string, string>();

  for (const row of paymentNetworks) {
    const methodId = methodIds.get(row.paymentMethodCode);
    if (!methodId) {
      networks.skipped += 1;
      continue;
    }
    const [existing] = await db
      .select({ id: paymentNetwork.id })
      .from(paymentNetwork)
      .where(eq(paymentNetwork.code, row.code))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(paymentNetwork)
        .values({
          paymentMethodId: methodId,
          code: row.code,
          name: row.name,
          customerLabel: row.customerLabel,
          description: row.description,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
        })
        .returning({ id: paymentNetwork.id });
      if (inserted) {
        networkIds.set(row.code, inserted.id);
      }
      networks.inserted += 1;
      continue;
    }

    await db
      .update(paymentNetwork)
      .set({
        paymentMethodId: methodId,
        name: row.name,
        customerLabel: row.customerLabel,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(paymentNetwork.id, existing.id));
    networkIds.set(row.code, existing.id);
    networks.updated += 1;
  }

  const providers = emptyCounts();
  const providerIds = new Map<string, string>();

  for (const row of paymentProviders) {
    const networkId = networkIds.get(row.paymentNetworkCode);
    if (!networkId) {
      providers.skipped += 1;
      continue;
    }
    const [existing] = await db
      .select({ id: paymentProvider.id })
      .from(paymentProvider)
      .where(eq(paymentProvider.code, row.code))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(paymentProvider)
        .values({
          paymentNetworkId: networkId,
          code: row.code,
          name: row.name,
          description: row.description,
          integrationRef: row.integrationRef,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
        })
        .returning({ id: paymentProvider.id });
      if (inserted) {
        providerIds.set(row.code, inserted.id);
      }
      providers.inserted += 1;
      continue;
    }

    await db
      .update(paymentProvider)
      .set({
        paymentNetworkId: networkId,
        name: row.name,
        description: row.description,
        integrationRef: row.integrationRef,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(paymentProvider.id, existing.id));
    providerIds.set(row.code, existing.id);
    providers.updated += 1;
  }

  const channels = emptyCounts();
  const channelIds = new Map<string, { id: string; providerId: string }>();

  for (const row of paymentChannels) {
    const providerId = providerIds.get(row.paymentProviderCode);
    if (!providerId) {
      channels.skipped += 1;
      continue;
    }
    const [existing] = await db
      .select({ id: paymentChannel.id })
      .from(paymentChannel)
      .where(eq(paymentChannel.code, row.code))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(paymentChannel)
        .values({
          paymentProviderId: providerId,
          code: row.code,
          name: row.name,
          customerLabel: row.customerLabel,
          description: row.description,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
        })
        .returning({ id: paymentChannel.id });
      if (inserted) {
        channelIds.set(row.code, { id: inserted.id, providerId });
      }
      channels.inserted += 1;
      continue;
    }

    await db
      .update(paymentChannel)
      .set({
        paymentProviderId: providerId,
        name: row.name,
        customerLabel: row.customerLabel,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(paymentChannel.id, existing.id));
    channelIds.set(row.code, { id: existing.id, providerId });
    channels.updated += 1;
  }

  const capabilities = emptyCounts();

  for (const row of paymentChannelCapabilities) {
    const channel = channelIds.get(row.paymentChannelCode);
    if (!channel) {
      capabilities.skipped += 1;
      continue;
    }
    const [existing] = await db
      .select({ id: paymentChannelCapability.id })
      .from(paymentChannelCapability)
      .where(eq(paymentChannelCapability.paymentChannelId, channel.id))
      .limit(1);

    const values = {
      paymentChannelId: channel.id,
      paymentProviderId: channel.providerId,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      dailyLimit: row.dailyLimit,
      transactionLimit: row.transactionLimit,
      supportedCurrencies: row.supportedCurrencies,
      supportsInitiation: row.supportsInitiation,
      supportsRefund: row.supportsRefund,
      supportsStatusQuery: row.supportsStatusQuery,
      isAvailable: row.isAvailable,
      updatedAt: new Date(),
    };

    if (!existing) {
      await db.insert(paymentChannelCapability).values(values);
      capabilities.inserted += 1;
      continue;
    }

    await db
      .update(paymentChannelCapability)
      .set(values)
      .where(eq(paymentChannelCapability.id, existing.id));
    capabilities.updated += 1;
  }

  return { methods, networks, providers, channels, capabilities };
}
