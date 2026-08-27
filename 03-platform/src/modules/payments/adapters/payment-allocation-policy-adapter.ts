/**
 * Purpose:
 * Default overpayment policy — off unless tests inject an override.
 * Not a provider-specific or hard-coded amount rule.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
 */

import type { PaymentAllocationPolicyPort } from "@/modules/payments/ports";
import type { PaymentAllocationPolicy } from "@/modules/payments/types";

export class ConfigurablePaymentAllocationPolicy implements PaymentAllocationPolicyPort {
  constructor(private readonly allowOverpayment = false) {}

  async getPolicy(businessId: string): Promise<PaymentAllocationPolicy> {
    void businessId;
    return { allowOverpayment: this.allowOverpayment };
  }
}

export function createPaymentAllocationPolicyAdapter(
  allowOverpayment = false
): PaymentAllocationPolicyPort {
  return new ConfigurablePaymentAllocationPolicy(allowOverpayment);
}
