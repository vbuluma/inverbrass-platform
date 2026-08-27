/**
 * Purpose:
 * Variant Registration form — create new product variants.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import {
  createVariantAction,
  getVariantRegistrationCataloguesAction,
} from "@/modules/product/actions/variant-actions";
import { DynamicAttributeRenderer } from "@/modules/product/components/dynamic-attribute-renderer";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { VariantRegistrationCataloguesView } from "@/modules/product/types";

type VariantRegistrationFormProps = {
  catalogues: VariantRegistrationCataloguesView;
  initialProductId?: string;
};

export function VariantRegistrationForm({
  catalogues,
  initialProductId,
}: VariantRegistrationFormProps) {
  const labels = useProductUiLabels();
  const router = useRouter();
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [registrationCatalogues, setRegistrationCatalogues] =
    useState(catalogues);
  const [syncedCatalogues, setSyncedCatalogues] = useState(catalogues);
  const [attributeValues, setAttributeValues] = useState<Record<string, unknown>>(
    () => {
      const values: Record<string, unknown> = {};
      for (const field of catalogues.attributeFields) {
        values[field.definition.code] = null;
      }
      return values;
    }
  );
  const [isLoadingCatalogues, startCatalogueTransition] = useTransition();
  const { isProcessing, run } = useAsyncAction();

  const defaultProductId =
    initialProductId ?? catalogues.products[0]?.id ?? "";

  const form = useControlledForm({
    initial: {
      productId: defaultProductId,
      variantCode: "",
      variantName: "",
      displayOrder: "0",
      status: catalogues.defaultStatus,
    },
    draftHydrated: true,
  });

  const selectedProductId = form.textValue("productId");

  if (registrationCatalogues !== syncedCatalogues) {
    setSyncedCatalogues(registrationCatalogues);
    const nextValues: Record<string, unknown> = {};
    for (const field of registrationCatalogues.attributeFields) {
      nextValues[field.definition.code] = null;
    }
    setAttributeValues(nextValues);
  }

  function loadCataloguesForProduct(productId: string) {
    startCatalogueTransition(async () => {
      const catalogueResult = await getVariantRegistrationCataloguesAction(
        productId || undefined
      );
      if (!catalogueResult.success) {
        return;
      }
      setRegistrationCatalogues(catalogueResult.data);
      const nextValues: Record<string, unknown> = {};
      for (const field of catalogueResult.data.attributeFields) {
        nextValues[field.definition.code] = null;
      }
      setAttributeValues(nextValues);
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    const productId = form.textValue("productId");
    if (!productId) {
      setResult(platformError("Parent required", "Select a parent offering."));
      return;
    }

    await run(async () => {
      const attributes = registrationCatalogues.attributeFields.map((field) => ({
        attributeDefinitionId: field.definition.id,
        value: attributeValues[field.definition.code] ?? null,
      }));

      const actionResult = await createVariantAction({
        productId,
        variantCode: form.textValue("variantCode"),
        variantName: form.textValue("variantName"),
        displayOrder: Number(form.textValue("displayOrder")),
        status: form.textValue("status"),
        attributes,
      });

      if (!actionResult.success) {
        setResult(
          platformError("Could not register variant", actionResult.error.message)
        );
        return;
      }

      setResult(
        platformSuccess(
          labels.actions.variantRegistered,
          labels.actions.redirectingToWorkspace
        )
      );
      router.push(`/products/variants/${actionResult.data.variant.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/products/variants" label={labels.variant.backToModule} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.variant.registrationTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {labels.variant.registrationDescription}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="productId">Parent offering</Label>
            <select
              id="productId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedProductId}
              onChange={(event) => {
                form.setField("productId", event.target.value);
                loadCataloguesForProduct(event.target.value);
              }}
              required
              disabled={isLoadingCatalogues}
            >
              {registrationCatalogues.products.length === 0 ? (
                <option value="">No offerings available</option>
              ) : (
                registrationCatalogues.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} ({product.productCode})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variantCode">Variant code</Label>
            <Input
              id="variantCode"
              value={form.textValue("variantCode")}
              onChange={(event) => form.setField("variantCode", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input
              id="displayOrder"
              type="number"
              min="0"
              value={form.textValue("displayOrder")}
              onChange={(event) => form.setField("displayOrder", event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="variantName">Variant name</Label>
            <Input
              id="variantName"
              value={form.textValue("variantName")}
              onChange={(event) => form.setField("variantName", event.target.value)}
              required
            />
          </div>
        </div>

        {registrationCatalogues.attributeFields.length > 0 ? (
          <div className="space-y-4 rounded-lg border border-border/60 p-4">
            <div>
              <h2 className="text-base font-semibold">Distinguishing attributes</h2>
              <p className="text-sm text-muted-foreground">
                At least one attribute value is required to distinguish this variant.
              </p>
            </div>
            <DynamicAttributeRenderer
              fields={registrationCatalogues.attributeFields}
              values={attributeValues}
              onChange={(code, value) =>
                setAttributeValues((current) => ({ ...current, [code]: value }))
              }
            />
          </div>
        ) : selectedProductId ? (
          <p className="text-sm text-muted-foreground">
            {isLoadingCatalogues
              ? "Loading attribute definitions…"
              : "No variant-scoped attributes are configured for this offering type."}
          </p>
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
          <Link href="/products/variants" className="text-sm text-muted-foreground">
            Cancel
          </Link>
          <PlatformProcessingButton
            type="submit"
            isProcessing={isProcessing || isLoadingCatalogues}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel={labels.variant.quickActionRegister}
          />
        </PlatformFormActionFooter>
      </form>
    </main>
  );
}
