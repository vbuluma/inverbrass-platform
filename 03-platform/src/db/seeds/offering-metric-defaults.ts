/**
 * Purpose:
 * Default offering metric definition templates (seeded per business).
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { OFFERING_METRIC_CATEGORIES } from "@/modules/product/constants";

export type OfferingMetricDefinitionSeed = {
  code: string;
  name: string;
  description: string;
  metricCategory: string;
  calculationMethod: string;
  unitOfMeasure?: string | null;
};

export const defaultOfferingMetricDefinitions: OfferingMetricDefinitionSeed[] = [
  {
    code: "CURRENT_STATUS",
    name: "Current Status",
    description: "Lifecycle status indicator for the offering.",
    metricCategory: OFFERING_METRIC_CATEGORIES.LIFECYCLE,
    calculationMethod: "PLATFORM_DERIVED",
    unitOfMeasure: "STATUS",
  },
  {
    code: "TOTAL_CLASSIFICATIONS",
    name: "Catalogue Assignments",
    description: "Number of classification assignments on the offering.",
    metricCategory: OFFERING_METRIC_CATEGORIES.LIFECYCLE,
    calculationMethod: "PLATFORM_DERIVED",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_PRICES",
    name: "Total Prices",
    description: "Total configured price records for the offering.",
    metricCategory: OFFERING_METRIC_CATEGORIES.COMMERCIAL,
    calculationMethod: "PLATFORM_DERIVED",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_ACTIVE_PRICES",
    name: "Active Prices",
    description: "Currently active price records for the offering.",
    metricCategory: OFFERING_METRIC_CATEGORIES.COMMERCIAL,
    calculationMethod: "PLATFORM_DERIVED",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TIMELINE_EVENTS",
    name: "Timeline Events",
    description: "Total timeline events recorded for the offering.",
    metricCategory: OFFERING_METRIC_CATEGORIES.OPERATIONAL,
    calculationMethod: "PLATFORM_DERIVED",
    unitOfMeasure: "COUNT",
  },
  {
    code: "DAYS_SINCE_UPDATE",
    name: "Days Since Update",
    description: "Days elapsed since the offering was last updated.",
    metricCategory: OFFERING_METRIC_CATEGORIES.OPERATIONAL,
    calculationMethod: "PLATFORM_DERIVED",
    unitOfMeasure: "DAYS",
  },
  {
    code: "TOTAL_VARIANTS",
    name: "Variants",
    description: "Placeholder — populated when variant module is active.",
    metricCategory: OFFERING_METRIC_CATEGORIES.INVENTORY,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_BUNDLES",
    name: "Bundles",
    description: "Placeholder — populated when bundle module is active.",
    metricCategory: OFFERING_METRIC_CATEGORIES.INVENTORY,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_DOCUMENTS",
    name: "Documents",
    description: "Placeholder — populated when document module is active.",
    metricCategory: OFFERING_METRIC_CATEGORIES.COMPLIANCE,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_RELATIONSHIPS",
    name: "Relationships",
    description: "Placeholder — populated when relationship module is active.",
    metricCategory: OFFERING_METRIC_CATEGORIES.CUSTOMER,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_SALES",
    name: "Total Sales",
    description: "Placeholder — populated by Sales Build Pack.",
    metricCategory: OFFERING_METRIC_CATEGORIES.COMMERCIAL,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "COUNT",
  },
  {
    code: "TOTAL_REVENUE",
    name: "Total Revenue",
    description: "Placeholder — populated by Finance / Sales Build Packs.",
    metricCategory: OFFERING_METRIC_CATEGORIES.FINANCIAL,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "CURRENCY",
  },
  {
    code: "ACTIVE_CUSTOMERS",
    name: "Active Customers",
    description: "Placeholder — populated by CRM Build Pack.",
    metricCategory: OFFERING_METRIC_CATEGORIES.CUSTOMER,
    calculationMethod: "EXTERNAL_MODULE",
    unitOfMeasure: "COUNT",
  },
];
