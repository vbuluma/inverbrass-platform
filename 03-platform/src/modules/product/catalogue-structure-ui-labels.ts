/**
 * Purpose:
 * User-facing labels for Catalogue Structure — no database terminology.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 *
 * Note: Internal tables remain product_classification*. UI uses business language.
 *
 * @deprecated Prefer `buildCatalogueStructureUiLabels()` from `@/modules/product/product-terminology-labels`.
 */

export const CATALOGUE_STRUCTURE_UI_LABELS = {
  moduleName: "Catalogue Structure",
  moduleShortName: "Catalogue",
  dashboardTitle: "Catalogue Structure",
  dashboardSubtitle: "Define how your catalogue is organised — categories, hierarchy, and assignments.",
  workspaceLabel: "Catalogue Structure Workspace",
  hierarchyHeading: "Hierarchy",
  categoriesHeading: "Categories",
  assignmentsHeading: "Assignments",
  primaryAssignment: "Primary Category",
  additionalAssignments: "Additional Categories",
  assignCategory: "Assign Category",
  childNodesHeading: "Child Categories",
  breadcrumbRoot: "Catalogue",
  metricsProducts: "Products",
  metricsActiveProducts: "Active Products",
  metricsArchivedProducts: "Archived Products",
  metricsChildren: "Children",
  metricsDepth: "Depth",
  metricsLastModified: "Last Modified",
  metricsParent: "Parent",
  nodeType: "Structure Type",
  industryVisibility: "Industry Visibility",
  industryAll: "All Industries",
  governanceHeading: "Governance",
  responsibleOwner: "Responsible Business Owner",
  businessUnit: "Business Unit",
  effectiveFrom: "Effective From",
  effectiveTo: "Effective To",
  approvalStatus: "Approval Status",
  reasonForChange: "Reason for Change",
  icon: "Icon",
  timelineHeading: "Structure Timeline",
  backToCatalogue: "Back to catalogue structure",
  backToProducts: "Back to products",
} as const;

/** Reserved bulk operation extension points — not implemented in IP-002. */
export const CATALOGUE_STRUCTURE_BULK_OPERATIONS = {
  ASSIGN_PRODUCTS: "ASSIGN_PRODUCTS",
  MOVE_SUBTREE: "MOVE_SUBTREE",
  DEACTIVATE_SUBTREE: "DEACTIVATE_SUBTREE",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
} as const;

/** Reserved relationship types for IP-012 — schema ready, UI not implemented. */
export const CATALOGUE_STRUCTURE_RELATIONSHIP_TYPES = {
  ACCESSORY_OF: "ACCESSORY_OF",
  REPLACEMENT_FOR: "REPLACEMENT_FOR",
  COMPATIBLE_WITH: "COMPATIBLE_WITH",
  UPSELL: "UPSELL",
  CROSS_SELL: "CROSS_SELL",
  CAN_BE_SOLD_TOGETHER: "CAN_BE_SOLD_TOGETHER",
} as const;

export const CATALOGUE_STRUCTURE_RELATIONSHIP_LABELS: Record<
  keyof typeof CATALOGUE_STRUCTURE_RELATIONSHIP_TYPES,
  string
> = {
  ACCESSORY_OF: "Accessory Of",
  REPLACEMENT_FOR: "Replacement For",
  COMPATIBLE_WITH: "Compatible With",
  UPSELL: "Upsell",
  CROSS_SELL: "Cross Sell",
  CAN_BE_SOLD_TOGETHER: "Can Be Sold Together",
};
