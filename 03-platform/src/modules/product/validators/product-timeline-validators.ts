/**
 * Purpose:
 * Re-export timeline list filters schema for product timeline actions.
 */

export {
  productTimelineListFiltersSchema,
} from "@/modules/product/validators/product-validators";

export type ProductTimelineListFiltersInput = {
  category?: string;
  sourceModule?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};
