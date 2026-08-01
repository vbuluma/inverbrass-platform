/**
 * Purpose:
 * Bundle Registration wizard — details, product selection, quantities, review.
 */

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformCompletionCard,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import {
  createBundleAction,
  searchBundleProductsAction,
} from "@/modules/product/actions/product-bundle-actions";
import {
  BUNDLE_REGISTRATION_STEPS,
  BUNDLE_UI_LABELS,
} from "@/modules/product/bundle-ui-labels";
import type {
  BundleProductSearchResult,
  BundleRegistrationCataloguesView,
} from "@/modules/product/types";

type DraftItem = {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  mandatory: boolean;
  displayOrder: number;
};

type BundleRegistrationWizardProps = {
  catalogues: BundleRegistrationCataloguesView;
};

export function BundleRegistrationWizard({
  catalogues,
}: BundleRegistrationWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<BundleProductSearchResult[]>(
    []
  );
  const [selectedItems, setSelectedItems] = useState<DraftItem[]>([]);
  const [completedBundleId, setCompletedBundleId] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const { isProcessing, run } = useAsyncAction();

  const form = useControlledForm({
    initial: {
      bundleCode: "",
      bundleName: "",
      description: "",
      bundleType: catalogues.bundleTypes[0]?.code ?? "STANDARD_PACKAGE",
      ownerPartyId: "",
      statusCode: catalogues.defaultStatus,
      pricingStrategy: catalogues.pricingStrategies[0]?.code ?? "SUM_OF_ITEMS",
      availabilityType: catalogues.availabilityTypes[0]?.code ?? "ACTIVE",
    },
    draftHydrated: true,
  });

  const currentStep = BUNDLE_REGISTRATION_STEPS[stepIndex];

  function searchProducts(query: string) {
    startSearchTransition(async () => {
      const actionResult = await searchBundleProductsAction(
        query.trim().length >= 2 ? query : undefined
      );
      if (actionResult.success) {
        setProductResults(actionResult.data);
      }
    });
  }

  function addProduct(product: BundleProductSearchResult) {
    if (selectedItems.some((item) => item.productId === product.id)) {
      return;
    }
    setSelectedItems((current) => [
      ...current,
      {
        productId: product.id,
        productCode: product.productCode,
        productName: product.productName,
        quantity: 1,
        mandatory: true,
        displayOrder: current.length,
      },
    ]);
  }

  function removeProduct(productId: string) {
    setSelectedItems((current) =>
      current
        .filter((item) => item.productId !== productId)
        .map((item, index) => ({ ...item, displayOrder: index }))
    );
  }

  function updateItem(
    productId: string,
    patch: Partial<Pick<DraftItem, "quantity" | "mandatory" | "displayOrder">>
  ) {
    setSelectedItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, ...patch } : item
      )
    );
  }

  async function submitBundle() {
    setResult(null);
    await run(async () => {
      const actionResult = await createBundleAction({
        bundleCode: form.textValue("bundleCode"),
        bundleName: form.textValue("bundleName"),
        description: form.textValue("description") || null,
        bundleType: form.textValue("bundleType"),
        ownerPartyId: form.textValue("ownerPartyId") || null,
        statusCode: form.textValue("statusCode"),
        pricingStrategy: form.textValue("pricingStrategy"),
        availabilityType: form.textValue("availabilityType"),
        items: selectedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          mandatory: item.mandatory,
          displayOrder: item.displayOrder,
        })),
      });

      if (!actionResult.success) {
        setResult(platformError("Could not create bundle", actionResult.error.message));
        return;
      }

      setCompletedBundleId(actionResult.data.bundle.id);
      setResult(platformSuccess("Bundle created", "Your bundle has been registered."));
    });
  }

  function goNext() {
    if (stepIndex === 1 && selectedItems.length === 0) {
      setResult(platformError("Items required", "Select at least one active product."));
      return;
    }
    setResult(null);
    setStepIndex((current) => Math.min(current + 1, BUNDLE_REGISTRATION_STEPS.length - 1));
  }

  function goBack() {
    setResult(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  if (completedBundleId) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <PlatformCompletionCard
          title="Bundle registered"
          summary={[
            { label: "Code", value: form.textValue("bundleCode") },
            { label: "Name", value: form.textValue("bundleName") },
            { label: "Type", value: form.textValue("bundleType") },
            { label: "Items", value: String(selectedItems.length) },
          ]}
          nextActions={[
            {
              label: "Open workspace",
              href: `/products/bundles/${completedBundleId}`,
            },
            { label: "Back to dashboard", href: "/products/bundles" },
          ]}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/products/bundles" label="Back to bundles" />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {BUNDLE_UI_LABELS.registrationTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          Step {stepIndex + 1} of {BUNDLE_REGISTRATION_STEPS.length}: {currentStep.label}
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm">
        {BUNDLE_REGISTRATION_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={
              index === stepIndex
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : index < stepIndex
                  ? "rounded-full bg-muted px-3 py-1 text-muted-foreground"
                  : "rounded-full border px-3 py-1 text-muted-foreground"
            }
          >
            {step.label}
          </li>
        ))}
      </ol>

      {currentStep.id === "details" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bundleCode">Bundle code</Label>
            <Input
              id="bundleCode"
              value={form.textValue("bundleCode")}
              onChange={(event) => form.setField("bundleCode", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bundleType">Bundle type</Label>
            <select
              id="bundleType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("bundleType")}
              onChange={(event) => form.setField("bundleType", event.target.value)}
            >
              {catalogues.bundleTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bundleName">Bundle name</Label>
            <Input
              id="bundleName"
              value={form.textValue("bundleName")}
              onChange={(event) => form.setField("bundleName", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("description")}
              onChange={(event) => form.setField("description", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricingStrategy">Pricing strategy (placeholder)</Label>
            <select
              id="pricingStrategy"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("pricingStrategy")}
              onChange={(event) => form.setField("pricingStrategy", event.target.value)}
            >
              {catalogues.pricingStrategies.map((strategy) => (
                <option key={strategy.code} value={strategy.code}>
                  {strategy.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="availabilityType">Availability (placeholder)</Label>
            <select
              id="availabilityType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("availabilityType")}
              onChange={(event) => form.setField("availabilityType", event.target.value)}
            >
              {catalogues.availabilityTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {currentStep.id === "select-products" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productSearch">Search active products</Label>
            <Input
              id="productSearch"
              value={productQuery}
              onChange={(event) => {
                const value = event.target.value;
                setProductQuery(value);
                searchProducts(value);
              }}
              placeholder="Search by code or name…"
            />
          </div>
          <ul className="divide-y rounded-lg border">
            {(productResults.length > 0 ? productResults : []).map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{product.productName}</p>
                  <p className="text-muted-foreground">{product.productCode}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedItems.some((item) => item.productId === product.id)}
                  onClick={() => addProduct(product)}
                >
                  Add
                </Button>
              </li>
            ))}
            {productResults.length === 0 && !isSearching ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                Search to find active products to include in this bundle.
              </li>
            ) : null}
          </ul>
          {selectedItems.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {selectedItems.length} product(s) selected.
            </p>
          ) : null}
        </div>
      ) : null}

      {currentStep.id === "configure" ? (
        <ul className="space-y-3">
          {selectedItems.map((item) => (
            <li
              key={item.productId}
              className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4"
            >
              <div className="sm:col-span-2">
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">{item.productCode}</p>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={String(item.quantity)}
                  onChange={(event) =>
                    updateItem(item.productId, {
                      quantity: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <Checkbox
                  checked={item.mandatory}
                  onCheckedChange={(checked) =>
                    updateItem(item.productId, { mandatory: checked === true })
                  }
                />
                <Label>Mandatory</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => removeProduct(item.productId)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {currentStep.id === "review" ? (
        <div className="space-y-4 rounded-lg border p-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-medium">{form.textValue("bundleCode")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{form.textValue("bundleName")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{form.textValue("bundleType")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Items</dt>
              <dd className="font-medium">{selectedItems.length}</dd>
            </div>
          </dl>
          <ul className="divide-y rounded-md border text-sm">
            {selectedItems.map((item) => (
              <li key={item.productId} className="flex justify-between px-3 py-2">
                <span>
                  {item.productName} ({item.productCode})
                </span>
                <span className="text-muted-foreground">
                  Qty {item.quantity}
                  {item.mandatory ? " · Required" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result ? (
        <p
          className={
            result.success ? "text-sm text-emerald-700" : "text-sm text-destructive"
          }
        >
          {result.message}
        </p>
      ) : null}

      <PlatformFormActionFooter>
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
        ) : (
          <Link href="/products/bundles" className="text-sm text-muted-foreground">
            Cancel
          </Link>
        )}
        {stepIndex < BUNDLE_REGISTRATION_STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <PlatformProcessingButton
            type="button"
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel={BUNDLE_UI_LABELS.quickActionRegister}
            onClick={submitBundle}
          />
        )}
      </PlatformFormActionFooter>
    </main>
  );
}
