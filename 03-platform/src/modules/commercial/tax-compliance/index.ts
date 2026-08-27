/**
 * Purpose:
 * Public barrel for BP-005 IP-11 tax compliance.
 */

export * from "@/modules/commercial/tax-compliance/tax-compliance-constants";
export * from "@/modules/commercial/tax-compliance/tax-compliance-types";
export * from "@/modules/commercial/tax-compliance/tax-compliance-rules";
export * from "@/modules/commercial/tax-compliance/kenya-reference-config";
export {
  createInMemoryTaxComplianceStore,
  InMemoryTaxComplianceStore,
  type TaxComplianceStore,
} from "@/modules/commercial/tax-compliance/tax-compliance-store";
export {
  TaxComplianceService,
  createTaxComplianceService,
} from "@/modules/commercial/tax-compliance/tax-compliance-service";
export {
  getProcessTaxComplianceStore,
  resetProcessTaxComplianceStoreForTests,
} from "@/modules/commercial/tax-compliance/tax-compliance-process-store";
