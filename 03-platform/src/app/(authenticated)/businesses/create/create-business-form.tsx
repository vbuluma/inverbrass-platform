/**
 * Purpose:
 * Client form for Business Registration: Industry → filtered Template → Create.
 *
 * Design rationale:
 * Business Templates are filtered by Industry Solution. No global unscoped
 * business-type dropdown is used as the primary selection path.
 *
 * Why this exists:
 * BP-001 foundation correction — Industry Solutions drive template catalogues.
 */

"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { CatalogEmptyNotice } from "@/components/auth/catalog-empty-notice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBusinessUiAction } from "@/core/auth/actions/business-registration-actions";
import { CATALOG_EMPTY_MESSAGES } from "@/core/auth/catalog-messages";
import type {
  BusinessTypeOption,
  CountryOption,
  IndustryOption,
} from "@/core/auth/types";
import { cn } from "@/lib/utils";

type CreateBusinessFormProps = {
  industries: IndustryOption[];
  templates: BusinessTypeOption[];
  countries: CountryOption[];
  defaultBusinessName: string;
  defaultCountryCode: string;
  defaultMobileNumber: string;
};

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
);

export function CreateBusinessForm({
  industries,
  templates,
  countries,
  defaultBusinessName,
  defaultCountryCode,
  defaultMobileNumber,
}: CreateBusinessFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [industryId, setIndustryId] = useState("");
  const [businessTypeId, setBusinessTypeId] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTemplates = useMemo(
    () =>
      industryId
        ? templates.filter((template) => template.industryId === industryId)
        : [],
    [industryId, templates]
  );

  const catalogsReady = industries.length > 0 && countries.length > 0;
  const templatesReadyForIndustry =
    !industryId || filteredTemplates.length > 0;

  function handleIndustryChange(nextIndustryId: string) {
    setIndustryId(nextIndustryId);
    setBusinessTypeId("");
  }

  function handleSubmit(formData: FormData) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createBusinessUiAction({
        businessName: String(formData.get("businessName") ?? ""),
        industryId: String(formData.get("industryId") ?? ""),
        businessTypeId: String(formData.get("businessTypeId") ?? ""),
        countryCode: String(formData.get("countryCode") ?? defaultCountryCode),
        mobileNumber: defaultMobileNumber || undefined,
      });

      if (result && !result.success) {
        setErrorMessage(result.error.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {!catalogsReady ? (
        <CatalogEmptyNotice
          message={
            industries.length === 0
              ? CATALOG_EMPTY_MESSAGES.industries
              : CATALOG_EMPTY_MESSAGES.countries
          }
        />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          required
          defaultValue={defaultBusinessName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industryId">Industry solution</Label>
        <select
          id="industryId"
          name="industryId"
          required
          value={industryId}
          onChange={(event) => handleIndustryChange(event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled>
            Select an industry solution
          </option>
          {industries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessTypeId">Business template</Label>
        <select
          id="businessTypeId"
          name="businessTypeId"
          required
          value={businessTypeId}
          onChange={(event) => setBusinessTypeId(event.target.value)}
          disabled={!industryId || filteredTemplates.length === 0}
          className={selectClassName}
        >
          <option value="" disabled>
            {industryId
              ? "Select a business template"
              : "Select an industry first"}
          </option>
          {filteredTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {industryId && filteredTemplates.length === 0 ? (
          <CatalogEmptyNotice
            message={CATALOG_EMPTY_MESSAGES.businessTemplatesForIndustry}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="countryCode">Country</Label>
        <select
          id="countryCode"
          name="countryCode"
          required
          defaultValue={defaultCountryCode}
          className={selectClassName}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.phoneCode})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Prefills from Platform Registration. Base currency is derived from this
          country in Business Setup.
        </p>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={
          isPending ||
          !catalogsReady ||
          !templatesReadyForIndustry ||
          !industryId ||
          !businessTypeId
        }
        className="w-full"
      >
        {isPending ? "Creating business..." : "Continue to setup"}
      </Button>

      <Link
        href="/home"
        className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
      >
        Back to Platform Home
      </Link>
    </form>
  );
}
