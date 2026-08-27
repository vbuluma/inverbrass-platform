/**
 * Purpose:
 * Read BP-001 coarse payment-method enablement flags.
 * creditSalesEnabled is a billing policy, not a tender.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { createBusinessConfigurationRepository } from "@/modules/business/onboarding/repositories/business-configuration-repository";
import { createDefaultConfigurationSettings } from "@/modules/business/onboarding/services/setup-rules";
import type { PaymentEnablementPort } from "@/modules/payments/ports";
import type { PaymentEnablementFlags } from "@/modules/payments/types";

export class BusinessPaymentEnablementAdapter implements PaymentEnablementPort {
  constructor(
    private readonly repository = createBusinessConfigurationRepository()
  ) {}

  async getFlags(businessId: string): Promise<PaymentEnablementFlags> {
    const settings = await this.repository.findSettingsByBusinessId(businessId);
    const paymentMethods =
      settings?.paymentMethods ?? createDefaultConfigurationSettings().paymentMethods;
    return {
      cashEnabled: paymentMethods.cashEnabled,
      mobileMoneyEnabled: paymentMethods.mobileMoneyEnabled,
      bankTransferEnabled: paymentMethods.bankTransferEnabled,
      cardEnabled: paymentMethods.cardEnabled,
      creditSalesEnabled: paymentMethods.creditSalesEnabled,
    };
  }
}

export function createBusinessPaymentEnablementAdapter() {
  return new BusinessPaymentEnablementAdapter();
}
