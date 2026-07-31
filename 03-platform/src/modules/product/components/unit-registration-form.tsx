/**
 * Purpose:
 * Unit Registration form — create new units of measure.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { createUnitAction } from "@/modules/product/actions/unit-actions";
import { UNIT_STATUS_CODES } from "@/modules/product/constants";
import type { UnitRegistrationCataloguesView } from "@/modules/product/types";
import { UNIT_UI_LABELS } from "@/modules/product/unit-ui-labels";

type UnitRegistrationFormProps = {
  catalogues: UnitRegistrationCataloguesView;
};

export function UnitRegistrationForm({ catalogues }: UnitRegistrationFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const form = useControlledForm({
    initial: {
      categoryId: catalogues.categories[0]?.id ?? "",
      code: "",
      name: "",
      symbol: "",
      isBaseUnit: "false",
      conversionFactor: "1",
      decimalPrecision: "2",
      roundingRule: catalogues.roundingRules[0]?.code ?? "HALF_UP",
      status: catalogues.defaultStatus,
    },
    draftHydrated: true,
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      const isBaseUnit = form.textValue("isBaseUnit") === "true";
      const actionResult = await createUnitAction({
        categoryId: form.textValue("categoryId"),
        code: form.textValue("code"),
        name: form.textValue("name"),
        symbol: form.textValue("symbol"),
        isBaseUnit,
        conversionFactor: Number(form.textValue("conversionFactor")),
        decimalPrecision: Number(form.textValue("decimalPrecision")),
        roundingRule: form.textValue("roundingRule"),
        status: form.textValue("status"),
      });

      if (!actionResult.success) {
        setResult(platformError("Could not register unit", actionResult.error.message));
        return;
      }

      setResult(platformSuccess("Unit registered", "Redirecting to workspace…"));
      router.push(`/products/units/${actionResult.data.unit.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/products/units" label="Back to units" />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {UNIT_UI_LABELS.registrationTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {UNIT_UI_LABELS.registrationDescription}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="categoryId">Category</Label>
            <select
              id="categoryId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("categoryId")}
              onChange={(event) => form.setField("categoryId", event.target.value)}
              required
            >
              {catalogues.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={form.textValue("code")}
              onChange={(event) => form.setField("code", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={form.textValue("symbol")}
              onChange={(event) => form.setField("symbol", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.textValue("name")}
              onChange={(event) => form.setField("name", event.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="isBaseUnit"
              checked={form.textValue("isBaseUnit") === "true"}
              onCheckedChange={(checked) =>
                form.setField("isBaseUnit", checked === true ? "true" : "false")
              }
            />
            <Label htmlFor="isBaseUnit">Base unit for category</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversionFactor">Conversion factor</Label>
            <Input
              id="conversionFactor"
              type="number"
              min="0.0000000001"
              step="any"
              value={form.textValue("conversionFactor")}
              onChange={(event) =>
                form.setField("conversionFactor", event.target.value)
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimalPrecision">Decimal precision</Label>
            <Input
              id="decimalPrecision"
              type="number"
              min="0"
              max="10"
              value={form.textValue("decimalPrecision")}
              onChange={(event) =>
                form.setField("decimalPrecision", event.target.value)
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roundingRule">Rounding rule</Label>
            <select
              id="roundingRule"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("roundingRule")}
              onChange={(event) => form.setField("roundingRule", event.target.value)}
            >
              {catalogues.roundingRules.map((rule) => (
                <option key={rule.code} value={rule.code}>
                  {rule.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.textValue("status")}
              onChange={(event) => form.setField("status", event.target.value)}
            >
              {Object.values(UNIT_STATUS_CODES).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

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
          <Link href="/products/units" className="text-sm text-muted-foreground">
            Cancel
          </Link>
          <PlatformProcessingButton
            type="submit"
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel="Register Unit"
          >
            Register Unit
          </PlatformProcessingButton>
        </PlatformFormActionFooter>
      </form>
    </main>
  );
}
