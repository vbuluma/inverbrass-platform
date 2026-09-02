/**
 * Purpose:
 * Commercial pricing workspace — customer + offering → expected amount → tax handoff.
 * Presentation layer consumes existing BP-005 services; does not recalculate masters.
 */

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformInlineFormFeedback,
  PlatformProcessingButton,
  PlatformSearchState,
  type PlatformSearchStateStatus,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";
import {
  applyCommercialTaxAction,
  composeCommercialPrincipalAction,
  finalizeCommercialExpectedAction,
  resolveCommercialBasePriceAction,
} from "@/modules/commercial/actions/commercial-resolution-actions";
import {
  buildCommercialTaxHandoff,
  saveCommercialTaxHandoff,
  taxComplianceHandoffHref,
} from "@/modules/commercial/commercial-journey-handoff";
import {
  buildCommercialSaleHandoff,
  createSaleHref,
  saveCommercialSaleHandoff,
} from "@/modules/sales/sales-journey-handoff";
import {
  CommercialResolutionStepper,
  type CommercialStepDefinition,
  type CommercialStepId,
  type CommercialStepStatus,
} from "@/modules/commercial/components/commercial-resolution-stepper";
import { TAX_TREATMENT_CODES, type TaxTreatmentCode } from "@/modules/commercial/constants";
import type {
  CommercialSnapshot,
  CommercialTransactionContract,
  ExpectedCommercialAmount,
  ResolvedBasePrice,
  ResolvedCommercialComposition,
  TaxResolutionResult,
} from "@/modules/commercial/types";
import { searchCrmRecordsAction } from "@/modules/crm/actions/crm-actions";
import type { CrmSummaryView } from "@/modules/crm/types";
import { searchProductsAction } from "@/modules/product/actions/product-actions";
import type { ProductSummaryView } from "@/modules/product/types";

type FieldErrors = Partial<
  Record<
    | "customerId"
    | "offeringId"
    | "currencyCode"
    | "quantity"
    | "ratePercent"
    | "taxTypeCode",
    string
  >
>;

const STEP_ORDER: CommercialStepId[] = [
  "base-price",
  "components",
  "tax",
  "review",
];

export type CommercialResolveInitialContext = {
  partyId?: string | null;
  crmId?: string | null;
  customerName?: string | null;
  offeringId?: string | null;
  offeringName?: string | null;
};

type CommercialResolutionWorkspaceProps = {
  initialContext?: CommercialResolveInitialContext;
};

