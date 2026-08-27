"use client";

/**
 * Purpose:
 * Direct sale wizard — customer → product/quantity → commercial total → review.
 * Business language only. Commercial values come from BP-005, not a local calculator.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformSearchState,
  type PlatformSearchStateStatus,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";
import { searchCrmRecordsAction } from "@/modules/crm/actions/crm-actions";
import type { CrmSummaryView } from "@/modules/crm/types";
import { searchProductsAction } from "@/modules/product/actions/product-actions";
import type { ProductSummaryView } from "@/modules/product/types";
import {
  createDirectSaleAction,
  prepareSaleCommercialAction,
} from "@/modules/sales/actions/sales-order-actions";
import type {
  ConsumedCommercialResult,
  SalesOrderDetailView,
} from "@/modules/sales/types";

type SaleStep = "customer" | "product" | "total" | "review";

const STEP_ORDER: SaleStep[] = ["customer", "product", "total", "review"];

type FieldErrors = Partial<
  Record<"customerId" | "offeringId" | "quantity" | "currencyCode" | "expectedAmount", string>
>;

export type CreateSaleInitialContext = {
  partyId?: string | null;
  crmId?: string | null;
  customerName?: string | null;
  offeringId?: string | null;
  offeringName?: string | null;
};

type CreateSaleWizardProps = {
  initialContext?: CreateSaleInitialContext;
};

export function CreateSaleWizard({ initialContext }: CreateSaleWizardProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<SaleStep>(
    initialContext?.partyId ? "product" : "customer"
  );
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [customerQuery, setCustomerQuery] = useState(initialContext?.customerName ?? "");
  const [customerStatus, setCustomerStatus] = useState<PlatformSearchStateStatus>("idle");
  const [customerResults, setCustomerResults] = useState<CrmSummaryView[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CrmSummaryView | null>(
    initialContext?.partyId
      ? {
          crmId: initialContext.crmId ?? "",
          partyId: initialContext.partyId,
          customerNumber: "",
          displayName: initialContext.customerName ?? "Selected customer",
          partyTypeCode: "",
          crmTypeCode: "",
          crmTypeName: "",
          statusCode: "",
          statusName: "",
          ownerPartyId: null,
          ownerDisplayName: null,
          branchId: null,
          branchName: null,
          customerSince: "",
          updatedAt: "",
        }
      : null
  );

  const [offeringQuery, setOfferingQuery] = useState(initialContext?.offeringName ?? "");
  const [offeringStatus, setOfferingStatus] = useState<PlatformSearchStateStatus>("idle");
  const [offeringResults, setOfferingResults] = useState<ProductSummaryView[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<ProductSummaryView | null>(
    initialContext?.offeringId
      ? ({
          id: initialContext.offeringId,
          productCode: "",
          productName: initialContext.offeringName ?? "Selected product",
          shortName: null,
          productTypeCode: "SERVICE",
          productTypeName: "Service",
          statusCode: "ACTIVE",
          statusName: "Active",
          ownerPartyId: null,
          ownerDisplayName: null,
          recordSource: "PLATFORM_CREATED",
          recordSourceLabel: "",
          updatedAt: "",
          createdAt: "",
        } as ProductSummaryView)
      : null
  );
  const [quantity, setQuantity] = useState("1");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [commercial, setCommercial] = useState<ConsumedCommercialResult | null>(null);
  const [created, setCreated] = useState<SalesOrderDetailView | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  const steps = useMemo(
    () =>
      STEP_ORDER.map((id, index) => ({
        id,
        label:
          id === "customer"
            ? "Customer"
            : id === "product"
              ? "Product / service"
              : id === "total"
                ? "Expected total"
                : "Review",
        complete:
          index < stepIndex ||
          (id === "customer" && Boolean(selectedCustomer)) ||
          (id === "product" && Boolean(selectedOffering)) ||
          (id === "total" && Boolean(commercial)),
        current: id === step,
      })),
    [commercial, selectedCustomer, selectedOffering, step, stepIndex]
  );

  function clearFeedback() {
    setActionResult(null);
    setFieldErrors({});
  }

  function searchCustomers() {
    clearFeedback();
    const q = customerQuery.trim();
    if (q.length < 2) {
      setFieldErrors({ customerId: "Type at least two characters to search customers." });
      return;
    }
    setCustomerStatus("searching");
    startTransition(async () => {
      const result = await searchCrmRecordsAction(q);
      if (!result.success) {
        setCustomerStatus("error");
        setActionResult(platformError("Customer search failed", result.error.message, "customerId"));
        return;
      }
      const rows = result.data ?? [];
      setCustomerResults(rows);
      setCustomerStatus(rows.length === 0 ? "empty" : "success");
    });
  }

  function searchOfferings() {
    clearFeedback();
    setOfferingStatus("searching");
    startTransition(async () => {
      const result = await searchProductsAction(offeringQuery.trim());
      if (!result.success) {
        setOfferingStatus("error");
        setActionResult(platformError("Product search failed", result.error.message, "offeringId"));
        return;
      }
      const rows = result.data ?? [];
      setOfferingResults(rows);
      setOfferingStatus(rows.length === 0 ? "empty" : "success");
    });
  }

  function goNext() {
    clearFeedback();
    if (step === "customer") {
      if (!selectedCustomer?.partyId) {
        setFieldErrors({ customerId: "Select a customer to continue." });
        return;
      }
      setStep("product");
      return;
    }
    if (step === "product") {
      const errors: FieldErrors = {};
      if (!selectedOffering) {
        errors.offeringId = "Select a product or service.";
      }
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors.quantity = "Enter a quantity greater than zero.";
      }
      if (!currencyCode.trim()) {
        errors.currencyCode = "Currency is required.";
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      startTransition(async () => {
        const result = await prepareSaleCommercialAction({
          customerPartyId: selectedCustomer!.partyId,
          offeringId: selectedOffering!.id,
          quantity: Number(quantity),
          currencyCode: currencyCode.trim().toUpperCase(),
        });
        if (!result.success) {
          setFieldErrors(
            result.error.field
              ? { [result.error.field]: result.error.message }
              : { expectedAmount: result.error.message }
          );
          setActionResult(
            platformError(
              "Commercial total is not ready",
              `${result.error.message}${result.error.nextAction ? ` ${result.error.nextAction}` : ""}`,
              result.error.field
            )
          );
          return;
        }
        setCommercial(result.data);
        setStep("total");
        setActionResult(
          platformSuccess(
            "Expected total ready",
            `${result.data.contract.commercial.currency} ${result.data.contract.commercial.expectedPayable}`
          )
        );
      });
      return;
    }
    if (step === "total") {
      if (!commercial) {
        setFieldErrors({ expectedAmount: "Prepare the expected total before reviewing." });
        return;
      }
      setStep("review");
    }
  }

  function saveDraft() {
    if (!selectedCustomer || !selectedOffering || !commercial) {
      return;
    }
    clearFeedback();
    startTransition(async () => {
      const result = await createDirectSaleAction({
        customerPartyId: selectedCustomer.partyId,
        crmRecordId: selectedCustomer.crmId || null,
        currencyCode: currencyCode.trim().toUpperCase(),
        quantity: Number(quantity),
        offeringId: selectedOffering.id,
        description: selectedOffering.productName,
        snapshot: commercial.snapshot,
        expected: commercial.expected,
      });
      if (!result.success) {
        setFieldErrors(
          result.error.field
            ? { [result.error.field]: result.error.message }
            : {}
        );
        setActionResult(
          platformError(
            "Sale could not be created",
            `${result.error.message}${result.error.nextAction ? ` ${result.error.nextAction}` : ""}`,
            result.error.field
          )
        );
        return;
      }
      setCreated(result.data);
      setActionResult(
        platformSuccess("Draft sale created", `Order ${result.data.orderNumber} is ready to confirm.`)
      );
    });
  }

  if (created) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <PageBackLink href="/sales" label="Sales" />
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-6">
          <h1 className="text-2xl font-semibold">Sale created</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Order {created.orderNumber} is a draft. Payment is not yet recorded.
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{created.customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expected total</dt>
              <dd className="font-medium">
                {created.currencyCode} {created.expectedAmount}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/sales/${created.id}`} className={cn(buttonVariants())}>
              Review and confirm
            </Link>
            <Link href="/sales" className={cn(buttonVariants({ variant: "outline" }))}>
              All sales
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/sales" label="Sales" />
      <div>
        <h1 className="text-2xl font-semibold">Sell</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          New sale: choose a customer and product, then review the expected total before confirming.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                item.current && "border-emerald-300 bg-emerald-50",
                !item.current && item.complete && "border-emerald-200"
              )}
              onClick={() => {
                if (index <= stepIndex) {
                  setStep(item.id);
                }
              }}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {item.complete && !item.current ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>

      {step === "customer" ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerSearch">Customer</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="customerSearch"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder="Search customers"
                aria-invalid={Boolean(fieldErrors.customerId)}
              />
              <Button type="button" variant="outline" onClick={searchCustomers} disabled={isPending}>
                Search
              </Button>
            </div>
            {fieldErrors.customerId ? (
              <p className="text-sm text-destructive">{fieldErrors.customerId}</p>
            ) : null}
          </div>
          {selectedCustomer ? (
            <p className="text-sm">
              Selected: <span className="font-medium">{selectedCustomer.displayName}</span>
            </p>
          ) : null}
          <PlatformSearchState
            status={customerStatus}
            emptyTitle="No customers found"
            emptyHints={["Try another name", "Open Customers to add one first"]}
            errorMessage="Customer search failed."
            onRetry={searchCustomers}
          >
            <ul className="divide-y rounded-lg border">
              {customerResults.map((customer) => (
                <li key={customer.crmId || customer.partyId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setCommercial(null);
                    }}
                  >
                    <span className="font-medium">{customer.displayName}</span>
                    <span className="text-xs text-muted-foreground">{customer.customerNumber}</span>
                  </button>
                </li>
              ))}
            </ul>
          </PlatformSearchState>
          <p className="text-xs text-muted-foreground">
            Customers come from your existing customer list. New customers are added under Customers, not here.
          </p>
        </section>
      ) : null}

      {step === "product" ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offeringSearch">Product or service</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="offeringSearch"
                value={offeringQuery}
                onChange={(event) => setOfferingQuery(event.target.value)}
                placeholder="Search products and services"
                aria-invalid={Boolean(fieldErrors.offeringId)}
              />
              <Button type="button" variant="outline" onClick={searchOfferings} disabled={isPending}>
                Search
              </Button>
            </div>
            {fieldErrors.offeringId ? (
              <p className="text-sm text-destructive">{fieldErrors.offeringId}</p>
            ) : null}
          </div>
          {selectedOffering ? (
            <p className="text-sm">
              Selected: <span className="font-medium">{selectedOffering.productName}</span>
            </p>
          ) : null}
          <PlatformSearchState
            status={offeringStatus}
            emptyTitle="No products found"
            emptyHints={["Try another name", "Open Offerings to add one first"]}
            errorMessage="Product search failed."
            onRetry={searchOfferings}
          >
            <ul className="divide-y rounded-lg border">
              {offeringResults.map((offering) => (
                <li key={offering.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => {
                      setSelectedOffering(offering);
                      setCommercial(null);
                    }}
                  >
                    <span className="font-medium">{offering.productName}</span>
                    <span className="text-xs text-muted-foreground">{offering.productCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          </PlatformSearchState>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setCommercial(null);
                }}
                aria-invalid={Boolean(fieldErrors.quantity)}
              />
              {fieldErrors.quantity ? (
                <p className="text-sm text-destructive">{fieldErrors.quantity}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input
                id="currencyCode"
                value={currencyCode}
                onChange={(event) => {
                  setCurrencyCode(event.target.value.toUpperCase());
                  setCommercial(null);
                }}
                aria-invalid={Boolean(fieldErrors.currencyCode)}
              />
              {fieldErrors.currencyCode ? (
                <p className="text-sm text-destructive">{fieldErrors.currencyCode}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {step === "total" || step === "review" ? (
        <section className="space-y-4">
          {commercial ? (
            <div className="space-y-3 rounded-lg border p-4">
              <h2 className="text-base font-semibold">Expected total</h2>
              <p className="text-2xl font-semibold">
                {commercial.contract.commercial.currency}{" "}
                {commercial.contract.commercial.expectedPayable}
              </p>
              <p className="text-sm text-muted-foreground">Payment is not yet recorded.</p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium">{selectedCustomer?.displayName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Product / service</dt>
                  <dd className="font-medium">{selectedOffering?.productName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="font-medium">{quantity}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="font-medium">{commercial.contract.commercial.totalTax}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Discounts</dt>
                  <dd className="font-medium">{commercial.contract.commercial.totalDiscounts}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Commission</dt>
                  <dd className="font-medium">{commercial.contract.commercial.totalCommission}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <PlatformEmptyState
              title="Expected total is not ready"
              description="Go back to product and quantity, then continue to prepare the commercial total."
              actionLabel="Back to product"
              onAction={() => setStep("product")}
            />
          )}
          {fieldErrors.expectedAmount ? (
            <p className="text-sm text-destructive">{fieldErrors.expectedAmount}</p>
          ) : null}
        </section>
      ) : null}

      <PlatformFormActionFooter
        result={actionResult}
        isProcessing={isPending}
        processingLabel="Working…"
        onDismiss={clearFeedback}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === "customer" || isPending}
            onClick={() => setStep(STEP_ORDER[Math.max(0, stepIndex - 1)] ?? "customer")}
          >
            Previous
          </Button>
          {step !== "review" ? (
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              processingLabel={step === "product" ? "Preparing total…" : "Working…"}
              idleLabel={step === "product" ? "Get expected total" : "Next"}
              onClick={goNext}
            />
          ) : (
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              processingLabel="Saving…"
              idleLabel="Save draft sale"
              onClick={saveDraft}
            />
          )}
          {selectedCustomer ? (
            <Link
              href={`/customers/${selectedCustomer.crmId || ""}`}
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Open customer
            </Link>
          ) : null}
        </div>
      </PlatformFormActionFooter>
    </main>
  );
}
