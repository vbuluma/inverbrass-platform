/**
 * Purpose:
 * Process-scoped commercial governance store singleton for workspace actions.
 * Schema tables (commercial_*) are migrated for durable storage readiness;
 * the synchronous service API uses this in-process store. Smoke tests inject
 * a fresh InMemoryCommercialGovernanceStore.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

import {
  createInMemoryCommercialGovernanceStore,
  type InMemoryCommercialGovernanceStore,
} from "@/modules/commercial/services/commercial-governance-store";

const globalStore = globalThis as unknown as {
  __commercialGovernanceStore?: InMemoryCommercialGovernanceStore;
};

export function getProcessCommercialGovernanceStore(): InMemoryCommercialGovernanceStore {
  if (!globalStore.__commercialGovernanceStore) {
    globalStore.__commercialGovernanceStore =
      createInMemoryCommercialGovernanceStore();
  }
  return globalStore.__commercialGovernanceStore;
}

export function resetProcessCommercialGovernanceStoreForTests(): void {
  globalStore.__commercialGovernanceStore =
    createInMemoryCommercialGovernanceStore();
}
