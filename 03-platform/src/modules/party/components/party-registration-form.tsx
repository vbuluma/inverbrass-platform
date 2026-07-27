/**
 * Purpose:
 * Dynamic Party Registration form for Individuals and Organizations.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createIndividualPartyAction,
  createOrganizationPartyAction,
} from "@/modules/party/actions/party-actions";
import { PARTY_TYPE_CODES, type PartyTypeCode } from "@/modules/party/constants";
import type { PartyRegistrationCatalogues } from "@/modules/party/types";

type PartyRegistrationFormProps = {
  catalogues: PartyRegistrationCatalogues;
  initialType?: PartyTypeCode;
};

export function PartyRegistrationForm({
  catalogues,
  initialType,
}: PartyRegistrationFormProps) {
  const router = useRouter();
  const [partyType, setPartyType] = useState<PartyTypeCode>(
    initialType ?? PARTY_TYPE_CODES.INDIVIDUAL
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldError(null);

    startTransition(async () => {
      if (partyType === PARTY_TYPE_CODES.INDIVIDUAL) {
        const result = await createIndividualPartyAction({
          fullName: String(formData.get("fullName") ?? ""),
          dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
          gender: String(formData.get("gender") ?? ""),
          preferredLanguageCode: String(
            formData.get("preferredLanguageCode") ?? ""
          ),
          notes: String(formData.get("notes") ?? ""),
        });

        if (!result.success) {
          setError(result.error.message);
          setFieldError(result.error.field ?? null);
          return;
        }

        router.push(`/parties/${result.data.id}`);
        router.refresh();
        return;
      }

      const result = await createOrganizationPartyAction({
        organizationName: String(formData.get("organizationName") ?? ""),
        registrationNumber: String(formData.get("registrationNumber") ?? ""),
        taxNumber: String(formData.get("taxNumber") ?? ""),
        industryCode: String(formData.get("industryCode") ?? ""),
        organizationTypeCode: String(
          formData.get("organizationTypeCode") ?? ""
        ),
        website: String(formData.get("website") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      });

      if (!result.success) {
        setError(result.error.message);
        setFieldError(result.error.field ?? null);
        return;
      }

      router.push(`/parties/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link
          href="/parties"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-fit gap-2 px-0"
          )}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back to Party Dashboard
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Party Registration
          </h1>
          <p className="text-sm text-muted-foreground">
            Register an Individual or Organization in the master Party
            repository.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Party Type</CardTitle>
          <CardDescription>
            Fields change based on the selected type. Party type cannot be
            changed after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPartyType(PARTY_TYPE_CODES.INDIVIDUAL)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                partyType === PARTY_TYPE_CODES.INDIVIDUAL
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "hover:bg-muted/40"
              )}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setPartyType(PARTY_TYPE_CODES.ORGANIZATION)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                partyType === PARTY_TYPE_CODES.ORGANIZATION
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "hover:bg-muted/40"
              )}
            >
              Organization
            </button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
                {fieldError ? ` (${fieldError})` : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <form action={onSubmit} className="space-y-4">
            {partyType === PARTY_TYPE_CODES.INDIVIDUAL ? (
              <>
                <Field label="Full Name" htmlFor="fullName" required>
                  <Input id="fullName" name="fullName" required maxLength={300} />
                </Field>
                <Field label="Date of Birth" htmlFor="dateOfBirth" required>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                  />
                </Field>
                <Field label="Gender" htmlFor="gender" required>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select gender</option>
                    {catalogues.genders.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Preferred Language"
                  htmlFor="preferredLanguageCode"
                  required
                >
                  <select
                    id="preferredLanguageCode"
                    name="preferredLanguageCode"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select language</option>
                    {catalogues.languages.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field
                  label="Organization Name"
                  htmlFor="organizationName"
                  required
                >
                  <Input
                    id="organizationName"
                    name="organizationName"
                    required
                    maxLength={300}
                  />
                </Field>
                <Field
                  label="Registration Number (optional)"
                  htmlFor="registrationNumber"
                >
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    maxLength={100}
                  />
                </Field>
                <Field label="Tax Number (optional)" htmlFor="taxNumber">
                  <Input id="taxNumber" name="taxNumber" maxLength={100} />
                </Field>
                <Field label="Industry" htmlFor="industryCode" required>
                  <select
                    id="industryCode"
                    name="industryCode"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select industry</option>
                    {catalogues.industries.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Organization Type"
                  htmlFor="organizationTypeCode"
                  required
                >
                  <select
                    id="organizationTypeCode"
                    name="organizationTypeCode"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select organization type</option>
                    {catalogues.organizationTypes.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Website (optional)" htmlFor="website">
                  <Input
                    id="website"
                    name="website"
                    placeholder="https://"
                    maxLength={500}
                  />
                </Field>
              </>
            )}

            <Field label="Notes (optional)" htmlFor="notes">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={2000}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>

            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving…" : "Save Party"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
