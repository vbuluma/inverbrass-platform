/**
 * Purpose:
 * Process-scoped tax compliance store for workspace actions (IP-11).
 */

import {
  createInMemoryTaxComplianceStore,
  type InMemoryTaxComplianceStore,
} from "@/modules/commercial/tax-compliance/tax-compliance-store";

const globalStore = globalThis as unknown as {
  __taxComplianceStore?: InMemoryTaxComplianceStore;
};

export function getProcessTaxComplianceStore(): InMemoryTaxComplianceStore {
  if (!globalStore.__taxComplianceStore) {
    globalStore.__taxComplianceStore = createInMemoryTaxComplianceStore();
  }
  return globalStore.__taxComplianceStore;
}

export function resetProcessTaxComplianceStoreForTests(): void {
  globalStore.__taxComplianceStore = createInMemoryTaxComplianceStore();
}
