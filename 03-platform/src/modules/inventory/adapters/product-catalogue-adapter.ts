/**
 * Purpose:
 * Read existing BP-003 products for inventory configuration. Does not write
 * product, pricing, tax, or sales records.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { ProductRepository } from "@/modules/product/repositories/product-repository";
import type { InventoryProductCataloguePort } from "@/modules/inventory/ports";
import type { InventoryProductRef } from "@/modules/inventory/types";

function mapProduct(row: {
  id: string;
  businessId: string;
  productCode: string;
  productName: string;
  productTypeCode: string;
  isActive: boolean;
}): InventoryProductRef {
  return {
    id: row.id,
    businessId: row.businessId,
    productCode: row.productCode,
    productName: row.productName,
    productTypeCode: row.productTypeCode,
    isActive: row.isActive,
  };
}

export class ProductCatalogueAdapter implements InventoryProductCataloguePort {
  constructor(private readonly products = new ProductRepository()) {}

  async findById(businessId: string, productId: string) {
    const row = await this.products.findByIdIncludingArchived(businessId, productId);
    return row ? mapProduct(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.products.listByBusinessId(businessId, { limit: 200 });
    return rows.map(mapProduct);
  }
}

export function createProductCatalogueAdapter() {
  return new ProductCatalogueAdapter();
}
