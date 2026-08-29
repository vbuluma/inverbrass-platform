"use client";

/**
 * Purpose:
 * Opening-balance document detail — distinct from supplier receiving.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addOpeningBalanceLineAction,
  approveOpeningBalanceAction,
  cancelOpeningBalanceAction,
  postOpeningBalanceAction,
  rejectOpeningBalanceAction,
  submitOpeningBalanceAction,
} from "@/modules/inventory/actions/inventory-inbound-actions";
import type { InventoryOpeningBalanceView, StockItemListView } from "@/modules/inventory/types";

type OpeningBalanceDetailProps = {
  document: InventoryOpeningBalanceView;
  stockItems: StockItemListView[];
};

export function OpeningBalanceDetail({ document, stockItems }: OpeningBalanceDetailProps) {
  const [detail, setDetail] = useState(document);
  const [stockItemId, setStockItemId] = useState(stockItems[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [lineTotal, setLineTotal] = useState("");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [lotCode, setLotCode] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [unitCodes, setUnitCodes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const draft = detail.status === "DRAFT";

  function apply(
    result:
      | { success: true; data: InventoryOpeningBalanceView }
      | { success: false; error: { message: string } },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setDetail(result.data);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/opening-balances" label="Opening balances" />
      <div>
        <h1 className="text-2xl font-semibold">{detail.documentNumber}</h1>
        <p className="text-sm text-muted-foreground">
          Opening balance · {detail.locationName} · {detail.status}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Total items</p>
          <p className="text-lg font-semibold">{detail.lineCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Total quantity</p>
          <p className="text-lg font-semibold">{detail.totalQuantity}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Total value</p>
          <p className="text-lg font-semibold">{detail.totalValue ?? "—"}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-lg font-semibold">{detail.status}</p>
        </div>
      </div>

      {draft ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add opening quantity</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Stock item
              <select
                value={stockItemId}
                onChange={(event) => setStockItemId(event.target.value)}
                className="h-10 rounded-md border px-3"
              >
                {stockItems.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.sku} — {row.productName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Opening quantity
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Unit cost
              <input
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Line total
              <input
                value={lineTotal}
                onChange={(event) => setLineTotal(event.target.value)}
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Currency
              <input
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
                className="h-10 rounded-md border px-3"
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
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Serials (one per unit, comma or line separated)
              <textarea
                value={unitCodes}
                onChange={(event) => setUnitCodes(event.target.value)}
                className="min-h-20 rounded-md border px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            className={cn(buttonVariants(), "mt-4 h-10")}
            disabled={isPending || !stockItemId || !quantity}
            onClick={() =>
              startTransition(async () => {
                const result = await addOpeningBalanceLineAction(detail.id, {
                  stockItemId,
                  quantity,
                  unitCost: unitCost || null,
                  lineTotal: lineTotal || null,
                  currencyCode: unitCost || lineTotal ? currencyCode : null,
                  lotCode: lotCode.trim() || null,
                  expiresOn: expiresOn || null,
                  unitCodes: unitCodes
                    .split(/[\s,]+/)
                    .map((value) => value.trim())
                    .filter(Boolean),
                });
                apply(result, "Line added.");
              })
            }
          >
            Add line
          </button>
        </section>
      ) : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Lines</h2>
        <ul className="mt-3 divide-y">
          {detail.lines.map((line) => (
            <li key={line.id} className="flex justify-between py-2 text-sm">
              <span>
                <span className="block">
                  {line.sku} · {line.quantity} {line.uomCode}
                  {Number(line.conversionFactor) !== 1
                    ? ` → ${line.baseQuantity} ${line.baseUomCode}`
                    : ""}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Resulting on-hand: {line.onHand} {line.baseUomCode}
                </span>
              </span>
              <span>{line.lineTotal ?? "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        {draft ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await submitOpeningBalanceAction(detail.id), "Submitted.")
              )
            }
          >
            Submit
          </button>
        ) : null}
        {detail.status === "SUBMITTED" ? (
          <>
            <button
              type="button"
              className={cn(buttonVariants(), "h-10")}
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  apply(await approveOpeningBalanceAction(detail.id), "Approved.")
                )
              }
            >
              Approve
            </button>
            <input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Rejection reason"
              className="h-10 rounded-md border px-3 text-sm"
            />
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () =>
                  apply(await rejectOpeningBalanceAction(detail.id, rejectReason), "Rejected.")
                )
              }
            >
              Reject
            </button>
          </>
        ) : null}
        {detail.status !== "POSTED" && detail.status !== "CANCELLED" && detail.status !== "REJECTED" ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await postOpeningBalanceAction(detail.id), "Posted.")
              )
            }
          >
            Post to stock
          </button>
        ) : null}
        {detail.status !== "POSTED" && detail.status !== "CANCELLED" && detail.status !== "REJECTED" ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await cancelOpeningBalanceAction(detail.id), "Cancelled.")
              )
            }
          >
            Cancel
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </main>
  );
}
