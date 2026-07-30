/**
 * Purpose:
 * ENG-003k Industry Experience Engine — presentation layer on shared platform engines.
 *
 * BP-003 IP-001 introduces static industry profiles for product type visibility and
 * offering catalogue labelling. Full profile metadata arrives with ENG-003k.
 */

export {
  DEFAULT_OFFERING_CATALOGUE_LABEL,
  OFFERING_CATALOGUE_NAV_LABELS,
  resolveOfferingCatalogueNavLabel,
  resolveOfferingCataloguePageTitle,
} from "@/core/industry-experience/offering-terminology";
export type { OfferingMasterRecord } from "@/core/industry-experience/offering-terminology";
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
