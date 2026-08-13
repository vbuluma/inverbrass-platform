/**
 * Purpose:
 * Commercial resolution workspace — progressive IP-01 → IP-09 UX (§14).
 *
 * Implementation Package:
 * BP-005 / IP-01–IP-09 – Commercial Resolution UX
 */

"use client";

import { useMemo, useState, useTransition } from "react";
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
  CommercialResolutionStepper,
  type CommercialStepDefinition,
  type CommercialStepId,
  type CommercialStepStatus,
} from "@/modules/commercial/components/commercial-resolution-stepper";
import {
  TAX_TREATMENT_CODES,
  type CommercialSnapshot,
  type CommercialTransactionContract,
  type ExpectedCommercialAmount,
  type ResolvedBasePrice,
  type ResolvedCommercialComposition,
  type TaxResolutionResult,
  type TaxTreatmentCode,
} from "@/modules/commercial";
import { searchProductsAction } from "@/modules/product/actions/product-actions";
import type { ProductSummaryView } from "@/modules/product/types";

type FieldErrors = Partial<
  Record<"offeringId" | "currencyCode" | "quantity" | "ratePercent" | "taxTypeCode", string>
>;

const STEP_ORDER: CommercialStepId[] = [
  "base-price",
  "components",
  "tax",
  "review",
];

