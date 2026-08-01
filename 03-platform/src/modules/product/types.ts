/**
 * Purpose:
 * Product Foundation view and payload types.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type { ProductTimelinePanelView } from "@/core/product-timeline";
import type {
  ProductRecordSourceCode,
  ProductStatusCode,
  ProductTypeCode,
} from "@/modules/product/constants";

export type ReferenceOption = {
  code: string;
  name: string;
  description?: string | null;
};

export type ProductSummaryView = {
  id: string;
  productCode: string;
  productName: string;
  shortName: string | null;
  productTypeCode: ProductTypeCode | string;
  productTypeName: string;
  statusCode: ProductStatusCode | string;
  statusName: string;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  recordSource: ProductRecordSourceCode | string;
  recordSourceLabel: string;
  updatedAt: string;
  createdAt: string;
};

export type ProductDetailView = ProductSummaryView & {
  description: string | null;
  defaultCurrency: string | null;
  launchDate: string | null;
  retirementDate: string | null;
  isSellable: boolean;
  isPurchasable: boolean;
  isBookable: boolean;
  isRentable: boolean;
  isSubscription: boolean;
  isDigital: boolean;
  isActive: boolean;
  legacyCode: string | null;
  legacySystem: string | null;
  migrationDate: string | null;
  migrationBatch: string | null;
  metadata: Record<string, unknown> | null;
  version: number;
};

export type ProductDashboardView = {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  discontinuedProducts: number;
  suspendedProducts: number;
  archivedProducts: number;
  recentlyUpdated: ProductSummaryView[];
  statusSummary: Array<{ statusCode: string; statusName: string; count: number }>;
  typeSummary: Array<{ typeCode: string; typeName: string; count: number }>;
  /** Industry-native catalogue label from ENG-003k static profile */
  catalogueLabel: string;
  industryCode: string | null;
  industryName: string | null;
};

export type ProductRegistrationCatalogues = {
  productTypes: ReferenceOption[];
  productStatuses: ReferenceOption[];
  currencies: ReferenceOption[];
  ownerParties: Array<{ id: string; displayName: string; partyNumber: string }>;
  recordSources: ReferenceOption[];
  catalogueLabel: string;
  industryCode: string | null;
  industryName: string | null;
};

export type CreateProductPayload = {
  productCode: string;
  productName: string;
  shortName?: string;
  description?: string;
  productTypeCode: string;
  ownerPartyId?: string;
  defaultCurrency?: string;
  launchDate?: string;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isBookable?: boolean;
  isRentable?: boolean;
  isSubscription?: boolean;
  isDigital?: boolean;
  recordSource?: string;
  legacyCode?: string;
  legacySystem?: string;
  migrationBatch?: string;
};

export type UpdateProductPayload = {
  productName?: string;
  shortName?: string;
  description?: string;
  ownerPartyId?: string | null;
  defaultCurrency?: string | null;
  launchDate?: string | null;
  retirementDate?: string | null;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isBookable?: boolean;
  isRentable?: boolean;
  isSubscription?: boolean;
  isDigital?: boolean;
};

export type ProductListFilters = {
  search?: string;
  statusCode?: string;
  productTypeCode?: string;
  recordSource?: string;
  limit?: number;
  offset?: number;
};

export type ProductListView = {
  products: ProductSummaryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};

export type ProductAuditHistoryEntryView = {
  id: string;
  changedDateTime: string;
  changedByName: string | null;
  operation: string;
  operationLabel: string;
  entityName: string;
  entityLabel: string;
  entityId: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  sourceModule: string;
  sourceModuleLabel: string;
  correlationId: string | null;
  systemGenerated: boolean;
  metadata: Record<string, unknown> | null;
};

export type ProductAuditHistoryPanelView = {
  entries: ProductAuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: {
    operations: Array<{ code: string; label: string }>;
    entities: Array<{ code: string; label: string }>;
    users: Array<{ id: string; name: string }>;
  };
};

export type { ProductTimelinePanelView };

