"use client";

/**
 * Purpose:
 * Create a stock reservation against available inventory.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createReservationAction } from "@/modules/inventory/actions/inventory-reservation-actions";
import type { InventoryLocationView, StockItemListView } from "@/modules/inventory/types";

type ReservationCreateFormProps = {
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
};

export function ReservationCreateForm({ stockItems, locations }: ReservationCreateFormProps) {
  const router = useRouter();
  const [stockItemId, setStockItemId] = useState(stockItems[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [salesOrderNumber, setSalesOrderNumber] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [salesOrderLineId, setSalesOrderLineId] = useState("");
  const [notes, setNotes] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [unitCodes, setUnitCodes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createReservationAction({
        stockItemId,
        locationId,
        quantity,
        salesOrderId: salesOrderId.trim() || null,
        salesOrderLineId: salesOrderLineId.trim() || null,
        salesOrderNumber: salesOrderNumber.trim() || null,
        notes,
        lotCode: lotCode.trim() || null,
        unitCodes: unitCodes
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/inventory/reservations/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/reservations" label="Reservations" />
      <h1 className="text-2xl font-semibold">New reservation</h1>
      <p className="text-sm text-muted-foreground">
        Reserve available stock for a sale. On-hand quantity does not change until stock is deducted.
      </p>
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
        Sale / Order
        <input
          value={salesOrderNumber}
          onChange={(event) => setSalesOrderNumber(event.target.value)}
          className="h-10 rounded-md border px-3"
          placeholder="Optional order number"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sale reference
        <input
          value={salesOrderId}
          onChange={(event) => setSalesOrderId(event.target.value)}
          className="h-10 rounded-md border px-3"
          placeholder="Optional sale id"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sale line
        <input
          value={salesOrderLineId}
          onChange={(event) => setSalesOrderLineId(event.target.value)}
          className="h-10 rounded-md border px-3"
          placeholder="Optional sale line id"
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
        disabled={isPending || !stockItemId || !locationId || !quantity.trim()}
      >
        {isPending ? "Saving…" : "Create reservation"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
