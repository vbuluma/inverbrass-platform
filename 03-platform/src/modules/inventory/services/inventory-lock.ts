/**
 * Purpose:
 * In-process exclusive lock for inventory inbound posting concurrency.
 * Copied pattern from platform payment locks — does not import payments.
 * Nested calls for a key already held in the same async context re-enter
 * instead of deadlocking (stocktake posting calls IP-05 under the same
 * availability key).
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { AsyncLocalStorage } from "node:async_hooks";

import type { InventoryLockPort } from "@/modules/inventory/ports";

const chains = new Map<string, Promise<unknown>>();
const heldKeys = new AsyncLocalStorage<Set<string>>();

export class InProcessInventoryLock implements InventoryLockPort {
  async runExclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
    const held = heldKeys.getStore();
    if (held?.has(key)) {
      return work();
    }
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
    const nextHeld = new Set(heldKeys.getStore() ?? []);
    nextHeld.add(key);
    try {
      return await heldKeys.run(nextHeld, work);
    } finally {
      release();
    }
  }
}

export function createInProcessInventoryLock(): InventoryLockPort {
  return new InProcessInventoryLock();
}
