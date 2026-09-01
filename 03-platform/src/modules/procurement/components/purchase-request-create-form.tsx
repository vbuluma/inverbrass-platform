"use client";

/**
 * Purpose:
 * Create a multi-line purchase request with budget source and origin.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchaseRequestAction } from "@/modules/procurement/actions/purchase-request-actions";
import {
  BUDGET_SOURCES,
  PROCUREMENT_TYPES,
  PURCHASE_REQUEST_ORIGIN_TYPES,
} from "@/modules/procurement/constants";
import type { PurchaseRequestLineDraft, SupplierListView } from "@/modules/procurement/types";

type PurchaseRequestCreateFormProps = {
  suppliers: SupplierListView[];
};

const emptyLine = (): PurchaseRequestLineDraft => ({
  description: "",
  specification: "",
  quantity: "1",
  uom: "EA",
  estimatedValue: "0",
  requiredDate: "",
});

export function PurchaseRequestCreateForm({ suppliers }: PurchaseRequestCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [originType, setOriginType] = useState<string>(PURCHASE_REQUEST_ORIGIN_TYPES.AD_HOC);
  const [originReference, setOriginReference] = useState("");
  const [procurementType, setProcurementType] = useState<string>(PROCUREMENT_TYPES.GOODS);
  const [justification, setJustification] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [businessUnitCode, setBusinessUnitCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [budgetSource, setBudgetSource] = useState<string>(BUDGET_SOURCES.EXISTING_BUDGET);
  const [budgetReference, setBudgetReference] = useState("");
  const [budgetAvailableAmount, setBudgetAvailableAmount] = useState("");
  const [budgetApprovalReference, setBudgetApprovalReference] = useState("");
  const [budgetApprover, setBudgetApprover] = useState("");
  const [suggestedProfileId, setSuggestedProfileId] = useState("");
  const [lines, setLines] = useState<PurchaseRequestLineDraft[]>([emptyLine()]);

  function updateLine(index: number, patch: Partial<PurchaseRequestLineDraft>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createPurchaseRequestAction({
        originType,
        originReference: originReference || null,
        businessUnitCode: businessUnitCode || null,
        procurementType,
        justification: justification || null,
        requiredDate: requiredDate || null,
        deliveryLocation: deliveryLocation || null,
        currencyCode,
        budgetSource,
        budgetReference: budgetReference || null,
        budgetAvailableAmount: budgetAvailableAmount || null,
        budgetApprovalReference: budgetApprovalReference || null,
        budgetApprover: budgetApprover || null,
        suggestedProfileId: suggestedProfileId || null,
        lines: lines.map((line) => ({
          ...line,
          specification: line.specification || null,
          requiredDate: line.requiredDate || null,
        })),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/procurement/requests/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/requests" label="Purchase requests" />
      <div>
        <h1 className="text-2xl font-semibold">New request</h1>
        <p className="text-sm text-muted-foreground">
          Tell us what you need, where it is funded from, and submit for approval.
        </p>
      </div>
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="originType">Origin</Label>
            <select
              id="originType"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={originType}
              onChange={(event) => setOriginType(event.target.value)}
            >
              <option value={PURCHASE_REQUEST_ORIGIN_TYPES.AD_HOC}>Ad-hoc</option>
              <option value={PURCHASE_REQUEST_ORIGIN_TYPES.INVENTORY_REORDER}>
                Inventory reorder
              </option>
              <option value={PURCHASE_REQUEST_ORIGIN_TYPES.BUSINESS_REQUIREMENT}>
                Business requirement
              </option>
              <option value={PURCHASE_REQUEST_ORIGIN_TYPES.PROCUREMENT_DEMAND}>Plan</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="originReference">Origin reference</Label>
            <Input
              id="originReference"
              value={originReference}
              onChange={(event) => setOriginReference(event.target.value)}
              placeholder="Reorder advice or plan reference"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="procurementType">Type</Label>
            <select
              id="procurementType"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={procurementType}
              onChange={(event) => setProcurementType(event.target.value)}
            >
              <option value={PROCUREMENT_TYPES.GOODS}>Goods</option>
              <option value={PROCUREMENT_TYPES.SERVICES}>Services</option>
              <option value={PROCUREMENT_TYPES.ASSETS}>Assets</option>
              <option value={PROCUREMENT_TYPES.MIXED}>Mixed</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessUnit">Business unit</Label>
            <Input
              id="businessUnit"
              value={businessUnitCode}
              onChange={(event) => setBusinessUnitCode(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredDate">Required date</Label>
            <Input
              id="requiredDate"
              type="date"
              value={requiredDate}
              onChange={(event) => setRequiredDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryLocation">Delivery location</Label>
            <Input
              id="deliveryLocation"
              value={deliveryLocation}
              onChange={(event) => setDeliveryLocation(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification">Justification</Label>
          <textarea
            id="justification"
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="budgetSource">Budget source</Label>
            <select
              id="budgetSource"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={budgetSource}
              onChange={(event) => setBudgetSource(event.target.value)}
            >
              <option value={BUDGET_SOURCES.PLANNED}>Planned procurement</option>
              <option value={BUDGET_SOURCES.EXISTING_BUDGET}>Existing budget</option>
              <option value={BUDGET_SOURCES.AD_HOC_BUDGET_APPROVAL}>
                Ad-hoc budget approval
              </option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currencyCode">Currency</Label>
            <Input
              id="currencyCode"
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value)}
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetReference">Budget reference</Label>
            <Input
              id="budgetReference"
              value={budgetReference}
              onChange={(event) => setBudgetReference(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetAvailable">Available budget</Label>
            <Input
              id="budgetAvailable"
              value={budgetAvailableAmount}
              onChange={(event) => setBudgetAvailableAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetApprovalReference">Budget approval reference</Label>
            <Input
              id="budgetApprovalReference"
              value={budgetApprovalReference}
              onChange={(event) => setBudgetApprovalReference(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetApprover">Budget approver</Label>
            <Input
              id="budgetApprover"
              value={budgetApprover}
              onChange={(event) => setBudgetApprover(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suggestedSupplier">Suggested supplier</Label>
          <select
            id="suggestedSupplier"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={suggestedProfileId}
            onChange={(event) => setSuggestedProfileId(event.target.value)}
          >
            <option value="">None</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.partyName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Lines</h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              Add line
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-5">
              <div className="space-y-1 sm:col-span-2">
                <Label>Need</Label>
                <Input
                  value={line.description}
                  onChange={(event) => updateLine(index, { description: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>UOM</Label>
                <Input
                  value={line.uom}
                  onChange={(event) => updateLine(index, { uom: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Estimate</Label>
                <Input
                  value={line.estimatedValue}
                  onChange={(event) => updateLine(index, { estimatedValue: event.target.value })}
                  required
                />
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save draft"}
          </Button>
        </div>
      </form>
    </main>
  );
}