export function CommercialResolutionWorkspace({
  initialContext,
}: CommercialResolutionWorkspaceProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<CommercialStepId>("base-price");
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [stepErrors, setStepErrors] = useState<
    Partial<
      Record<
        CommercialStepId,
        {
          message: string;
          code?: string;
          family?: string;
          actionableHint?: string;
        }
      >
    >
  >({});

  const [customerQuery, setCustomerQuery] = useState(
    initialContext?.customerName ?? ""
  );
  const [customerSearchStatus, setCustomerSearchStatus] =
    useState<PlatformSearchStateStatus>(
      initialContext?.customerName || initialContext?.partyId ? "success" : "idle"
    );
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

  const [offeringQuery, setOfferingQuery] = useState(
    initialContext?.offeringName ?? ""
  );
  const [offeringSearchStatus, setOfferingSearchStatus] =
    useState<PlatformSearchStateStatus>(
      initialContext?.offeringId ? "success" : "idle"
    );
  const [offeringResults, setOfferingResults] = useState<ProductSummaryView[]>(
    []
  );
  const [selectedOffering, setSelectedOffering] =
    useState<ProductSummaryView | null>(
      initialContext?.offeringId
        ? ({
            id: initialContext.offeringId,
            productName: initialContext.offeringName ?? "Selected offering",
            productCode: "",
          } as ProductSummaryView)
        : null
    );

  const [currencyCode, setCurrencyCode] = useState("KES");
  const [quantity, setQuantity] = useState("1");
  const [salesChannel, setSalesChannel] = useState("");
  const [customerSegment, setCustomerSegment] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");

  const [resolvedBase, setResolvedBase] = useState<ResolvedBasePrice | null>(
    null
  );
  const [composition, setComposition] =
    useState<ResolvedCommercialComposition | null>(null);
  const [taxResult, setTaxResult] = useState<TaxResolutionResult | null>(null);
  const [snapshot, setSnapshot] = useState<CommercialSnapshot | null>(null);
  const [expected, setExpected] = useState<ExpectedCommercialAmount | null>(
    null
  );
  const [contract, setContract] =
    useState<CommercialTransactionContract | null>(null);

  const [taxTypeCode, setTaxTypeCode] = useState("VAT");
  const [taxTypeLabel, setTaxTypeLabel] = useState("VAT");
  const [ratePercent, setRatePercent] = useState("16");
  const [treatment, setTreatment] = useState<TaxTreatmentCode>(
    TAX_TREATMENT_CODES.EXCLUSIVE
  );

  useEffect(() => {
    if (initialContext?.offeringId && initialContext.offeringName) {
      startTransition(async () => {
        const result = await searchProductsAction(
          initialContext.offeringName!.trim()
        );
        if (result.success) {
          const match =
            result.data.find((p) => p.id === initialContext.offeringId) ??
            result.data[0] ??
            null;
          if (match) {
            setSelectedOffering(match);
            setOfferingResults(result.data);
            setOfferingSearchStatus("success");
          }
        }
      });
    }
    if (initialContext?.customerName || initialContext?.crmId) {
      startTransition(async () => {
        const q =
          initialContext.customerName?.trim() ||
          initialContext.crmId?.trim() ||
          "";
        if (q.length < 2) return;
        const result = await searchCrmRecordsAction(q);
        if (result.success) {
          const match =
            result.data.find((c) => c.crmId === initialContext.crmId) ||
            result.data.find((c) => c.partyId === initialContext.partyId) ||
            result.data[0] ||
            null;
          if (match) {
            setSelectedCustomer(match);
            setCustomerResults(result.data);
            setCustomerSearchStatus("success");
          }
        }
      });
    }
    // Intentional once on mount for deep-link prefill
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepStatus = useMemo(() => {
    const map: Record<CommercialStepId, CommercialStepStatus> = {
      "base-price": !resolvedBase
        ? activeStep === "base-price"
          ? "current"
          : "incomplete"
        : stepErrors["base-price"]
          ? "error"
          : activeStep === "base-price"
            ? "current"
            : "complete",
      components: !resolvedBase
        ? "locked"
        : !composition
          ? activeStep === "components"
            ? "current"
            : "incomplete"
          : stepErrors.components
            ? "error"
            : activeStep === "components"
              ? "current"
              : "complete",
      tax: !composition
        ? "locked"
        : !taxResult
          ? activeStep === "tax"
            ? "current"
            : "incomplete"
          : stepErrors.tax
            ? "error"
            : activeStep === "tax"
              ? "current"
              : "complete",
      review: !snapshot || !expected
        ? !taxResult
          ? "locked"
          : activeStep === "review"
            ? "current"
            : "incomplete"
        : activeStep === "review"
          ? "current"
          : "complete",
    };
    return map;
  }, [
    activeStep,
    resolvedBase,
    composition,
    taxResult,
    snapshot,
    expected,
    stepErrors,
  ]);

  const steps: CommercialStepDefinition[] = [
    {
      id: "base-price",
      label: "Customer & price",
      shortLabel: "Price",
      status: stepStatus["base-price"],
    },
    {
      id: "components",
      label: "Charges",
      shortLabel: "Charges",
      status: stepStatus.components,
    },
    {
      id: "tax",
      label: "Tax",
      shortLabel: "Tax",
      status: stepStatus.tax,
    },
    {
      id: "review",
      label: "Review",
      shortLabel: "Review",
      status: stepStatus.review,
    },
  ];

  function clearFeedback() {
    setActionResult(null);
  }

  function applyActionError(
    step: CommercialStepId,
    error: {
      message: string;
      field?: string;
      code?: string;
      family?: string;
      actionableHint?: string;
    }
  ) {
    const detail = [error.message, error.actionableHint]
      .filter(Boolean)
      .join(" ");
    setActionResult(
      platformError(
        "Could not continue",
        detail,
        error.field
      )
    );
    setStepErrors((prev) => ({
      ...prev,
      [step]: {
        message: error.message,
        code: error.code,
        family: error.family,
        actionableHint: error.actionableHint,
      },
    }));
    if (error.field) {
      setFieldErrors((prev) => ({
        ...prev,
        [error.field as keyof FieldErrors]: error.message,
      }));
    }
  }

  function searchCustomers() {
    clearFeedback();
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerSearchStatus("idle");
      setCustomerResults([]);
      return;
    }
    setCustomerSearchStatus("searching");
    startTransition(async () => {
      const result = await searchCrmRecordsAction(q);
      if (!result.success) {
        setCustomerSearchStatus("error");
        setCustomerResults([]);
        setActionResult(
          platformError("Customer search failed", result.error.message)
        );
        return;
      }
      const normalized = result.data ?? [];
      setCustomerResults(normalized);
      setCustomerSearchStatus(normalized.length === 0 ? "empty" : "success");
    });
  }

  function searchOfferings() {
    clearFeedback();
    setOfferingSearchStatus("searching");
    startTransition(async () => {
      const result = await searchProductsAction(offeringQuery.trim());
      if (!result.success) {
        setOfferingSearchStatus("error");
        setOfferingResults([]);
        setActionResult(
          platformError("Offering search failed", result.error.message)
        );
        return;
      }
      const normalized = result.data ?? [];
      setOfferingResults(normalized);
      setOfferingSearchStatus(normalized.length === 0 ? "empty" : "success");
    });
  }

  function resolveBasePrice() {
    clearFeedback();
    setFieldErrors({});
    const errors: FieldErrors = {};
    if (!selectedCustomer?.partyId) {
      errors.customerId = "Select a customer to continue.";
    }
    if (!selectedOffering) {
      errors.offeringId = "Select a product or service from search results.";
    }
    if (!currencyCode.trim()) {
      errors.currencyCode = "Currency is required.";
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.quantity = "Quantity must be a positive number.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStepErrors((prev) => ({
        ...prev,
        "base-price": {
          message: "Fix the highlighted fields to continue.",
        },
      }));
      return;
    }

    startTransition(async () => {
      const result = await resolveCommercialBasePriceAction({
        offeringId: selectedOffering!.id,
        currencyCode: currencyCode.trim().toUpperCase(),
        quantity: Number(quantity),
        salesChannel: salesChannel.trim() || null,
        customerSegment: customerSegment.trim() || null,
        effectiveAt: effectiveAt.trim() || null,
        partyId: selectedCustomer!.partyId,
      });
      if (!result.success) {
        applyActionError("base-price", result.error);
        return;
      }
      setResolvedBase(result.data);
      setComposition(null);
      setTaxResult(null);
      setSnapshot(null);
      setExpected(null);
      setContract(null);
      setStepErrors((prev) => ({ ...prev, "base-price": undefined }));
      setActionResult(
        platformSuccess(
          "Price found",
          `${result.data.currencyCode} ${result.data.unitPrice} from ${result.data.catalogueName}.`
        )
      );
      setActiveStep("components");
    });
  }

  function composeComponents() {
    if (!resolvedBase) {
      return;
    }
    clearFeedback();
    startTransition(async () => {
      const result = await composeCommercialPrincipalAction(
        resolvedBase,
        Number(quantity) || 1
      );
      if (!result.success) {
        applyActionError("components", result.error);
        return;
      }
      setComposition(result.data);
      setTaxResult(null);
      setSnapshot(null);
      setExpected(null);
      setContract(null);
      setStepErrors((prev) => ({ ...prev, components: undefined }));
      setActionResult(
        platformSuccess(
          "Charges ready",
          `Principal ready. Running total ${result.data.currencyCode} ${result.data.payableCandidate}.`
        )
      );
      setActiveStep("tax");
    });
  }

  function applyTax() {
    if (!resolvedBase) {
      return;
    }
    clearFeedback();
    setFieldErrors({});
    const errors: FieldErrors = {};
    const rate = Number(ratePercent);
    if (!Number.isFinite(rate) || rate < 0) {
      errors.ratePercent = "Tax rate must be 0 or greater.";
    }
    if (!taxTypeCode.trim()) {
      errors.taxTypeCode = "Tax type is required.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStepErrors((prev) => ({
        ...prev,
        tax: {
          message: "Fix the highlighted tax fields to continue.",
        },
      }));
      return;
    }

    startTransition(async () => {
      const result = await applyCommercialTaxAction({
        resolvedBasePrice: resolvedBase,
        quantity: Number(quantity) || 1,
        taxTypeCode: taxTypeCode.trim(),
        taxTypeLabel: taxTypeLabel.trim() || taxTypeCode.trim(),
        ratePercent: rate,
        treatment,
      });
      if (!result.success) {
        applyActionError("tax", result.error);
        return;
      }
      setTaxResult(result.data.tax);
      setComposition(result.data.composition);
      setSnapshot(null);
      setExpected(null);
      setContract(null);
      setStepErrors((prev) => ({ ...prev, tax: undefined }));
      setActionResult(
        platformSuccess(
          "Tax applied",
          `Tax ${result.data.tax.totalTaxAmount} · Payable ${result.data.composition.payableCandidate}.`
        )
      );
      await finalizeSnapshot();
    });
  }

  function persistSaleHandoff(
    nextSnapshot: CommercialSnapshot,
    nextExpected: ExpectedCommercialAmount,
    nextContract: CommercialTransactionContract
  ) {
    if (!selectedCustomer?.partyId) {
      return;
    }
    saveCommercialSaleHandoff(
      buildCommercialSaleHandoff({
        partyId: selectedCustomer.partyId,
        crmId: selectedCustomer.crmId || null,
        customerName: selectedCustomer.displayName ?? null,
        offeringId: nextSnapshot.resolution.offeringId,
        offeringName: nextSnapshot.resolution.offeringName,
        quantity: nextSnapshot.resolution.quantity,
        currencyCode: nextExpected.currency,
        snapshot: nextSnapshot,
        expected: nextExpected,
        contract: nextContract,
      })
    );
  }

  function persistTaxHandoff(
    nextSnapshot: CommercialSnapshot,
    nextExpected: ExpectedCommercialAmount,
    nextContract: CommercialTransactionContract
  ) {
    const tax = nextSnapshot.resolution.tax;
    const firstTax = tax?.taxComponents[0];
    const taxable =
      firstTax?.calculationBasisAmount ??
      nextExpected.principalAmount ??
      "0";
    const taxAmount = tax?.totalTaxAmount ?? nextExpected.totalTaxAmount ?? "0";
    const taxCompId = firstTax?.componentId ?? "tax-component";
    const obligationDate = (nextSnapshot.resolution.effectiveAt || "").slice(
      0,
      10
    ) || new Date().toISOString().slice(0, 10);

    saveCommercialTaxHandoff(
      buildCommercialTaxHandoff({
        snapshotId: nextSnapshot.snapshotId,
        resolutionId: nextSnapshot.resolution.resolutionId,
        commercialContractId: nextContract.contractId,
        taxComponentId: taxCompId,
        taxTypeCode: firstTax?.taxTypeCode ?? (taxTypeCode.trim() || "VAT"),
        taxableAmount: String(taxable),
        taxAmount: String(taxAmount),
        currencyCode: nextExpected.currency,
        obligationDate,
        expectedAmount: nextExpected.expectedAmount,
        offeringName: nextSnapshot.resolution.offeringName,
        offeringId: nextSnapshot.resolution.offeringId,
        customerName: selectedCustomer?.displayName ?? null,
        partyId: selectedCustomer?.partyId ?? null,
        crmId: selectedCustomer?.crmId || null,
      })
    );
  }

  async function finalizeSnapshot() {
    if (!selectedOffering || !selectedCustomer?.partyId) {
      return;
    }
    const result = await finalizeCommercialExpectedAction({
      offeringId: selectedOffering.id,
      currencyCode: currencyCode.trim().toUpperCase(),
      quantity: Number(quantity) || 1,
      salesChannel: salesChannel.trim() || null,
      customerSegment: customerSegment.trim() || null,
      effectiveAt: effectiveAt.trim() || null,
      partyId: selectedCustomer.partyId,
      taxTypeCode: taxTypeCode.trim(),
      taxTypeLabel: taxTypeLabel.trim() || taxTypeCode.trim(),
      ratePercent: Number(ratePercent),
      treatment,
    });
    if (!result.success) {
      applyActionError("review", result.error);
      setActiveStep("review");
      return;
    }
    setSnapshot(result.data.snapshot);
    setExpected(result.data.expected);
    setContract(result.data.contract);
    setComposition(result.data.snapshot.resolution.composition);
    setTaxResult(result.data.snapshot.resolution.tax);
    persistTaxHandoff(
      result.data.snapshot,
      result.data.expected,
      result.data.contract
    );
    persistSaleHandoff(
      result.data.snapshot,
      result.data.expected,
      result.data.contract
    );
    setStepErrors((prev) => ({ ...prev, review: undefined }));
    setActionResult(
      platformSuccess(
        "Commercial result ready",
        `Expected ${result.data.expected.currency} ${result.data.expected.expectedAmount}. Continue to tax obligations when ready.`
      )
    );
    setActiveStep("review");
  }

  function goPrevious() {
    clearFeedback();
    const idx = STEP_ORDER.indexOf(activeStep);
    if (idx > 0) {
      setActiveStep(STEP_ORDER[idx - 1]!);
    }
  }

  function goNext() {
    clearFeedback();
    if (activeStep === "base-price") {
      if (resolvedBase) {
        setActiveStep("components");
      } else {
        resolveBasePrice();
      }
      return;
    }
    if (activeStep === "components") {
      if (composition) {
        setActiveStep("tax");
      } else {
        composeComponents();
      }
      return;
    }
    if (activeStep === "tax") {
      if (snapshot) {
        setActiveStep("review");
      } else if (taxResult) {
        startTransition(async () => {
          await finalizeSnapshot();
        });
      } else {
        applyTax();
      }
    }
  }

  function onStepSelect(stepId: CommercialStepId) {
    if (stepStatus[stepId] === "locked") {
      return;
    }
    clearFeedback();
    setActiveStep(stepId);
  }

  function resetWorkspace() {
    setActiveStep("base-price");
    setResolvedBase(null);
    setComposition(null);
    setTaxResult(null);
    setSnapshot(null);
    setExpected(null);
    setContract(null);
    setSelectedOffering(null);
    setOfferingResults([]);
    setOfferingSearchStatus("idle");
    setSelectedCustomer(null);
    setCustomerResults([]);
    setCustomerSearchStatus("idle");
    setFieldErrors({});
    setStepErrors({});
    setActionResult(
      platformSuccess(
        "Ready for a new pricing",
        "Select a customer and a product or service to begin."
      )
    );
  }

  const processingLabel =
    activeStep === "base-price"
      ? "Finding price…"
      : activeStep === "components"
        ? "Building charges…"
        : activeStep === "tax"
          ? "Applying tax…"
          : "Calculating expected amount…";

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sales", href: "/sales" },
          { label: "Price a sale" },
        ]}
      />
      <PageBackLink href="/sales" label="Back to Sales" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Price a sale</h1>
        <p className="text-sm text-muted-foreground">
          Choose a customer and product or service, apply tax, then review the
          expected amount. Payment collection is not available yet.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/customers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Customer Profile
          </Link>
          <Link
            href="/products"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Offerings
          </Link>
          <Link
            href="/products/pricing"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Pricing lists
          </Link>
          <Link
            href="/commercial/governance"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Commercial rules
          </Link>
        </div>
      </header>

      <CommercialResolutionStepper
        steps={steps}
        activeStep={activeStep}
        onStepSelect={onStepSelect}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
          {activeStep === "base-price" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">1. Customer & price</h2>
                <p className="text-sm text-muted-foreground">
                  Select the customer, then the product or service, and find the
                  applicable list price.
                </p>
              </div>

              {stepErrors["base-price"] ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">Price step</p>
                    <p>{stepErrors["base-price"].message}</p>
                    {stepErrors["base-price"].actionableHint ? (
                      <p className="mt-1 text-sm">
                        {stepErrors["base-price"].actionableHint}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs opacity-90">
                      No commercial amount was produced.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="customer-search">Customer *</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="customer-search"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search by customer name or number"
                    aria-invalid={Boolean(fieldErrors.customerId)}
                  />
                  <PlatformProcessingButton
                    type="button"
                    variant="secondary"
                    isProcessing={
                      isPending && customerSearchStatus === "searching"
                    }
                    processingLabel="Searching…"
                    idleLabel="Search"
                    onClick={searchCustomers}
                  >
                    Search
                  </PlatformProcessingButton>
                </div>
                <FieldError message={fieldErrors.customerId} />
              </div>

              <PlatformSearchState
                status={customerSearchStatus}
                emptyTitle="No customers found"
                emptyHints={[
                  "Try another name or customer number",
                  "Register the customer first",
                ]}
                createLabel="Open customers"
                onCreate={() => {
                  router.push("/customers/new");
                }}
                errorMessage="Retry the search, or check that a business is selected."
                onRetry={searchCustomers}
              >
                <ul className="divide-y rounded-lg border">
                  {customerResults.map((item) => {
                    const selected = selectedCustomer?.partyId === item.partyId;
                    return (
                      <li key={item.crmId || item.partyId}>
                        <button
                          type="button"
                          className={
                            selected
                              ? "flex w-full flex-col gap-0.5 bg-emerald-50 px-3 py-2 text-left"
                              : "flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/50"
                          }
                          onClick={() => setSelectedCustomer(item)}
                        >
                          <span className="text-sm font-medium">
                            {item.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.customerNumber || item.statusName}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </PlatformSearchState>

              {selectedCustomer ? (
                <p className="text-sm">
                  Customer: <strong>{selectedCustomer.displayName}</strong>
                </p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="offering-search">Product or service *</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="offering-search"
                    value={offeringQuery}
                    onChange={(e) => setOfferingQuery(e.target.value)}
                    placeholder="Search by name or code"
                    aria-invalid={Boolean(fieldErrors.offeringId)}
                  />
                  <PlatformProcessingButton
                    type="button"
                    variant="secondary"
                    isProcessing={
                      isPending && offeringSearchStatus === "searching"
                    }
                    processingLabel="Searching…"
                    idleLabel="Search"
                    onClick={searchOfferings}
                  >
                    Search
                  </PlatformProcessingButton>
                </div>
                <FieldError message={fieldErrors.offeringId} />
              </div>

              <PlatformSearchState
                status={offeringSearchStatus}
                emptyTitle="No offerings found"
                emptyHints={[
                  "A different name or code",
                  "Create the offering first",
                ]}
                createLabel="Open offerings"
                onCreate={() => {
                  router.push("/products");
                }}
                errorMessage="Retry the search, or check that a business is selected."
                onRetry={searchOfferings}
              >
                <ul className="divide-y rounded-lg border">
                  {offeringResults.map((item) => {
                    const selected = selectedOffering?.id === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={
                            selected
                              ? "flex w-full flex-col gap-0.5 bg-emerald-50 px-3 py-2 text-left"
                              : "flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/50"
                          }
                          onClick={() => setSelectedOffering(item)}
                        >
                          <span className="text-sm font-medium">
                            {item.productName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.productCode}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </PlatformSearchState>

              {selectedOffering ? (
                <p className="text-sm">
                  Offering: <strong>{selectedOffering.productName}</strong>
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Input
                    id="currency"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.currencyCode)}
                  />
                  <FieldError message={fieldErrors.currencyCode} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.quantity)}
                  />
                  <FieldError message={fieldErrors.quantity} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">Sales channel</Label>
                  <Input
                    id="channel"
                    value={salesChannel}
                    onChange={(e) => setSalesChannel(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segment">Customer segment</Label>
                  <Input
                    id="segment"
                    value={customerSegment}
                    onChange={(e) => setCustomerSegment(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="effectiveAt">Price date</Label>
                  <Input
                    id="effectiveAt"
                    type="datetime-local"
                    value={effectiveAt}
                    onChange={(e) => setEffectiveAt(e.target.value)}
                  />
                </div>
              </div>

              {resolvedBase ? (
                <Alert>
                  <AlertDescription>
                    <p className="font-medium">List price found</p>
                    <p>
                      {resolvedBase.currencyCode} {resolvedBase.unitPrice} ·{" "}
                      {resolvedBase.catalogueName}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null}

          {activeStep === "components" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">2. Charges</h2>
                <p className="text-sm text-muted-foreground">
                  Build the principal charge from the list price and quantity.
                </p>
              </div>
              {stepErrors.components ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">Charges step</p>
                    <p>{stepErrors.components.message}</p>
                    {stepErrors.components.actionableHint ? (
                      <p className="mt-1 text-sm">
                        {stepErrors.components.actionableHint}
                      </p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}
              {!composition ? (
                <PlatformEmptyState
                  title="No charges yet"
                  description="Build the principal charge to continue to tax."
                  actionLabel="Build charges"
                  onAction={composeComponents}
                  compact
                />
              ) : (
                <ComponentTable composition={composition} />
              )}
            </div>
          ) : null}

          {activeStep === "tax" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">3. Tax</h2>
                <p className="text-sm text-muted-foreground">
                  Apply the tax treatment for this commercial result. You can
                  refine governed tax rules under Commercial rules.
                </p>
              </div>
              {stepErrors.tax ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">Tax step</p>
                    <p>{stepErrors.tax.message}</p>
                    {stepErrors.tax.actionableHint ? (
                      <p className="mt-1 text-sm">
                        {stepErrors.tax.actionableHint}
                      </p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxTypeCode">Tax type *</Label>
                  <Input
                    id="taxTypeCode"
                    value={taxTypeCode}
                    onChange={(e) => setTaxTypeCode(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.taxTypeCode)}
                  />
                  <FieldError message={fieldErrors.taxTypeCode} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxTypeLabel">Tax label</Label>
                  <Input
                    id="taxTypeLabel"
                    value={taxTypeLabel}
                    onChange={(e) => setTaxTypeLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ratePercent">Rate % *</Label>
                  <Input
                    id="ratePercent"
                    type="number"
                    min={0}
                    step="any"
                    value={ratePercent}
                    onChange={(e) => setRatePercent(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.ratePercent)}
                  />
                  <FieldError message={fieldErrors.ratePercent} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatment">Treatment *</Label>
                  <select
                    id="treatment"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={treatment}
                    onChange={(e) =>
                      setTreatment(e.target.value as TaxTreatmentCode)
                    }
                  >
                    {Object.values(TAX_TREATMENT_CODES).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Applying tax…"
                idleLabel="Apply tax"
                onClick={applyTax}
              >
                Apply tax
              </PlatformProcessingButton>
              {taxResult && composition ? (
                <ComponentTable composition={composition} />
              ) : (
                <PlatformEmptyState
                  title="No tax applied yet"
                  description="Enter rate and treatment, then Apply tax."
                />
              )}
            </div>
          ) : null}

          {activeStep === "review" ? (
            !snapshot || !expected ? (
              <PlatformEmptyState
                title="Expected amount not ready"
                description="Complete Customer & price, Charges, and Tax, then calculate the expected amount."
                actionLabel="Calculate expected amount"
                onAction={() => {
                  startTransition(async () => {
                    await finalizeSnapshot();
                  });
                }}
                compact
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">4. Review</h2>
                  <p className="text-sm text-muted-foreground">
                    Confirm the commercial breakdown and expected amount. Next:
                    open tax obligations for this result — amounts are carried
                    forward automatically.
                  </p>
                </div>
                {stepErrors.review ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-medium">Review step</p>
                      <p>{stepErrors.review.message}</p>
                      {stepErrors.review.actionableHint ? (
                        <p className="mt-1 text-sm">
                          {stepErrors.review.actionableHint}
                        </p>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <PlatformInlineFormFeedback
                  result={platformSuccess(
                    "Expected amount calculated",
                    `${expected.currency} ${expected.expectedAmount} for ${selectedCustomer?.displayName ?? "customer"} · ${snapshot.resolution.offeringName}.`
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-900">
                      Expected amount
                    </p>
                    <p className="mt-1 text-xl font-semibold text-emerald-950">
                      {expected.currency} {expected.expectedAmount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      What the business expects to charge
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actual payment
                    </p>
                    <p className="mt-1 text-xl font-semibold text-muted-foreground">
                      Not available yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payment collection is a future capability
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Variance
                    </p>
                    <p className="mt-1 text-xl font-semibold text-muted-foreground">
                      Not available yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Revenue assurance is out of scope
                    </p>
                  </div>
                </div>

                {contract ? (
                  <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/50 p-3">
                    <p className="text-sm font-semibold text-sky-950">
                      Commercial result
                    </p>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Customer</dt>
                        <dd className="font-medium">
                          {selectedCustomer?.displayName ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Expected payable</dt>
                        <dd className="font-medium">
                          {contract.commercial.currency}{" "}
                          {contract.commercial.expectedPayable}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="font-medium">{contract.status}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Next action</dt>
                        <dd className="font-medium">
                          Create a sale or view tax obligations
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                <dl className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Offering</dt>
                    <dd className="font-medium">
                      {snapshot.resolution.offeringName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="font-medium">{snapshot.resolution.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Principal</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.principalAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Other charges</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.totalComponentAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Commission</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.totalCommissionAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.totalTaxAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Discounts</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.totalDiscountAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Payable</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.payableAmount}
                    </dd>
                  </div>
                </dl>
                <ComponentTable composition={snapshot.resolution.composition} />
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={createSaleHref({
                      partyId: selectedCustomer?.partyId,
                      crmId: selectedCustomer?.crmId,
                      customerName: selectedCustomer?.displayName,
                      offeringId: snapshot.resolution.offeringId,
                      offeringName: snapshot.resolution.offeringName,
                    })}
                    className={cn(buttonVariants())}
                  >
                    Create sale
                  </Link>
                  <Link
                    href={taxComplianceHandoffHref()}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    View tax obligations
                  </Link>
                  <Button type="button" variant="outline" onClick={resetWorkspace}>
                    Price another sale
                  </Button>
                  <Link
                    href="/products/pricing"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Open pricing lists
                  </Link>
                </div>
              </div>
            )
          ) : null}

          <PlatformFormActionFooter
            result={actionResult}
            isProcessing={isPending}
            processingLabel={processingLabel}
            onDismiss={clearFeedback}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={goPrevious}
                disabled={activeStep === "base-price" || isPending}
              >
                Previous
              </Button>
              {activeStep !== "review" ? (
                <PlatformProcessingButton
                  type="button"
                  isProcessing={isPending}
                  processingLabel={processingLabel}
                  idleLabel={
                    activeStep === "base-price" && !resolvedBase
                      ? "Find price"
                      : activeStep === "components" && !composition
                        ? "Build charges"
                        : activeStep === "tax" && !taxResult
                          ? "Apply tax"
                          : "Next"
                  }
                  onClick={goNext}
                >
                  {activeStep === "base-price" && !resolvedBase
                    ? "Find price"
                    : activeStep === "components" && !composition
                      ? "Build charges"
                      : activeStep === "tax" && !taxResult
                        ? "Apply tax"
                        : "Next"}
                </PlatformProcessingButton>
              ) : (
                <Link
                  href={taxComplianceHandoffHref()}
                  className={cn(buttonVariants())}
                >
                  View tax obligations
                </Link>
              )}
            </div>
          </PlatformFormActionFooter>
        </section>

        <aside className="platform-workspace-guidance-column space-y-4 p-4">
          <h2 className="text-sm font-semibold">Where you are</h2>
          <p className="text-sm text-muted-foreground">
            {guidanceCopy(activeStep)}
          </p>
          <h2 className="text-sm font-semibold">What to do next</h2>
          <p className="text-sm text-muted-foreground">
            {nextCopy(
              activeStep,
              Boolean(resolvedBase),
              Boolean(composition),
              Boolean(taxResult),
              Boolean(snapshot && expected)
            )}
          </p>
          {Object.values(stepErrors).some(Boolean) ? (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-medium">Step needs attention</p>
                <p>
                  Open the highlighted step and correct the fields marked below
                  each input.
                </p>
              </AlertDescription>
            </Alert>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function guidanceCopy(step: CommercialStepId): string {
  switch (step) {
    case "base-price":
      return "Pick the customer and offering, then find the applicable list price. Overlapping prices must be fixed in Pricing lists — this screen will not pick arbitrarily.";
    case "components":
      return "Build the principal charge from the list price and quantity.";
    case "tax":
      return "Apply tax treatment and rate for this commercial result.";
    case "review":
      return "Confirm the expected amount. Actual payment and variance are not available yet. Continue to tax obligations without retyping amounts.";
  }
}

function nextCopy(
  step: CommercialStepId,
  hasBase: boolean,
  hasComposition: boolean,
  hasTax: boolean,
  hasReview: boolean
): string {
  switch (step) {
    case "base-price":
      return hasBase
        ? "Continue to Charges, or find the price again with different options."
        : "Search and select a customer and offering, then Find price.";
    case "components":
      return hasComposition
        ? "Continue to Tax."
        : "Build charges to create the principal line.";
    case "tax":
      return hasTax
        ? "Continue to Review to confirm the expected amount."
        : "Enter tax treatment and rate, then Apply tax.";
    case "review":
      return hasReview
        ? "Open Tax obligations to record filing and remittance for this result."
        : "Calculate the expected amount to finish this pricing.";
  }
}

function ComponentTable({
  composition,
}: {
  composition: ResolvedCommercialComposition;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Basis</th>
            <th className="px-3 py-2 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {composition.components.map((c) => (
            <tr key={c.componentId} className="border-t">
              <td className="px-3 py-2">{c.componentTypeCode}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {c.calculationBasis}
              </td>
              <td className="px-3 py-2 font-medium">
                {composition.currencyCode} {c.amount}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30">
            <td className="px-3 py-2 font-semibold" colSpan={2}>
              Running total
            </td>
            <td className="px-3 py-2 font-semibold">
              {composition.currencyCode} {composition.payableCandidate}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
