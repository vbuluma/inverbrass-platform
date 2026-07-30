/**
 * Purpose:
 * Product Registration form — create new catalogue entries.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
  useFormDraft,
  useUnsavedChangesGuard,
} from "@/components/platform";
import { platformError } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { createProductAction } from "@/modules/product/actions/product-actions";
import { ProductCapabilitiesPanel } from "@/modules/product/components/product-capabilities-panel";
import { PRODUCT_RECORD_SOURCE_CODES } from "@/modules/product/constants";
import type { ProductRegistrationCatalogues } from "@/modules/product/types";
import { PRODUCT_UI_LABELS } from "@/modules/product/ui-labels";

const DRAFT_STORAGE_KEY = "product-registration-draft";

const EMPTY_REGISTRATION = {
  productCode: "",
  productName: "",
  shortName: "",
  description: "",
  productTypeCode: "",
  ownerPartyId: "",
  defaultCurrency: "",
  launchDate: "",
  isSellable: "false",
  isPurchasable: "false",
  isBookable: "false",
  isRentable: "false",
  isSubscription: "false",
  isDigital: "false",
  isMigrated: "false",
  legacyCode: "",
  legacySystem: "",
  migrationBatch: "",
};

type ProductRegistrationFormProps = {
  catalogues: ProductRegistrationCatalogues;
  catalogueLabel?: string;
};

export function ProductRegistrationForm({
  catalogues,
  catalogueLabel = "Products",
}: ProductRegistrationFormProps) {
  const singularLabel = catalogueLabel.replace(/s$/, "");
  const formRef = useRef<HTMLFormElement>(null);
  const { draftValues, saveDraft, clearDraft, draftSavedAt, isHydrated } =
    useFormDraft<Record<string, string>>(DRAFT_STORAGE_KEY);
  const form = useControlledForm({
    initial: EMPTY_REGISTRATION,
    draft: isHydrated ? draftValues : undefined,
    draftHydrated: isHydrated,
  });
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { isProcessing, run } = useAsyncAction();
  const { unsavedChangesDialog } = useUnsavedChangesGuard({ isDirty });

  function boolValue(
    field: keyof typeof EMPTY_REGISTRATION
  ): boolean {
    return form.textValue(field) === "true";
  }

  function setBoolField(
    field: keyof typeof EMPTY_REGISTRATION,
    checked: boolean
  ) {
    form.setField(field, checked ? "true" : "false");
    setIsDirty(true);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      const isMigrated = boolValue("isMigrated");
      const actionResult = await createProductAction({
        productCode: form.textValue("productCode"),
        productName: form.textValue("productName"),
        shortName: form.textValue("shortName"),
        description: form.textValue("description"),
        productTypeCode: form.textValue("productTypeCode"),
        ownerPartyId: form.textValue("ownerPartyId") || undefined,
        defaultCurrency: form.textValue("defaultCurrency") || undefined,
        launchDate: form.textValue("launchDate") || undefined,
        isSellable: boolValue("isSellable"),
        isPurchasable: boolValue("isPurchasable"),
        isBookable: boolValue("isBookable"),
        isRentable: boolValue("isRentable"),
        isSubscription: boolValue("isSubscription"),
        isDigital: boolValue("isDigital"),
        recordSource: isMigrated
          ? PRODUCT_RECORD_SOURCE_CODES.MIGRATED
          : PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED,
        legacyCode: isMigrated ? form.textValue("legacyCode") : undefined,
        legacySystem: isMigrated ? form.textValue("legacySystem") : undefined,
        migrationBatch: isMigrated
          ? form.textValue("migrationBatch")
          : undefined,
      });

      if (!actionResult.success) {
        setResult(
          actionResult.platform ??
            platformError(
              "Could not create product",
              actionResult.error.message,
              actionResult.error.field
            )
        );
        return;
      }

      clearDraft();
      setIsDirty(false);
      setResult(actionResult.platform ?? null);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label={`Back to ${catalogueLabel}`} />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Register {singularLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a master {singularLabel.toLowerCase()} record in the enterprise catalogue.
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="space-y-6"
        onChange={() => setIsDirty(true)}
      >
        <Card>
          <CardHeader>
            <CardTitle>{PRODUCT_UI_LABELS.identityHeading}</CardTitle>
            <CardDescription>
              Core identifiers and classification for the offering master.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={form.textValue("productName")}
                onChange={(event) =>
                  form.setField("productName", event.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCode">Product Code</Label>
              <Input
                id="productCode"
                value={form.textValue("productCode")}
                onChange={(event) =>
                  form.setField("productCode", event.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name</Label>
              <Input
                id="shortName"
                value={form.textValue("shortName")}
                onChange={(event) =>
                  form.setField("shortName", event.target.value)
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.textValue("description")}
                onChange={(event) =>
                  form.setField("description", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productTypeCode">Product Type</Label>
              <select
                id="productTypeCode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.textValue("productTypeCode")}
                onChange={(event) =>
                  form.setField("productTypeCode", event.target.value)
                }
                required
              >
                <option value="">Select type…</option>
                {catalogues.productTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerPartyId">
                {PRODUCT_UI_LABELS.responsibleBusinessOwner}
              </Label>
              <select
                id="ownerPartyId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.textValue("ownerPartyId")}
                onChange={(event) =>
                  form.setField("ownerPartyId", event.target.value)
                }
              >
                <option value="">Unassigned</option>
                {catalogues.ownerParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.displayName} ({party.partyNumber})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {PRODUCT_UI_LABELS.responsibleBusinessOwnerHint}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <select
                id="defaultCurrency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.textValue("defaultCurrency")}
                onChange={(event) =>
                  form.setField("defaultCurrency", event.target.value)
                }
              >
                <option value="">None</option>
                {catalogues.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="launchDate">Launch Date</Label>
              <Input
                id="launchDate"
                type="date"
                value={form.textValue("launchDate")}
                onChange={(event) =>
                  form.setField("launchDate", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{PRODUCT_UI_LABELS.capabilitiesHeading}</CardTitle>
            <CardDescription>
              {PRODUCT_UI_LABELS.capabilitiesDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductCapabilitiesPanel
              productTypeCode={form.textValue("productTypeCode")}
              values={{
                isSellable: boolValue("isSellable"),
                isPurchasable: boolValue("isPurchasable"),
                isBookable: boolValue("isBookable"),
                isRentable: boolValue("isRentable"),
                isSubscription: boolValue("isSubscription"),
                isDigital: boolValue("isDigital"),
              }}
              onChange={(field, checked) => setBoolField(field, checked)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{PRODUCT_UI_LABELS.migrationHeading}</CardTitle>
            <CardDescription>
              Import details for products migrated from legacy systems.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={boolValue("isMigrated")}
                onCheckedChange={(checked) =>
                  setBoolField("isMigrated", checked === true)
                }
              />
              Existing product from a legacy system
            </label>
            {boolValue("isMigrated") ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legacyCode">Legacy Code</Label>
                  <Input
                    id="legacyCode"
                    value={form.textValue("legacyCode")}
                    onChange={(event) =>
                      form.setField("legacyCode", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legacySystem">Legacy System</Label>
                  <Input
                    id="legacySystem"
                    value={form.textValue("legacySystem")}
                    onChange={(event) =>
                      form.setField("legacySystem", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="migrationBatch">Migration Batch</Label>
                  <Input
                    id="migrationBatch"
                    value={form.textValue("migrationBatch")}
                    onChange={(event) =>
                      form.setField("migrationBatch", event.target.value)
                    }
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <PlatformFormActionFooter
          result={result}
          isProcessing={isProcessing}
          processingLabel={PROCESSING_LABELS.saving}
          draftSavedAt={draftSavedAt}
        >
          <PlatformProcessingButton
            type="submit"
            disabled={Boolean(result?.success)}
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel={`Create ${singularLabel}`}
            className="w-full sm:w-auto"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isProcessing}
            onClick={() => {
              saveDraft(form.values as Record<string, string>);
              setIsDirty(false);
            }}
          >
            Save Draft
          </Button>
          <Link href="/products">
            <Button type="button" variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
          </Link>
        </PlatformFormActionFooter>
      </form>

      {unsavedChangesDialog}
    </main>
  );
}
