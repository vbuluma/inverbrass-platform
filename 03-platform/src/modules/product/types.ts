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
