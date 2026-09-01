"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoiceAction } from "@/modules/procurement/actions/invoice-actions";

export function InvoiceCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [profileId, setProfileId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [poLineId, setPoLineId] = useState("");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/invoices" label="Supplier invoices" />
      <div>
        <h1 className="text-2xl font-semibold">Capture supplier invoice</h1>
        <p className="text-sm text-muted-foreground">
          Record the supplier invoice against a purchase order for matching.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          startTransition(async () => {
            const result = await createInvoiceAction({
              profileId,
              purchaseOrderId: purchaseOrderId || null,
              supplierInvoiceNumber,
              invoiceDate,
              dueDate: dueDate || null,
              currencyCode: "KES",
              lines: [
                {
                  poLineId: poLineId || null,
                  description,
                  quantity,
                  unitPrice,
                },
              ],
            });
            if (!result.success) {
              setError(result.error.message);
              return;
            }
            router.push(`/procurement/invoices/${result.data.id}`);
          });
        }}
      >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="profileId">Supplier profile ID</Label>
          <Input
            id="profileId"
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseOrderId">Purchase order ID</Label>
          <Input
            id="purchaseOrderId"
            value={purchaseOrderId}
            onChange={(event) => setPurchaseOrderId(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierInvoiceNumber">Supplier invoice number</Label>
          <Input
            id="supplierInvoiceNumber"
            value={supplierInvoiceNumber}
            onChange={(event) => setSupplierInvoiceNumber(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="poLineId">PO line ID</Label>
          <Input
            id="poLineId"
            value={poLineId}
            onChange={(event) => setPoLineId(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Line description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit price</Label>
            <Input
              id="unitPrice"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save draft"}
        </Button>
      </form>
    </main>
  );
}
