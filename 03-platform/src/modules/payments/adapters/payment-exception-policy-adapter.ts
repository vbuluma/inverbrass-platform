/**
 * Purpose:
 * Exception monitoring and maker-checker policy from configuration.
 * Not provider-specific and not a hard-coded timeout per rail.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import type { PaymentExceptionPolicyPort } from "@/modules/payments/ports";
import type { PaymentExceptionPolicy } from "@/modules/payments/types";

export class ConfigurablePaymentExceptionPolicy implements PaymentExceptionPolicyPort {
  constructor(
    private readonly pendingTimeoutMs = 15 * 60 * 1000,
    private readonly requiresApproval = false
  ) {}

  async getPolicy(businessId: string): Promise<PaymentExceptionPolicy> {
    void businessId;
    return {
      pendingTimeoutMs: this.pendingTimeoutMs,
      requiresApproval: this.requiresApproval,
    };
  }
}

export function createPaymentExceptionPolicyAdapter(
  pendingTimeoutMs = 15 * 60 * 1000,
  requiresApproval = false
): PaymentExceptionPolicyPort {
  return new ConfigurablePaymentExceptionPolicy(pendingTimeoutMs, requiresApproval);
}
