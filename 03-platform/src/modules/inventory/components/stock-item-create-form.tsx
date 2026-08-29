"use client";

/**
 * Purpose:
 * Create a stock item from an existing catalogue product.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { useState, useTransition } from "react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createStockItemAction } from "@/modules/inventory/actions/inventory-actions";
import type { CatalogueTypeRef, InventoryProductRef, InventoryUnitRef } from "@/modules/inventory/types";

type StockItemCreateFormProps = {
  products: InventoryProductRef[];
  units: InventoryUnitRef[];
  itemTypes: CatalogueTypeRef[];
};

export function StockItemCreateForm({
  products,
  units,
  itemTypes,
}: StockItemCreateFormProps) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [itemTypeCode, setItemTypeCode] = useState(itemTypes[0]?.code ?? "STOCKED_ITEM");
  const [baseUomId, setBaseUomId] = useState(units[0]?.id ?? "");
  const [stockTrackingEnabled, setStockTrackingEnabled] = useState(true);
  const [trackingMode, setTrackingMode] = useState("NONE");
  const [reorderLevel, setReorderLevel] = useState("");
  const [reorderQuantity, setReorderQuantity] = useState("");
  const [minimumStockLevel, setMinimumStockLevel] = useState("");
  const [maximumStockLevel, setMaximumStockLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createStockItemAction({
        productId,
        sku,
        barcode: barcode || null,
        itemTypeCode,
        baseUomId,
        stockTrackingEnabled,
        trackingMode,
        reorderLevel: reorderLevel || null,
        reorderQuantity: reorderQuantity || null,
        minimumStockLevel: minimumStockLevel || null,
        maximumStockLevel: maximumStockLevel || null,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.assign(`/inventory/items/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div>
        <h1 className="text-2xl font-semibold">Add stock item</h1>
        <p className="text-sm text-muted-foreground">
          Link a catalogue product to inventory. This does not move stock.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm">
          Add a product in the catalogue first, then return here.{" "}
          <Link href="/products" className="underline">
            Open catalogue
          </Link>
        </p>
      ) : (
        <div className="grid gap-4 rounded-xl border bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            Product
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              {products.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.productName} ({row.productCode})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            SKU
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className="h-10 rounded-md border px-3"
              placeholder="SKU-001"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Barcode (optional)
            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              className="h-10 rounded-md border px-3"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Item type
            <select
              value={itemTypeCode}
              onChange={(event) => setItemTypeCode(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              {itemTypes.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Base unit
            <select
              value={baseUomId}
              onChange={(event) => setBaseUomId(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              {units.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} — {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stockTrackingEnabled}
              onChange={(event) => setStockTrackingEnabled(event.target.checked)}
            />
            Track stock
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tracking
            <select
              value={trackingMode}
              onChange={(event) => setTrackingMode(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="NONE">Quantity only</option>
              <option value="BATCH">Batch</option>
              <option value="SERIAL">Serial</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Reorder level
              <input
                value={reorderLevel}
                onChange={(event) => setReorderLevel(event.target.value)}
                className="h-10 rounded-md border px-3"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Reorder quantity
              <input
                value={reorderQuantity}
                onChange={(event) => setReorderQuantity(event.target.value)}
                className="h-10 rounded-md border px-3"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Minimum stock
              <input
                value={minimumStockLevel}
                onChange={(event) => setMinimumStockLevel(event.target.value)}
                className="h-10 rounded-md border px-3"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Maximum stock
              <input
                value={maximumStockLevel}
                onChange={(event) => setMaximumStockLevel(event.target.value)}
                className="h-10 rounded-md border px-3"
                autoComplete="off"
              />
            </label>
          </div>
          <button
            type="button"
            className={cn(buttonVariants(), "h-10 w-fit")}
            onClick={onCreate}
            disabled={isPending || !productId || !sku.trim() || !baseUomId}
          >
            {isPending ? "Saving…" : "Save stock item"}
          </button>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </main>
  );
}