export function CommercialResolutionWorkspace() {
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

  const [offeringQuery, setOfferingQuery] = useState("");
  const [offeringSearchStatus, setOfferingSearchStatus] =
    useState<PlatformSearchStateStatus>("idle");
  const [offeringResults, setOfferingResults] = useState<ProductSummaryView[]>(
    []
  );
  const [selectedOffering, setSelectedOffering] =
    useState<ProductSummaryView | null>(null);

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
      label: "Base price",
      shortLabel: "Price",
      status: stepStatus["base-price"],
    },
    {
      id: "components",
      label: "Components",
      shortLabel: "Components",
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
      label: "Review / Expected",
      shortLabel: "Expected",
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
    const detail = [
      error.family ? `[${error.family}]` : null,
      error.code ? `${error.code}:` : null,
      error.message,
    ]
      .filter(Boolean)
      .join(" ");
    const title = error.family
      ? `Could not continue (${error.family})`
      : "Could not continue";
    setActionResult(
      platformError(
        title,
        error.actionableHint
          ? `${detail} ${error.actionableHint}`
          : detail,
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
    if (!selectedOffering) {
      errors.offeringId = "Select an offering from search results.";
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
          "Base price resolved",
          `${result.data.currencyCode} ${result.data.unitPrice} from ${result.data.catalogueCode}.`
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
          "Components composed",
          `Principal ready. Payable candidate ${result.data.currencyCode} ${result.data.payableCandidate}.`
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

  async function finalizeSnapshot() {
    if (!selectedOffering) {
      return;
    }
    const result = await finalizeCommercialExpectedAction({
      offeringId: selectedOffering.id,
      currencyCode: currencyCode.trim().toUpperCase(),
      quantity: Number(quantity) || 1,
      salesChannel: salesChannel.trim() || null,
      customerSegment: customerSegment.trim() || null,
      effectiveAt: effectiveAt.trim() || null,
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
    setStepErrors((prev) => ({ ...prev, review: undefined }));
    setActionResult(
      platformSuccess(
        "Commercial contract ready (IP-10)",
        `Expected ${result.data.expected.currency} ${result.data.expected.expectedAmount}. Contract ${result.data.contract.contractId} validated for downstream consumption.`
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
    setFieldErrors({});
    setStepErrors({});
    setActionResult(
      platformSuccess(
        "Ready for a new resolution",
        "Search for an offering to begin."
      )
    );
  }

  const processingLabel =
    activeStep === "base-price"
      ? "Resolving price…"
      : activeStep === "components"
        ? "Composing components…"
        : activeStep === "tax"
          ? "Applying tax…"
          : "Calculating expected amount…";

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Commercial resolution" },
        ]}
      />
      <PageBackLink href="/dashboard" label="Back to dashboard" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Commercial resolution
        </h1>
        <p className="text-sm text-muted-foreground">
          Resolve an applicable base price (IP-01 via IP-05 precedence), compose
          commercial components (IP-02), apply tax (IP-03), freeze the commercial
          snapshot (IP-06), then derive the expected commercial amount (IP-07).
          Pricing conflicts fail closed — they are not silently resolved.
        </p>
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
                <h2 className="text-lg font-semibold">1. Base price (IP-01)</h2>
                <p className="text-sm text-muted-foreground">
                  Find the offering and resolve the applicable BP-003 price.
                </p>
              </div>

              {stepErrors["base-price"] ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">
                      Base price step
                      {stepErrors["base-price"].family
                        ? ` · ${stepErrors["base-price"].family}`
                        : ""}
                      {stepErrors["base-price"].code
                        ? ` · ${stepErrors["base-price"].code}`
                        : ""}
                    </p>
                    <p>{stepErrors["base-price"].message}</p>
                    {stepErrors["base-price"].actionableHint ? (
                      <p className="mt-1 text-sm">
                        {stepErrors["base-price"].actionableHint}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs opacity-90">
                      No commercial payable was produced.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="offering-search">Offering search</Label>
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
                  "Removing filters",
                  "Create the offering in the Product Workspace first",
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
                  Selected: <strong>{selectedOffering.productName}</strong>
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
                  <Label htmlFor="effectiveAt">Effective at</Label>
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
                    <p className="font-medium">Resolved base price</p>
                    <p>
                      {resolvedBase.currencyCode} {resolvedBase.unitPrice} ·{" "}
                      {resolvedBase.catalogueName} · item{" "}
                      {resolvedBase.pricingItemId}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null}

          {activeStep === "components" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">2. Components (IP-02)</h2>
                <p className="text-sm text-muted-foreground">
                  Build the principal commercial component from the resolved
                  base price.
                </p>
              </div>
              {stepErrors.components ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">
                      Components step
                      {stepErrors.components.family
                        ? ` · ${stepErrors.components.family}`
                        : ""}
                      {stepErrors.components.code
                        ? ` · ${stepErrors.components.code}`
                        : ""}
                    </p>
                    <p>{stepErrors.components.message}</p>
                    {stepErrors.components.actionableHint ? (
                      <p className="mt-1 text-sm">
                        {stepErrors.components.actionableHint}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs opacity-90">
                      No commercial payable was produced.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}
              {!composition ? (
                <PlatformEmptyState
                  title="No components yet"
                  description="Compose the principal component to continue to tax."
                  actionLabel="Compose components"
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
                <h2 className="text-lg font-semibold">3. Tax (IP-03)</h2>
                <p className="text-sm text-muted-foreground">
                  Configure session tax treatment. Persisted tax rule masters
                  are not yet available.
                </p>
              </div>
              {stepErrors.tax ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">
                      Tax step
                      {stepErrors.tax.family ? ` · ${stepErrors.tax.family}` : ""}
                      {stepErrors.tax.code ? ` · ${stepErrors.tax.code}` : ""}
                    </p>
                    <p>{stepErrors.tax.message}</p>
                    {stepErrors.tax.actionableHint ? (
                      <p className="mt-1 text-sm">
                        {stepErrors.tax.actionableHint}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs opacity-90">
                      No commercial payable was produced.
                    </p>
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
                description="Complete Base price, Components, and Tax, then finalize the IP-06 snapshot and IP-07 expected commercial amount."
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
                  <h2 className="text-lg font-semibold">
                    4. Review / Downstream contract (IP-06 → IP-10)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    IP-06 freezes the commercial calculation. IP-07 projects the
                    expected amount. IP-10 publishes the validated contract for
                    future BP-006 / BP-007 consumers — without recalculating
                    price or tax.
                  </p>
                </div>
                {stepErrors.review ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-medium">
                        Review / Expected step
                        {stepErrors.review.family
                          ? ` · ${stepErrors.review.family}`
                          : ""}
                        {stepErrors.review.code
                          ? ` · ${stepErrors.review.code}`
                          : ""}
                      </p>
                      <p>{stepErrors.review.message}</p>
                      {stepErrors.review.actionableHint ? (
                        <p className="mt-1 text-sm">
                          {stepErrors.review.actionableHint}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs opacity-90">
                        No commercial payable was produced.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : null}
                <PlatformInlineFormFeedback
                  result={platformSuccess(
                    "Expected commercial amount calculated",
                    `${expected.currency} ${expected.expectedAmount} from snapshot ${snapshot.snapshotId}.`
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-900">
                      Expected commercial amount
                    </p>
                    <p className="mt-1 text-xl font-semibold text-emerald-950">
                      {expected.currency} {expected.expectedAmount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      What the business expects to charge/collect
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
                      Payment collection is BP-007+
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
                      Downstream commercial contract (IP-10)
                    </p>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Commercial result</dt>
                        <dd className="font-medium">
                          {contract.commercial.currency}{" "}
                          {contract.commercial.expectedPayable}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Currency</dt>
                        <dd className="font-medium">
                          {contract.commercial.currency}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Snapshot</dt>
                        <dd className="font-mono text-xs">
                          {contract.identity.snapshotId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="font-medium">{contract.status}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Contract ID</dt>
                        <dd className="font-mono text-xs">
                          {contract.contractId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Next action</dt>
                        <dd className="font-medium">
                          Continue to transaction (BP-006+) / resolve issue
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
                    <dt className="text-muted-foreground">Currency</dt>
                    <dd className="font-medium">{expected.currency}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Principal</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.principalAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Components (charges)</dt>
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
                    <dt className="text-muted-foreground">Payable (IP-06)</dt>
                    <dd className="font-medium">
                      {expected.currency} {expected.payableAmount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Snapshot id</dt>
                    <dd className="font-mono text-xs">{snapshot.snapshotId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Integrity hash</dt>
                    <dd className="font-mono text-xs">
                      {snapshot.integrityHash}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Provenance pipeline</dt>
                    <dd className="font-mono text-xs">
                      {expected.provenance.pipeline}
                    </dd>
                  </div>
                </dl>
                <ComponentTable composition={snapshot.resolution.composition} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={resetWorkspace}>
                    Resolve another
                  </Button>
                  <Link
                    href="/products/pricing"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Open pricing master
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
                      ? "Resolve price"
                      : activeStep === "components" && !composition
                        ? "Compose components"
                        : activeStep === "tax" && !taxResult
                          ? "Apply tax"
                          : "Next"
                  }
                  onClick={goNext}
                >
                  {activeStep === "base-price" && !resolvedBase
                    ? "Resolve price"
                    : activeStep === "components" && !composition
                      ? "Compose components"
                      : activeStep === "tax" && !taxResult
                        ? "Apply tax"
                        : "Next"}
                </PlatformProcessingButton>
              ) : (
                <Button type="button" onClick={resetWorkspace}>
                  Resolve another
                </Button>
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
              Boolean(taxResult)
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
      return "IP-01 identifies eligible BP-003 prices; IP-05 selects the deterministic winner or returns PRICE_CONFLICT.";
    case "components":
      return "IP-02 builds the principal commercial component from the resolved base price.";
    case "tax":
      return "IP-03 calculates tax components using explicit treatment and rate.";
    case "review":
      return "IP-06 freezes the commercial snapshot. IP-07 derives the expected commercial amount from that snapshot only — not a second pricing engine. Actual payment and variance are not available yet.";
  }
}

function nextCopy(
  step: CommercialStepId,
  hasBase: boolean,
  hasComposition: boolean,
  hasTax: boolean
): string {
  switch (step) {
    case "base-price":
      return hasBase
        ? "Continue to Components, or resolve again with different dimensions."
        : "Search and select an offering, then Resolve price.";
    case "components":
      return hasComposition
        ? "Continue to Tax."
        : "Compose components to create the principal line.";
    case "tax":
      return hasTax
        ? "Continue to Review / Expected to freeze the snapshot and calculate expected amount."
        : "Enter tax treatment and rate, then Apply tax.";
    case "review":
      return "Resolve another commercial amount, or return to the dashboard. Payment collection and variance are not part of this screen.";
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
              Payable candidate
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
