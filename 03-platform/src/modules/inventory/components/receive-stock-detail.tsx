"use client";

/**
 * Purpose:
 * Stock receipt detail — lines, submit, approve, post, cancel.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addReceiptLineAction,
  approveReceiptAction,
  cancelReceiptAction,
  postReceiptAction,
  rejectReceiptAction,
  submitReceiptAction,
} from "@/modules/inventory/actions/inventory-inbound-actions";
import type { InventoryReceiptView, StockItemListView } from "@/modules/inventory/types";

type ReceiveStockDetailProps = {
  receipt: InventoryReceiptView;
  stockItems: StockItemListView[];
};

export function ReceiveStockDetail({ receipt, stockItems }: ReceiveStockDetailProps) {
  const [detail, setDetail] = useState(receipt);
  const [stockItemId, setStockItemId] = useState(stockItems[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [lineTotal, setLineTotal] = useState("");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [lotCode, setLotCode] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [manufacturedOn, setManufacturedOn] = useState("");
  const [unitCodes, setUnitCodes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const draft = detail.status === "DRAFT";

  function apply(
    result: { success: true; data: InventoryReceiptView } | { success: false; error: { message: string } },
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
      <PageBackLink href="/inventory/receive" label="Receive stock" />
      <div>
        <h1 className="text-2xl font-semibold">{detail.documentNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.locationName} · {detail.status}
          {detail.supplierName ? ` · ${detail.supplierName}` : ""}
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
          <h2 className="text-base font-semibold">Add product line</h2>
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
              Quantity
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Expected quantity
              <input
                value={expectedQuantity}
                onChange={(event) => setExpectedQuantity(event.target.value)}
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
            <label className="flex flex-col gap-1 text-sm">
              Manufacture date
              <input
                type="date"
                value={manufacturedOn}
                onChange={(event) => setManufacturedOn(event.target.value)}
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
                const result = await addReceiptLineAction(detail.id, {
                  stockItemId,
                  quantity,
                  expectedQuantity: expectedQuantity || null,
                  unitCost: unitCost || null,
                  lineTotal: lineTotal || null,
                  currencyCode: unitCost || lineTotal ? currencyCode : null,
                  lotCode: lotCode.trim() || null,
                  expiresOn: expiresOn || null,
                  manufacturedOn: manufacturedOn || null,
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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 text-right font-medium">Expected</th>
                <th className="py-2 pr-3 text-right font-medium">Received</th>
                <th className="py-2 pr-3 text-right font-medium">Remaining</th>
                <th className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {detail.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-2 pr-3">
                    <div>{line.sku}</div>
                    <div className="text-xs text-muted-foreground">
                      Received quantity: {line.quantity} {line.uomCode}
                      {Number(line.conversionFactor) !== 1
                        ? ` → ${line.baseQuantity} ${line.baseUomCode}`
                        : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Resulting on-hand: {line.onHand} {line.baseUomCode}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {line.expectedQuantity
                      ? `${line.expectedQuantity} ${line.baseUomCode}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {line.receivedQuantity !== null
                      ? `${line.receivedQuantity} ${line.baseUomCode}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {line.remainingQuantity !== null
                      ? `${line.remainingQuantity} ${line.baseUomCode}`
                      : "—"}
                  </td>
                  <td className="py-2 text-right">{line.lineTotal ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {draft ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => apply(await submitReceiptAction(detail.id), "Submitted."))
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
                  apply(await approveReceiptAction(detail.id), "Approved.")
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
                  apply(await rejectReceiptAction(detail.id, rejectReason), "Rejected.")
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
              startTransition(async () => apply(await postReceiptAction(detail.id), "Posted."))
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
              startTransition(async () => apply(await cancelReceiptAction(detail.id), "Cancelled."))
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
