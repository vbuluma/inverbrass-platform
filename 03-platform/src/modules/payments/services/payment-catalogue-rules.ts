/**
 * Purpose:
 * Data-driven catalogue eligibility. Inactive records are excluded.
 * Method enablement uses configured flag names — not provider codes.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import type { CataloguePaymentCandidate } from "@/core/payment-engine/types";
import { CREDIT_ENABLEMENT_FLAG } from "@/modules/payments/constants";
import type { PaymentCatalogueSnapshot } from "@/modules/payments/ports";
import type {
  PaymentEnablementFlags,
  PaymentMethodRecord,
} from "@/modules/payments/types";

export function isCreditTender(method: Pick<PaymentMethodRecord, "code" | "enablementFlag">): boolean {
  return (
    method.enablementFlag === CREDIT_ENABLEMENT_FLAG ||
    method.code.trim().toUpperCase() === "CREDIT"
  );
}

export function isMethodEnabledByPolicy(
  method: PaymentMethodRecord,
  flags: PaymentEnablementFlags
): boolean {
  if (isCreditTender(method)) {
    return false;
  }
  if (!method.enablementFlag) {
    return true;
  }
  if (method.enablementFlag === CREDIT_ENABLEMENT_FLAG) {
    return false;
  }
  const value = (flags as Record<string, boolean | undefined>)[method.enablementFlag];
  return value === true;
}

export function buildCatalogueCandidates(
  snapshot: PaymentCatalogueSnapshot,
  flags: PaymentEnablementFlags
): CataloguePaymentCandidate[] {
  const methods = snapshot.methods
    .filter((method) => method.isActive)
    .filter((method) => !isCreditTender(method))
    .filter((method) => isMethodEnabledByPolicy(method, flags))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const networks = snapshot.networks.filter((row) => row.isActive);
  const providers = snapshot.providers.filter((row) => row.isActive);
  const channels = snapshot.channels.filter((row) => row.isActive);

  const candidates: CataloguePaymentCandidate[] = [];

  for (const method of methods) {
    const customerLabel = method.customerLabel?.trim() || method.name;
    if (!method.requiresRail) {
      candidates.push({
        methodId: method.id,
        methodCode: method.code,
        methodName: method.name,
        customerLabel,
        requiresRail: false,
        requiresProvider: false,
        requiresChannel: false,
        railId: null,
        railCode: null,
        railName: null,
        providerId: null,
        providerCode: null,
        providerName: null,
        channelId: null,
        channelCode: null,
        channelName: null,
      });
      continue;
    }

    const methodRails = networks.filter((row) => row.paymentMethodId === method.id);
    for (const rail of methodRails) {
      const railProviders = providers.filter(
        (row) => row.paymentNetworkId === rail.id
      );
      if (method.requiresProvider && railProviders.length === 0) {
        continue;
      }
      for (const provider of railProviders) {
        const providerChannels = channels.filter(
          (row) => row.paymentProviderId === provider.id
        );
        if (method.requiresChannel && providerChannels.length === 0) {
          continue;
        }
        if (!method.requiresChannel && providerChannels.length === 0) {
          candidates.push({
            methodId: method.id,
            methodCode: method.code,
            methodName: method.name,
            customerLabel: rail.customerLabel?.trim() || customerLabel,
            requiresRail: true,
            requiresProvider: method.requiresProvider,
            requiresChannel: false,
            railId: rail.id,
            railCode: rail.code,
            railName: rail.name,
            providerId: provider.id,
            providerCode: provider.code,
            providerName: provider.name,
            channelId: null,
            channelCode: null,
            channelName: null,
          });
          continue;
        }
        for (const channel of providerChannels) {
          candidates.push({
            methodId: method.id,
            methodCode: method.code,
            methodName: method.name,
            customerLabel:
              channel.customerLabel?.trim() ||
              rail.customerLabel?.trim() ||
              customerLabel,
            requiresRail: true,
            requiresProvider: true,
            requiresChannel: true,
            railId: rail.id,
            railCode: rail.code,
            railName: rail.name,
            providerId: provider.id,
            providerCode: provider.code,
            providerName: provider.name,
            channelId: channel.id,
            channelCode: channel.code,
            channelName: channel.name,
          });
        }
      }
    }
  }

  return candidates;
}
