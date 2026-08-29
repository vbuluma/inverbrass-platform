"use client";

/**
 * Purpose:
 * Create a stock transfer between two locations.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createTransferAction } from "@/modules/inventory/actions/inventory-transfer-actions";
import type { InventoryLocationView, StockItemListView } from "@/modules/inventory/types";

type TransferLineDraft = {
  stockItemId: string;
  quantity: string;
  lotCode: string;
  unitCodes: string;
};

type TransferCreateFormProps = {
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
};

export function TransferCreateForm({ stockItems, locations }: TransferCreateFormProps) {
  const router = useRouter();
  const [sourceLocationId, setSourceLocationId] = useState(locations[0]?.id ?? "");
  const [destinationLocationId, setDestinationLocationId] = useState(locations[1]?.id ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLineDraft[]>([
    {
      stockItemId: stockItems[0]?.id ?? "",
      quantity: "",
      lotCode: "",
      unitCodes: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLine(index: number, patch: Partial<TransferLineDraft>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createTransferAction({
        sourceLocationId,
        destinationLocationId,
        reason,
        notes,
        lines: lines.map((line) => ({
          stockItemId: line.stockItemId,
          quantity: line.quantity,
          lotCode: line.lotCode.trim() || null,
          unitCodes: line.unitCodes
            .split(/[\s,]+/)
            .map((value) => value.trim())
            .filter(Boolean),
        })),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/inventory/transfers/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/transfers" label="Transfers" />
      <h1 className="text-2xl font-semibold">New transfer</h1>
      <p className="text-sm text-muted-foreground">
        Move available stock from one location to another. Destination stock increases only when the
        transfer is received.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        From
        <select
          value={sourceLocationId}
          onChange={(event) => setSourceLocationId(event.target.value)}
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
        To
        <select
          value={destinationLocationId}
          onChange={(event) => setDestinationLocationId(event.target.value)}
          className="h-10 rounded-md border px-3"
        >
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {lines.map((line, index) => (
        <div key={index} className="grid gap-3 rounded-xl border bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            Product
            <select
              value={line.stockItemId}
              onChange={(event) => updateLine(index, { stockItemId: event.target.value })}
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
            Quantity
            <input
              value={line.quantity}
              onChange={(event) => updateLine(index, { quantity: event.target.value })}
              className="h-10 rounded-md border px-3"
              inputMode="decimal"
              placeholder="1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Batch
            <input
              value={line.lotCode}
              onChange={(event) => updateLine(index, { lotCode: event.target.value })}
              className="h-10 rounded-md border px-3"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Serials (one per unit, comma or line separated)
            <textarea
              value={line.unitCodes}
              onChange={(event) => updateLine(index, { unitCodes: event.target.value })}
              className="min-h-20 rounded-md border px-3 py-2"
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline" }), "h-10 w-fit")}
        onClick={() =>
          setLines((current) => [
            ...current,
            {
              stockItemId: stockItems[0]?.id ?? "",
              quantity: "",
              lotCode: "",
              unitCodes: "",
            },
          ])
        }
      >
        Add product
      </button>
      <label className="flex flex-col gap-1 text-sm">
        Reason
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-10 rounded-md border px-3"
          autoComplete="off"
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
        disabled={
          isPending ||
          !sourceLocationId ||
          !destinationLocationId ||
          lines.some((line) => !line.stockItemId || !line.quantity.trim())
        }
      >
        {isPending ? "Saving…" : "Create transfer"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
