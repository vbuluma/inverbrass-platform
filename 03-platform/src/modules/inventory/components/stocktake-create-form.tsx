"use client";

/**
 * Purpose:
 * Create a physical stocktake for a location or selected items.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createStocktakeAction } from "@/modules/inventory/actions/inventory-stocktake-actions";
import { INVENTORY_STOCKTAKE_SCOPE_TYPES } from "@/modules/inventory/constants";
import type { InventoryLocationView, StockItemListView } from "@/modules/inventory/types";

type StocktakeCreateFormProps = {
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
};

export function StocktakeCreateForm({ stockItems, locations }: StocktakeCreateFormProps) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [scopeType, setScopeType] = useState<string>(INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION);
  const [stockItemId, setStockItemId] = useState(stockItems[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createStocktakeAction({
        locationId,
        scopeType,
        stockItemIds:
          scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM && stockItemId
            ? [stockItemId]
            : undefined,
        scopeGroup:
          scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.GROUP ? "STOCKED_ITEM" : undefined,
        notes,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/inventory/stocktakes/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/stocktakes" label="Stocktakes" />
      <h1 className="text-2xl font-semibold">New stocktake</h1>
      <p className="text-sm text-muted-foreground">
        Choose where to count. System quantities are captured when you start the stocktake.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Location
        <select
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="h-10 rounded-md border px-3"
        >
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Scope
        <select
          value={scopeType}
          onChange={(event) => setScopeType(event.target.value)}
          className="h-10 rounded-md border px-3"
        >
          <option value={INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION}>All items at this location</option>
          <option value={INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM}>Selected item</option>
          <option value={INVENTORY_STOCKTAKE_SCOPE_TYPES.GROUP}>Stocked items</option>
        </select>
      </label>
      {scopeType === INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM ? (
        <label className="flex flex-col gap-1 text-sm">
          Item
          <select
            value={stockItemId}
            onChange={(event) => setStockItemId(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            {stockItems.map((row) => (
              <option key={row.id} value={row.id}>
                {row.sku} · {row.productName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-20 rounded-md border px-3 py-2"
        />
      </label>
      <button
        type="button"
        className={cn(buttonVariants(), "h-10 w-fit")}
        onClick={onCreate}
        disabled={isPending || !locationId}
      >
        {isPending ? "Saving…" : "Create stocktake"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
