/**
 * Purpose:
 * ENG-003k Industry Experience Engine — presentation layer on shared platform engines.
 *
 * BP-003 IP-001 introduces static industry profiles for product type visibility and
 * offering catalogue labelling. Full profile metadata arrives with ENG-003k.
 */

export {
  DEFAULT_OFFERING_CATALOGUE_LABEL,
  DEFAULT_OFFERING_WORKSPACE_LABEL,
  OFFERING_CATALOGUE_NAV_LABELS,
  OFFERING_WORKSPACE_LABELS,
  resolveOfferingCatalogueNavLabel,
  resolveOfferingCataloguePageTitle,
  resolveOfferingHubTitle,
  resolveOfferingNavLabel,
  resolveOfferingWorkspaceLabel,
} from "@/core/industry-experience/offering-terminology";
export type { OfferingMasterRecord } from "@/core/industry-experience/offering-terminology";
export {
  DEFAULT_BUSINESS_TERMINOLOGY,
  resolveBusinessTerminology,
  resolveBusinessTerminologyFromIndustryId,
} from "@/core/industry-experience/business-terminology";
export type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
export {
  BusinessTerminologyProvider,
  useBusinessTerminology,
} from "@/core/industry-experience/business-terminology-context";
export {
  resolveClassificationLabel,
  resolveClassificationLabelSingular,
} from "@/core/industry-experience/classification-terminology";
export {
  resolveEntityTerminology,
} from "@/core/industry-experience/entity-terminology";
export type { EntityTerminology } from "@/core/industry-experience/entity-terminology";
export {
  resolveOperationsTerminology,
} from "@/core/industry-experience/operations-terminology";
export type { OperationsTerminology } from "@/core/industry-experience/operations-terminology";
export {
  PLATFORM_NAV_LABELS,
  PLATFORM_NAV_OFFERING_LABEL,
  resolvePlatformNavOfferingLabel,
} from "@/core/industry-experience/platform-terminology";
export {
  INDUSTRY_PRODUCT_TYPE_PROFILES,
  filterProductTypesForIndustry,
  listAllProductTypeCodes,
} from "@/core/industry-experience/product-type-filters";
export {
  createIndustryExperienceService,
  IndustryExperienceService,
} from "@/core/industry-experience/services/industry-experience-service";
export type {
  BusinessIndustryContext,
  ProductTypeOption,
} from "@/core/industry-experience/services/industry-experience-service";