export type ProductClassificationView = {
  id: string;
  businessId: string;
  parentClassificationId: string | null;
  parentName: string | null;
  code: string;
  name: string;
  description: string | null;
  classificationTypeCode: string;
  classificationTypeName: string;
  industryCode: string | null;
  industryName: string | null;
  icon: string | null;
  displayOrder: number;
  hierarchyLevel: number;
  status: string;
  statusLabel: string;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  businessUnit: string | null;
  effectiveDate: string | null;
  effectiveTo: string | null;
  retirementDate: string | null;
  approvalStatus: string;
  approvalStatusLabel: string;
  reasonForChange: string | null;
  childCount: number;
  assignedProductCount: number;
  activeProductCount: number;
  archivedProductCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ProductClassificationBreadcrumbItem = {
  id: string;
  name: string;
  code: string;
  icon: string | null;
};

export type ProductClassificationTreeNode = ProductClassificationView & {
  children: ProductClassificationTreeNode[];
};

export type ProductClassificationAssignmentView = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  classificationId: string;
  classificationCode: string;
  classificationName: string;
  isPrimary: boolean;
  effectiveDate: string | null;
  retirementDate: string | null;
};

export type ProductClassificationDashboardView = {
  totalClassifications: number;
  activeClassifications: number;
  draftClassifications: number;
  suspendedClassifications: number;
  archivedClassifications: number;
  deprecatedClassifications: number;
  rootClassifications: number;
  maxDepth: number;
  tree: ProductClassificationTreeNode[];
  recentlyUpdated: ProductClassificationView[];
  catalogueLabel: string;
  industryCode: string | null;
  industryName: string | null;
  classificationTypes: ReferenceOption[];
  industries: ReferenceOption[];
};

export type ProductClassificationWorkspaceView = {
  classification: ProductClassificationView;
  children: ProductClassificationView[];
  tree: ProductClassificationTreeNode[];
  breadcrumbPath: ProductClassificationBreadcrumbItem[];
  assignedProducts: ProductClassificationAssignmentView[];
  parentOptions: Array<{ id: string; label: string }>;
  classificationTypes: ReferenceOption[];
  ownerParties: Array<{ id: string; displayName: string }>;
  summary: {
    childCount: number;
    assignedProductCount: number;
    activeProductCount: number;
    archivedProductCount: number;
    descendantCount: number;
    hierarchyDepth: number;
    lastModified: string;
    parentLabel: string | null;
  };
  timeline: import("@/core/product-classification-timeline").ClassificationTimelinePanelView;
};

export type ProductClassificationPanelView = {
  assignments: ProductClassificationAssignmentView[];
  primaryClassification: ProductClassificationAssignmentView | null;
  additionalClassifications: ProductClassificationAssignmentView[];
  availableClassifications: Array<{ id: string; code: string; name: string }>;
};

export type CreateProductClassificationPayload = {
  code: string;
  name: string;
  description?: string;
  classificationTypeCode?: string;
  industryCode?: string | null;
  icon?: string | null;
  parentClassificationId?: string | null;
  displayOrder?: number;
  effectiveDate?: string;
  effectiveTo?: string | null;
  ownerPartyId?: string | null;
  businessUnit?: string | null;
  approvalStatus?: string;
  reasonForChange?: string;
};

export type UpdateProductClassificationPayload = {
  name?: string;
  description?: string | null;
  classificationTypeCode?: string;
  industryCode?: string | null;
  icon?: string | null;
  displayOrder?: number;
  effectiveDate?: string | null;
  effectiveTo?: string | null;
  ownerPartyId?: string | null;
  businessUnit?: string | null;
  approvalStatus?: string;
  reasonForChange?: string | null;
};

export type MoveProductClassificationPayload = {
  parentClassificationId: string | null;
  displayOrder?: number;
};

export type SearchProductClassificationsPayload = {
  query?: string;
  status?: string;
  classificationTypeCode?: string;
  industryCode?: string;
  parentClassificationId?: string | null;
};

export type AssignProductClassificationPayload = {
  classificationId: string;
  isPrimary?: boolean;
  effectiveDate?: string;
};

export type SetPrimaryClassificationPayload = {
  assignmentId: string;
};

/** BP-003 / IP-003 — Units of Measure */

export type UnitCategoryView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  baseUnitId: string | null;
  baseUnitName: string | null;
  baseUnitSymbol: string | null;
  status: string;
  unitCount: number;
};

