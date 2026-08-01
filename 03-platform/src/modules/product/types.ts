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

/** IP-008 — Product Lifecycle */
export type ProductLifecycleEventView = {
  id: string;
  eventType: string;
  oldState: string | null;
  newState: string | null;
  reason: string | null;
  performedAt: string;
};

export type ProductLifecyclePanelView = {
  lifecycleId: string;
  productId: string;
  currentState: string;
  previousState: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  approvalRequired: boolean;
  approvalStatus: string | null;
  retirementReason: string | null;
  replacementProductId: string | null;
  replacementProductName: string | null;
  replacementProductCode: string | null;
  versionNumber: string;
  majorVersion: number;
  minorVersion: number;
  scheduledAction: string | null;
  scheduledAt: string | null;
  availableActions: string[];
  events: ProductLifecycleEventView[];
  isReadOnly: boolean;
};

export type ProductLifecycleDashboardView = {
  kpis: Array<{ state: string; count: number }>;
  recentlyChanged: Array<{
    productId: string;
    productCode: string;
    productName: string;
    currentState: string;
    versionNumber: string;
    updatedAt: string;
  }>;
};

export type SetReplacementProductPayload = {
  replacementProductId: string;
  retirementReason?: string;
};

export type ScheduleLifecycleActionPayload = {
  scheduledAction: string;
  scheduledAt: string;
};

/** IP-009 — Offering Documents */
export type OfferingDocumentView = {
  id: string;
  documentTypeCode: string;
  documentTypeName: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeDisplay: string;
  issueDate: string | null;
  expiryDate: string | null;
  statusCode: string;
  isVerified: boolean;
  verificationMethodCode: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  uploadedAt: string;
  supersedesDocumentId: string | null;
};

export type OfferingDocumentRequirementView = {
  documentTypeCode: string;
  documentTypeName: string;
  isRequired: boolean;
  status: string;
  offeringDocumentId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
};

export type OfferingComplianceSummaryView = {
  complianceScore: number;
  complianceStatus: string;
  countryCode: string;
  countryName: string;
  ruleSetCode: string | null;
  ruleSetName: string | null;
  mandatoryCount: number;
  uploadedCount: number;
  missingCount: number;
  expiredCount: number;
  verifiedCount: number;
};

export type OfferingDocumentsPanelView = {
  documents: OfferingDocumentView[];
  documentTypes: ReferenceOption[];
  requiredDocuments: OfferingDocumentRequirementView[];
  complianceSummary: OfferingComplianceSummaryView;
  verifications: Array<{
    offeringDocumentId: string;
    documentTypeName: string;
    originalFileName: string;
    verificationStatus: string;
    verifiedByDisplay: string | null;
    verifiedAt: string | null;
    verificationMethodName: string | null;
  }>;
  summaryCards: {
    totalDocuments: number;
    verified: number;
    pending: number;
    expired: number;
    complianceScore: number;
  };
};

export type UploadOfferingDocumentMetadata = {
  documentTypeCode: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
};

export type VerifyOfferingDocumentPayload = {
  verificationMethodCode?: string;
  notes?: string;
};

/** IP-010 — Offering Relationships */
export type OfferingRelationshipView = {
  id: string;
  sourceOfferingId: string;
  targetOfferingId: string;
  relatedOfferingId: string;
  relatedOfferingCode: string;
  relatedOfferingName: string;
  relationshipTypeCode: string;
  relationshipTypeName: string;
  direction: "OUTGOING" | "INCOMING";
  effectiveFrom: string;
  effectiveTo: string | null;
  statusCode: string;
  notes: string | null;
};

export type OfferingRelationshipsPanelView = {
  relationships: OfferingRelationshipView[];
  availableRelationshipTypes: ReferenceOption[];
  sections: {
    required: OfferingRelationshipView[];
    optional: OfferingRelationshipView[];
    crossSell: OfferingRelationshipView[];
    upgradePath: OfferingRelationshipView[];
    alternatives: OfferingRelationshipView[];
    compatibility: OfferingRelationshipView[];
    dependencies: OfferingRelationshipView[];
  };
};

export type AddOfferingRelationshipPayload = {
  targetOfferingId: string;
  relationshipTypeCode: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
};

export type UpdateOfferingRelationshipPayload = {
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
};
