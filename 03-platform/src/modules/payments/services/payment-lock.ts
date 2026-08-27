/**
 * Purpose:
 * In-process exclusive lock for allocation concurrency. Serializes
 * allocate/adjust for the same obligation and payment transaction.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
 */

import type { PaymentLockPort } from "@/modules/payments/ports";

const chains = new Map<string, Promise<unknown>>();

export class InProcessPaymentLock implements PaymentLockPort {
  async runExclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = chains.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    chains.set(
      key,
      previous.then(
        () => current,
        () => current
      )
    );
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }
}

export function createInProcessPaymentLock(): PaymentLockPort {
  return new InProcessPaymentLock();
}
