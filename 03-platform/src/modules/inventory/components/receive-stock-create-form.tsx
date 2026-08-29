"use client";

/**
 * Purpose:
 * Create a stock receipt against a destination location.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createReceiptAction } from "@/modules/inventory/actions/inventory-inbound-actions";
import type { InventoryLocationView, InventorySupplierRef } from "@/modules/inventory/types";

type ReceiveStockCreateFormProps = {
  locations: InventoryLocationView[];
  suppliers: InventorySupplierRef[];
};

export function ReceiveStockCreateForm({ locations, suppliers }: ReceiveStockCreateFormProps) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [supplierPartyId, setSupplierPartyId] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createReceiptAction({
        locationId,
        supplierPartyId: supplierPartyId || null,
        supplierReference,
        deliveryNumber,
        notes,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/inventory/receive/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/receive" label="Receive stock" />
      <h1 className="text-2xl font-semibold">New stock receipt</h1>
      <div className="grid gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Destination location
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
          Supplier
          <select
            value={supplierPartyId}
            onChange={(event) => setSupplierPartyId(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            <option value="">Not recorded</option>
            {suppliers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Supplier reference
          <input
            value={supplierReference}
            onChange={(event) => setSupplierReference(event.target.value)}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Delivery number
          <input
            value={deliveryNumber}
            onChange={(event) => setDeliveryNumber(event.target.value)}
            className="h-10 rounded-md border px-3"
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
      </div>
      <button
        type="button"
        className={cn(buttonVariants(), "h-10 w-fit")}
        onClick={onCreate}
        disabled={isPending || !locationId}
      >
        {isPending ? "Saving…" : "Create receipt"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