export type UnitView = {
  id: string;
  businessId: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  code: string;
  name: string;
  symbol: string;
  conversionFactor: string;
  decimalPrecision: number;
  roundingRule: string;
  roundingRuleLabel: string;
  isBaseUnit: boolean;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type UnitDashboardView = {
  totalUnits: number;
  activeUnits: number;
  categoryCount: number;
  recentlyUpdated: UnitView[];
  categories: UnitCategoryView[];
  units: UnitView[];
  roundingRules: Array<{ code: string; label: string }>;
  catalogueLabel: string;
};

export type UnitRegistrationCataloguesView = {
  categories: Array<{ id: string; code: string; name: string }>;
  roundingRules: Array<{ code: string; label: string }>;
  defaultStatus: string;
};

export type UnitWorkspaceView = {
  unit: UnitView;
  categoryUnits: UnitView[];
  conversionExamples: Array<{
    targetUnitId: string;
    targetUnitName: string;
    targetUnitSymbol: string;
    description: string;
  }>;
  timeline: import("@/core/unit-timeline").UnitTimelinePanelView;
  audit: UnitAuditHistoryPanelView;
};

export type UnitConversionResultView = {
  fromUnitId: string;
  toUnitId: string;
  inputValue: number;
  convertedValue: number;
  fromSymbol: string;
  toSymbol: string;
};

export type UnitAuditHistoryPanelView = {
  entries: import("@/core/audit/types").AuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: import("@/core/audit/types").AuditHistoryFilterOptions;
};

export type CreateUnitPayload = {
  categoryId: string;
  code: string;
  name: string;
  symbol: string;
  isBaseUnit?: boolean;
  conversionFactor: number;
  decimalPrecision?: number;
  roundingRule?: string;
  status?: string;
};

export type UpdateUnitPayload = {
  name?: string;
  symbol?: string;
  conversionFactor?: number;
  decimalPrecision?: number;
  roundingRule?: string;
  isBaseUnit?: boolean;
  status?: string;
};

export type SearchUnitsPayload = {
  query?: string;
  status?: string;
  categoryId?: string;
};

export type ConvertUnitsPayload = {
  fromUnitId: string;
  toUnitId: string;
  value: number;
};

// ---------------------------------------------------------------------------
// BP-003 / IP-004 – Product Attributes Engine
// ---------------------------------------------------------------------------

export type AttributeGroupView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  status: string;
  statusLabel: string;
  definitionCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type AttributeDefinitionView = {
  id: string;
  attributeGroupId: string;
  groupCode: string;
  groupName: string;
  code: string;
  name: string;
  description: string | null;
  dataType: string;
  dataTypeLabel: string;
  validationRule: Record<string, unknown> | null;
  defaultValue: string | null;
  displayOrder: number;
  isMandatory: boolean;
  isReadOnly: boolean;
  isHidden: boolean;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type AttributeOptionView = {
  id: string;
  optionCode: string;
  optionLabel: string;
  displayOrder: number;
  status: string;
  version: number;
};

export type AttributeScopeView = {
  id: string;
  scopeType: string;
  productTypeCode: string | null;
  classificationId: string | null;
  displayOrder: number;
};

export type AttributeDashboardView = {
  totalGroups: number;
  totalAttributes: number;
  activeAttributes: number;
  archivedAttributes: number;
  recentlyUpdated: AttributeDefinitionView[];
  groups: AttributeGroupView[];
  definitions: AttributeDefinitionView[];
  dataTypes: Array<{ code: string; label: string }>;
  catalogueLabel: string;
  industryCode: string | null;
};

export type AttributeGroupWorkspaceView = {
  group: AttributeGroupView;
  definitions: AttributeDefinitionView[];
  timeline: import("@/core/attribute-timeline").AttributeTimelinePanelView;
  audit: AttributeAuditHistoryPanelView;
};

export type AttributeDefinitionWorkspaceView = {
  definition: AttributeDefinitionView;
  options: AttributeOptionView[];
  scopes: AttributeScopeView[];
  productTypes: ReferenceOption[];
  classifications: Array<{ id: string; code: string; name: string }>;
  timeline: import("@/core/attribute-timeline").AttributeTimelinePanelView;
  audit: AttributeAuditHistoryPanelView;
};

export type ProductAttributeFieldView = {
  definition: AttributeDefinitionView;
  options: AttributeOptionView[];
  value: unknown;
  assignmentId: string | null;
  version: number | null;
};

export type ProductAttributesPanelView = {
  productId: string;
  groups: Array<{
    group: AttributeGroupView;
    fields: ProductAttributeFieldView[];
  }>;
};

export type AttributeAuditHistoryPanelView = {
  entries: import("@/core/audit/types").AuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: import("@/core/audit/types").AuditHistoryFilterOptions;
};

export type CreateAttributeGroupPayload = {
  code: string;
  name: string;
  description?: string;
  displayOrder?: number;
  status?: string;
};

export type UpdateAttributeGroupPayload = Partial<CreateAttributeGroupPayload>;

export type CreateAttributeDefinitionPayload = {
  attributeGroupId: string;
  code: string;
  name: string;
  description?: string;
  dataType: string;
  validationRule?: Record<string, unknown>;
  defaultValue?: string | null;
  displayOrder?: number;
  isMandatory?: boolean;
  isReadOnly?: boolean;
  isHidden?: boolean;
  status?: string;
};

export type UpdateAttributeDefinitionPayload = Partial<
  Omit<CreateAttributeDefinitionPayload, "attributeGroupId">
>;

export type CreateAttributeOptionPayload = {
  optionCode: string;
  optionLabel: string;
  displayOrder?: number;
  status?: string;
};

export type UpdateAttributeOptionPayload = Partial<CreateAttributeOptionPayload>;

export type AssignAttributeScopePayload =
  | {
      attributeDefinitionId: string;
      scopeType: "PRODUCT_TYPE";
      productTypeCode: string;
      displayOrder?: number;
    }
  | {
      attributeDefinitionId: string;
      scopeType: "CLASSIFICATION";
      classificationId: string;
      displayOrder?: number;
    };

export type SaveProductAttributeValuesPayload = {
  values: Record<string, unknown>;
};

export type SearchAttributesPayload = {
  query?: string;
  groupId?: string;
  productTypeCode?: string;
  classificationId?: string;
  status?: string;
};

export type SearchProductsByAttributePayload = {
  attributeCode: string;
  attributeValue: unknown;
};

// ---------------------------------------------------------------------------
// BP-003 / IP-005 – Product Variants Engine
// ---------------------------------------------------------------------------

export type ProductVariantView = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  variantCode: string;
  variantName: string;
  status: string;
  statusLabel: string;
  displayOrder: number;
  recordSource: string;
  combinationFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ProductVariantAttributeView = {
  id: string;
  attributeDefinitionId: string;
  attributeCode: string;
  attributeName: string;
  dataType: string;
  value: unknown;
  version: number;
};

export type VariantDashboardView = {
  totalVariants: number;
  activeVariants: number;
  draftVariants: number;
  archivedVariants: number;
  parentOfferingCount: number;
  recentlyUpdated: ProductVariantView[];
  variants: ProductVariantView[];
  variantLabel: string;
  catalogueLabel: string;
  industryCode: string | null;
};

export type VariantRegistrationCataloguesView = {
  products: Array<{ id: string; productCode: string; productName: string }>;
  attributeFields: ProductAttributeFieldView[];
  defaultStatus: string;
  variantLabel: string;
};

export type VariantWorkspaceView = {
  variant: ProductVariantView;
  attributes: ProductVariantAttributeView[];
  attributeFields: ProductAttributeFieldView[];
  timeline: import("@/core/variant-timeline").VariantTimelinePanelView;
  audit: VariantAuditHistoryPanelView;
};

export type ProductVariantsPanelView = {
  productId: string;
  variantLabel: string;
  variants: ProductVariantView[];
  attributeFields: ProductAttributeFieldView[];
};

export type VariantAuditHistoryPanelView = {
  entries: import("@/core/audit/types").AuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: import("@/core/audit/types").AuditHistoryFilterOptions;
};

export type CreateVariantPayload = {
  productId: string;
  variantCode: string;
  variantName: string;
  displayOrder?: number;
  status?: string;
  recordSource?: string;
  attributes: Array<{ attributeDefinitionId: string; value: unknown }>;
};

export type UpdateVariantPayload = {
  variantName?: string;
  displayOrder?: number;
  status?: string;
  attributes?: Array<{ attributeDefinitionId: string; value: unknown }>;
};

export type CloneVariantPayload = {
  variantCode?: string;
  variantName?: string;
};

export type SearchVariantsPayload = {
  query?: string;
  productId?: string;
  status?: string;
  attributeCode?: string;
  attributeValue?: unknown;
};

// ---------------------------------------------------------------------------
// BP-003 / IP-006 – Bundles & Packages Engine
// ---------------------------------------------------------------------------

export type ProductBundleView = {
  id: string;
  bundleCode: string;
  bundleName: string;
  bundleType: string;
  bundleTypeLabel: string;
  statusCode: string;
  statusLabel: string;
  ownerPartyId: string | null;
  description: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  pricingStrategy: string;
  pricingStrategyLabel: string;
  availabilityType: string;
  availabilityTypeLabel: string;
  itemCount: number;
  recordSource: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ProductBundleItemView = {
  id: string;
  bundleId: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string | null;
  variantCode: string | null;
  variantName: string | null;
  quantity: number;
  mandatory: boolean;
  displayOrder: number;
  version: number;
};

export type BundleDashboardView = {
  totalBundles: number;
  activeBundles: number;
  draftBundles: number;
  archivedBundles: number;
  recentlyUpdated: ProductBundleView[];
  bundles: ProductBundleView[];
  bundleLabel: string;
  industryCode: string | null;
};

export type BundleRegistrationCataloguesView = {
  bundleTypes: Array<{ code: string; label: string }>;
  pricingStrategies: Array<{ code: string; label: string }>;
  availabilityTypes: Array<{ code: string; label: string }>;
  defaultStatus: string;
  bundleLabel: string;
};

export type BundleWorkspaceView = {
  bundle: ProductBundleView;
  items: ProductBundleItemView[];
  timeline: import("@/core/bundle-timeline").BundleTimelinePanelView;
  audit: BundleAuditHistoryPanelView;
};

export type ProductBundlesPanelView = {
  productId: string;
  bundleLabel: string;
  bundles: ProductBundleView[];
};

export type BundleAuditHistoryPanelView = {
  entries: import("@/core/audit/types").AuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: import("@/core/audit/types").AuditHistoryFilterOptions;
};

export type CreateBundlePayload = {
  bundleCode: string;
  bundleName: string;
  bundleType: string;
  statusCode?: string;
  ownerPartyId?: string | null;
  description?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  pricingStrategy?: string;
  availabilityType?: string;
  recordSource?: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    mandatory?: boolean;
    displayOrder?: number;
  }>;
};

export type UpdateBundlePayload = {
  bundleName?: string;
  bundleType?: string;
  statusCode?: string;
  ownerPartyId?: string | null;
  description?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  pricingStrategy?: string;
  availabilityType?: string;
};

export type AddBundleItemPayload = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  mandatory?: boolean;
  displayOrder?: number;
};

export type UpdateBundleItemPayload = {
  quantity?: number;
  mandatory?: boolean;
  displayOrder?: number;
};

export type SearchBundlesPayload = {
  query?: string;
  statusCode?: string;
  ownerPartyId?: string;
  productId?: string;
};

export type BundleProductSearchResult = {
  id: string;
  productCode: string;
  productName: string;
  productTypeCode: string;
  statusCode: string;
};

// ---------------------------------------------------------------------------
// BP-003 / IP-007 – Digital Catalogue Engine
// ---------------------------------------------------------------------------

export type CatalogueChannelView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
};

