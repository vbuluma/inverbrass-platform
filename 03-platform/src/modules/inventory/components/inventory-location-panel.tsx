"use client";

/**
 * Purpose:
 * Inventory location list and status management.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createLocationAction,
  setLocationActiveAction,
} from "@/modules/inventory/actions/inventory-actions";
import type { CatalogueTypeRef, InventoryLocationView } from "@/modules/inventory/types";

type InventoryLocationPanelProps = {
  locations: InventoryLocationView[];
  locationTypes: CatalogueTypeRef[];
};

export function InventoryLocationPanel({
  locations,
  locationTypes,
}: InventoryLocationPanelProps) {
  const [rows, setRows] = useState(locations);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locationTypeCode, setLocationTypeCode] = useState(locationTypes[0]?.code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createLocationAction({ code, name, locationTypeCode });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setRows((current) => [result.data, ...current]);
      setCode("");
      setName("");
    });
  }

  function onToggle(locationId: string, isActive: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setLocationActiveAction(locationId, isActive);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setRows((current) => current.map((row) => (row.id === result.data.id ? result.data : row)));
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div>
        <h1 className="text-2xl font-semibold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Stores and warehouses where stock is held.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Add location</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Code
            <input value={code} onChange={(event) => setCode(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-md border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Type
            <select value={locationTypeCode} onChange={(event) => setLocationTypeCode(event.target.value)} className="h-10 rounded-md border px-3">
              {locationTypes.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className={cn(buttonVariants(), "mt-4 h-10")} onClick={onCreate} disabled={isPending || !code.trim() || !name.trim()}>
          {isPending ? "Saving…" : "Save location"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
      </section>

      {rows.length === 0 ? (
        <PlatformEmptyState title="No locations yet" description="Add a store or warehouse to hold stock." />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          <li className="hidden grid-cols-4 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Code</span>
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
          </li>
          {rows.map((row) => (
            <li key={row.id} className="grid gap-1 px-4 py-3 sm:grid-cols-4 sm:items-center">
              <p className="font-medium">{row.code}</p>
              <p className="text-sm">{row.name}</p>
              <p className="text-sm text-muted-foreground">{row.locationTypeLabel}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm">{row.isActive ? "Active" : "Inactive"}</span>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => onToggle(row.id, !row.isActive)}
                  disabled={isPending}
                >
                  {row.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
