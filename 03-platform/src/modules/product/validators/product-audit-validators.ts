/**
 * Purpose:
 * Re-export audit list filters schema for product audit actions.
 */

export {
  productAuditListFiltersSchema,
} from "@/modules/product/validators/product-validators";

export type ProductAuditListFiltersInput = {
  operation?: string;
  entityName?: string;
  changedBy?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};