export type CataloguePublicationView = {
  id: string | null;
  channelId: string;
  channelCode: string;
  channelName: string;
  published: boolean;
  visibility: string;
  visibilityLabel: string;
  publishFrom: string | null;
  publishTo: string | null;
  featured: boolean;
  recommended: boolean;
  qrEnabled: boolean;
  qrSlug: string | null;
  version: number;
  isLive: boolean;
};

export type CatalogueDashboardView = {
  publishedProductCount: number;
  unpublishedActiveCount: number;
  scheduledPublicationCount: number;
  featuredCount: number;
  channelCount: number;
  catalogueLabel: string;
  industryCode: string | null;
  entries: CatalogueDashboardEntryView[];
};

export type CatalogueDashboardEntryView = {
  productId: string;
  productCode: string;
  productName: string;
  productTypeCode: string;
  statusCode: string;
  publishedChannelCount: number;
  featuredChannelCount: number;
  updatedAt: string;
};

export type CatalogueWorkspaceView = {
  productId: string;
  productCode: string;
  productName: string;
  productDescription: string | null;
  productTypeCode: string;
  statusCode: string;
  statusLabel: string;
  catalogueLabel: string;
  channels: CatalogueChannelView[];
  publications: CataloguePublicationView[];
  publishable: boolean;
};

export type ProductCataloguePanelView = {
  productId: string;
  catalogueLabel: string;
  publishable: boolean;
  publications: CataloguePublicationView[];
  workspaceHref: string;
};

export type UpsertPublicationPayload = {
  channelCode: string;
  published: boolean;
  visibility?: string;
  publishFrom?: string | null;
  publishTo?: string | null;
  featured?: boolean;
  recommended?: boolean;
  qrEnabled?: boolean;
  qrSlug?: string | null;
};

export type SearchCataloguePayload = {
  query?: string;
  channelCode?: string;
  visibility?: string;
  productTypeCode?: string;
  publishedOnly?: boolean;
  featuredOnly?: boolean;
};

export type PublishedCatalogueProductView = {
  productId: string;
  productCode: string;
  productName: string;
  productTypeCode: string;
  channelCode: string;
  visibility: string;
  featured: boolean;
  recommended: boolean;
};

