"use client";

/**
 * Purpose:
 * Create an opening-balance document, distinct from receiving.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createOpeningBalanceAction } from "@/modules/inventory/actions/inventory-inbound-actions";
import type { InventoryLocationView } from "@/modules/inventory/types";

type OpeningBalanceCreateFormProps = {
  locations: InventoryLocationView[];
};

export function OpeningBalanceCreateForm({ locations }: OpeningBalanceCreateFormProps) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createOpeningBalanceAction({ locationId, notes });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/inventory/opening-balances/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/opening-balances" label="Opening balances" />
      <h1 className="text-2xl font-semibold">New opening balance</h1>
      <p className="text-sm text-muted-foreground">
        Use this for stock already held when inventory is first set up. Do not use it for supplier deliveries.
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
        {isPending ? "Saving…" : "Create opening balance"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
