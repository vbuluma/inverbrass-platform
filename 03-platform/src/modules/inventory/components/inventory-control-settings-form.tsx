"use client";

/**
 * Purpose:
 * Configure item or location stock-control thresholds.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveControlChangeAction,
  rejectControlChangeAction,
  saveInventoryControlSettingsAction,
} from "@/modules/inventory/actions/inventory-control-actions";
import type {
  InventoryControlChangeRecord,
  InventoryControlPositionView,
  InventoryLocationView,
  StockItemDetailView,
} from "@/modules/inventory/types";

type InventoryControlSettingsFormProps = {
  item: StockItemDetailView;
  locations: InventoryLocationView[];
  positions: InventoryControlPositionView[];
  pendingChanges: InventoryControlChangeRecord[];
  selectedLocationId: string;
};

export function InventoryControlSettingsForm({
  item,
  locations,
  positions,
  pendingChanges,
  selectedLocationId,
}: InventoryControlSettingsFormProps) {
  const router = useRouter();
  const position = positions.find((row) => row.locationId === selectedLocationId) ?? positions[0];
  const [locationId, setLocationId] = useState(selectedLocationId || position?.locationId || "");
  const [minimumStock, setMinimumStock] = useState(item.minimumStockLevel ?? "");
  const [reorderLevel, setReorderLevel] = useState(item.reorderLevel ?? "");
  const [maximumStock, setMaximumStock] = useState(item.maximumStockLevel ?? "");
  const [reorderQuantity, setReorderQuantity] = useState(item.reorderQuantity ?? "");
  const [safetyStock, setSafetyStock] = useState(item.safetyStock ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveInventoryControlSettingsAction({
        stockItemId: item.id,
        locationId: locationId || null,
        minimumStock: minimumStock || null,
        reorderLevel: reorderLevel || null,
        maximumStock: maximumStock || null,
        reorderQuantity: reorderQuantity || null,
        safetyStock: safetyStock || null,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setNotice(
        result.data.status === "APPROVAL_PENDING"
          ? "Saved as pending approval."
          : "Control settings saved."
      );
      router.refresh();
    });
  }

  function onApprove(changeId: string) {
    setError(null);
    startTransition(async () => {
      const result = await approveControlChangeAction(changeId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function onReject(changeId: string) {
    setError(null);
    startTransition(async () => {
      const result = await rejectControlChangeAction(changeId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/controls" label="Inventory controls" />
      <div>
        <h1 className="text-2xl font-semibold">{item.sku}</h1>
        <p className="text-sm text-muted-foreground">
          {item.productName} · Tracking: {item.trackingMode}
        </p>
      </div>

      {position ? (
        <p className="text-sm">
          Available {position.saleableAvailable} · Status {position.status.replaceAll("_", " ")}
        </p>
      ) : null}

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Location override
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            <option value="">Item default</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Minimum stock
          <input
            value={minimumStock}
            onChange={(event) => setMinimumStock(event.target.value)}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Reorder level
          <input
            value={reorderLevel}
            onChange={(event) => setReorderLevel(event.target.value)}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Maximum stock
          <input
            value={maximumStock}
            onChange={(event) => setMaximumStock(event.target.value)}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Reorder quantity
          <input
            value={reorderQuantity}
            onChange={(event) => setReorderQuantity(event.target.value)}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Safety stock
          <input
            value={safetyStock}
            onChange={(event) => setSafetyStock(event.target.value)}
            className="h-10 rounded-md border px-3"
          />
        </label>
      </section>

      <button
        type="button"
        className={cn(buttonVariants(), "h-10 w-fit")}
        onClick={onSave}
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save control settings"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {pendingChanges.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Pending approval</h2>
          <ul className="divide-y rounded-xl border bg-white">
            {pendingChanges.map((change) => (
              <li key={change.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm">
                  {change.status === "APPROVAL_PENDING" ? "Pending approval" : change.status} ·
                  Reorder {change.proposedSettings.reorderLevel ?? "—"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(buttonVariants(), "h-9")}
                    onClick={() => onApprove(change.id)}
                    disabled={isPending}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "outline" }), "h-9")}
                    onClick={() => onReject(change.id)}
                    disabled={isPending}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
