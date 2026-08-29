"use client";

/**
 * Purpose:
 * Stock item detail — product link, reorder parameters, locations, opening stock.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  configureStockItemLocationAction,
  recordOpeningStockAction,
  setStockItemActiveAction,
  updateStockItemAction,
} from "@/modules/inventory/actions/inventory-actions";
import type {
  InventoryLocationView,
  StockItemDetailView,
} from "@/modules/inventory/types";

type StockItemDetailProps = {
  item: StockItemDetailView;
  locations: InventoryLocationView[];
};

export function StockItemDetail({ item, locations }: StockItemDetailProps) {
  const [sku, setSku] = useState(item.sku);
  const [barcode, setBarcode] = useState(item.barcode ?? "");
  const [reorderLevel, setReorderLevel] = useState(item.reorderLevel ?? "");
  const [reorderQuantity, setReorderQuantity] = useState(item.reorderQuantity ?? "");
  const [minimumStockLevel, setMinimumStockLevel] = useState(item.minimumStockLevel ?? "");
  const [maximumStockLevel, setMaximumStockLevel] = useState(item.maximumStockLevel ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [locationReorder, setLocationReorder] = useState("");
  const [openingLocationId, setOpeningLocationId] = useState(item.locations[0]?.locationId ?? locations[0]?.id ?? "");
  const [openingQuantity, setOpeningQuantity] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState(item);

  function apply(result: { success: true; data: StockItemDetailView } | { success: false; error: { message: string } }, successMessage: string) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setDetail(result.data);
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateStockItemAction(detail.id, {
        sku,
        barcode: barcode || null,
        reorderLevel: reorderLevel || null,
        reorderQuantity: reorderQuantity || null,
        minimumStockLevel: minimumStockLevel || null,
        maximumStockLevel: maximumStockLevel || null,
      });
      apply(result, "Stock item saved.");
    });
  }

  function onToggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setStockItemActiveAction(detail.id, !detail.isActive);
      apply(result, detail.isActive ? "Stock item deactivated." : "Stock item activated.");
    });
  }

  function onConfigureLocation() {
    setError(null);
    startTransition(async () => {
      const result = await configureStockItemLocationAction({
        stockItemId: detail.id,
        locationId,
        reorderLevelOverride: locationReorder || null,
      });
      apply(result, "Location saved.");
    });
  }

  function onOpeningStock() {
    setError(null);
    startTransition(async () => {
      const result = await recordOpeningStockAction({
        stockItemId: detail.id,
        locationId: openingLocationId,
        quantity: openingQuantity,
      });
      apply(result, "Opening stock recorded.");
      if (result.success) {
        setOpeningQuantity("");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{detail.productName}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.sku} · {detail.itemTypeLabel} · Tracking: {detail.trackingMode} ·{" "}
            {detail.isActive ? "Active" : "Inactive"}
          </p>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          onClick={onToggleActive}
          disabled={isPending}
        >
          {detail.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <p className="text-sm"><span className="text-muted-foreground">Product</span><br />{detail.productName} ({detail.productCode})</p>
        <p className="text-sm"><span className="text-muted-foreground">Tracking</span><br />{detail.stockTrackingEnabled ? "Yes" : "No"}</p>
        <p className="text-sm"><span className="text-muted-foreground">Base unit</span><br />{detail.baseUomCode || "—"}</p>
        <p className="text-sm"><span className="text-muted-foreground">On hand / available</span><br />{detail.totalOnHand} / {detail.totalAvailable}</p>
      </section>

      <section className="grid gap-4 rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Stock item details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            SKU
            <input value={sku} onChange={(event) => setSku(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Barcode
            <input value={barcode} onChange={(event) => setBarcode(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Reorder level
            <input value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Reorder quantity
            <input value={reorderQuantity} onChange={(event) => setReorderQuantity(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Minimum stock
            <input value={minimumStockLevel} onChange={(event) => setMinimumStockLevel(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Maximum stock
            <input value={maximumStockLevel} onChange={(event) => setMaximumStockLevel(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
        </div>
        <button type="button" className={cn(buttonVariants(), "h-10 w-fit")} onClick={onSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save details"}
        </button>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Locations</h2>
        {detail.locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">This item is not enabled at any location yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {detail.locations.map((row) => (
              <li key={row.id} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-4">
                <span className="font-medium">{row.locationName}</span>
                <span>On hand {row.onHand}</span>
                <span>Available {row.available}</span>
                <span>Reorder {row.reorderLevel ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Location
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="h-10 rounded-md border px-3">
              {locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Reorder override
            <input value={locationReorder} onChange={(event) => setLocationReorder(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <button type="button" className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10")} onClick={onConfigureLocation} disabled={isPending || !locationId}>
            Enable at location
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Opening stock</h2>
        <p className="text-sm text-muted-foreground">
          Record the starting quantity. This cannot be overwritten later as a balance edit.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Location
            <select value={openingLocationId} onChange={(event) => setOpeningLocationId(event.target.value)} className="h-10 rounded-md border px-3">
              {detail.locations.map((row) => (
                <option key={row.locationId} value={row.locationId}>
                  {row.locationName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Quantity
            <input value={openingQuantity} onChange={(event) => setOpeningQuantity(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <button type="button" className={cn(buttonVariants(), "mt-6 h-10")} onClick={onOpeningStock} disabled={isPending || !openingQuantity.trim()}>
            Record opening stock
          </button>
        </div>
      </section>

      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
    </main>
  );
}
