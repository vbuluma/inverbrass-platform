"use client";

/**
 * Purpose:
 * Create a stock adjustment, damage, loss, or return document.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createAdjustmentAction } from "@/modules/inventory/actions/inventory-adjustment-actions";
import { INVENTORY_ADJUSTMENT_TYPES } from "@/modules/inventory/constants";
import type { InventoryLocationView, StockItemListView } from "@/modules/inventory/types";

type AdjustmentCreateFormProps = {
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
};

const TYPE_OPTIONS = [
  { value: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT, label: "Stock adjustment (increase)" },
  { value: INVENTORY_ADJUSTMENT_TYPES.NEGATIVE_ADJUSTMENT, label: "Stock adjustment (decrease)" },
  { value: INVENTORY_ADJUSTMENT_TYPES.DAMAGE, label: "Damaged" },
  { value: INVENTORY_ADJUSTMENT_TYPES.LOSS, label: "Lost" },
  { value: INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN, label: "Customer return" },
  { value: INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN, label: "Supplier return" },
] as const;

export function AdjustmentCreateForm({ stockItems, locations }: AdjustmentCreateFormProps) {
  const router = useRouter();
  const [stockItemId, setStockItemId] = useState(stockItems[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [adjustmentType, setAdjustmentType] = useState<string>(
    INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT
  );
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [originId, setOriginId] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [unitCodes, setUnitCodes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isReturn =
    adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN ||
    adjustmentType === INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN;

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createAdjustmentAction({
        stockItemId,
        locationId,
        adjustmentType,
        quantity,
        reason,
        notes,
        externalReference: externalReference.trim() || null,
        originType: isReturn
          ? adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN
            ? "SALE"
            : "RECEIPT"
          : null,
        originId: originId.trim() || null,
        lotCode: lotCode.trim() || null,
        expiresOn: expiresOn || null,
        unitCodes: unitCodes
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/inventory/adjustments/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/adjustments" label="Adjustments" />
      <h1 className="text-2xl font-semibold">New adjustment</h1>
      <p className="text-sm text-muted-foreground">
        Record damaged, lost, returned, or corrected stock. On-hand quantity changes only after this is posted.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          value={adjustmentType}
          onChange={(event) => setAdjustmentType(event.target.value)}
          className="h-10 rounded-md border px-3"
        >
          {TYPE_OPTIONS.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
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
        Quantity
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="h-10 rounded-md border px-3"
          inputMode="decimal"
          placeholder="1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Reason
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-10 rounded-md border px-3"
          placeholder="Damaged in store"
          autoComplete="off"
        />
      </label>
      {isReturn ? (
        <label className="flex flex-col gap-1 text-sm">
          Original sale or receipt
          <input
            value={originId}
            onChange={(event) => setOriginId(event.target.value)}
            className="h-10 rounded-md border px-3"
            placeholder="Optional origin reference"
            autoComplete="off"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Reference
        <input
          value={externalReference}
          onChange={(event) => setExternalReference(event.target.value)}
          className="h-10 rounded-md border px-3"
          placeholder="Optional reference"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Batch
        <input
          value={lotCode}
          onChange={(event) => setLotCode(event.target.value)}
          className="h-10 rounded-md border px-3"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Expiry
        <input
          type="date"
          value={expiresOn}
          onChange={(event) => setExpiresOn(event.target.value)}
          className="h-10 rounded-md border px-3"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Serials (one per unit, comma or line separated)
        <textarea
          value={unitCodes}
          onChange={(event) => setUnitCodes(event.target.value)}
          className="min-h-20 rounded-md border px-3 py-2"
        />
      </label>
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
        disabled={isPending || !stockItemId || !locationId || !quantity.trim() || !reason.trim()}
      >
        {isPending ? "Saving…" : "Create adjustment"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
