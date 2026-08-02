/**
 * ENG-003k — Terminology-aware audit entity and source module labels.
 */

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import {
  AUDIT_ENTITY_LABELS,
  AUDIT_SOURCE_MODULE_LABELS,
  type AuditEntityName,
  type AuditSourceModule,
} from "@/core/audit/constants";

export function resolveAuditEntityLabels(
  terminology: BusinessTerminology
): Record<AuditEntityName, string> {
  const { offerings, categories, variants, bundles, lifecycle, attributes } =
    terminology;

  return {
    ...AUDIT_ENTITY_LABELS,
    product: offerings.singular,
    product_classification: categories.moduleName,
    product_classification_assignment: `${categories.singular} Assignment`,
    product_variant: variants.singular,
    product_variant_attribute: `${variants.singular} Attribute Override`,
    product_bundle: bundles.singular,
    product_bundle_item: `${bundles.singular} Item`,
    product_catalogue_publication: `${terminology.digitalCatalogue.label} Publication`,
    product_lifecycle: `${offerings.singular} Lifecycle`,
    product_attribute_definition: `${attributes.moduleName} Definition`,
    product_attribute_assignment: "Attribute Assignment",
    attribute_group: "Attribute Group",
    offering_document: `${offerings.singular} Document`,
    offering_relationship: `${offerings.singular} Relationship`,
    offering_metric_definition: `${terminology.analytics.moduleName} Definition`,
    offering_governance: terminology.governance.moduleName,
  };
}

export function resolveAuditSourceModuleLabels(
  terminology: BusinessTerminology
): Record<AuditSourceModule, string> {
  const { offerings, lifecycle, governance, analytics } = terminology;

  return {
    ...AUDIT_SOURCE_MODULE_LABELS,
    product_management: `${offerings.plural} Management`,
    product_lifecycle: lifecycle.moduleName,
    offering_documents: `${offerings.plural} Documents`,
    offering_relationships: `${offerings.plural} Relationships`,
    offering_pricing: terminology.pricing.moduleName,
    offering_analytics: analytics.moduleName,
    offering_governance: governance.moduleName,
  };
}

export function localizeAuditEntryLabels<
  T extends {
    entityName: string;
    entityLabel: string;
    sourceModule: string;
    sourceModuleLabel: string;
  },
>(entry: T, terminology: BusinessTerminology): T {
  const entityLabels = resolveAuditEntityLabels(terminology);
  const sourceLabels = resolveAuditSourceModuleLabels(terminology);

  return {
    ...entry,
    entityLabel:
      entityLabels[entry.entityName as AuditEntityName] ?? entry.entityLabel,
    sourceModuleLabel:
      sourceLabels[entry.sourceModule as AuditSourceModule] ??
      entry.sourceModuleLabel,
  };
}
