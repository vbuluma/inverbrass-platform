/**
 * Purpose:
 * Dynamic Party Registration form for Individuals and Organizations.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { cn } from "@/lib/utils";
import {
  createIndividualPartyAction,
  createOrganizationPartyAction,
} from "@/modules/party/actions/party-actions";
import { PARTY_TYPE_CODES, type PartyTypeCode } from "@/modules/party/constants";
import type { PartyRegistrationCatalogues } from "@/modules/party/types";

const DRAFT_STORAGE_KEY = "party-registration-draft";

type RegistrationDraft = Record<string, string> & {
  partyType: PartyTypeCode;
};

const EMPTY_REGISTRATION = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  preferredLanguageCode: "",
  mobile: "",
  organizationName: "",
  registrationNumber: "",
  taxNumber: "",
  industryCode: "",
  organizationTypeCode: "",
  email: "",
  website: "",
  notes: "",
};

type PartyRegistrationFormProps = {
  catalogues: PartyRegistrationCatalogues;
  initialType?: PartyTypeCode;
};

export function PartyRegistrationForm({
  catalogues,
  initialType,
}: PartyRegistrationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
    isHydrated,
  } = useFormDraft<RegistrationDraft>(DRAFT_STORAGE_KEY);
  const [partyTypeSelection, setPartyTypeSelection] = useState<PartyTypeCode>(
    initialType ?? PARTY_TYPE_CODES.INDIVIDUAL
  );
  const partyType =
    isHydrated && draftValues?.partyType
      ? draftValues.partyType
      : partyTypeSelection;
  const registrationDraft = draftValues
    ? {
        fullName: draftValues.fullName,
        dateOfBirth: draftValues.dateOfBirth,
        gender: draftValues.gender,
        preferredLanguageCode: draftValues.preferredLanguageCode,
        mobile: draftValues.mobile,
        organizationName: draftValues.organizationName,
        registrationNumber: draftValues.registrationNumber,
        taxNumber: draftValues.taxNumber,
        industryCode: draftValues.industryCode,
        organizationTypeCode: draftValues.organizationTypeCode,
        email: draftValues.email,
        website: draftValues.website,
        notes: draftValues.notes,
      }
    : undefined;
  const form = useControlledForm({
    initial: EMPTY_REGISTRATION,
    draft: registrationDraft,
    draftHydrated: isHydrated,
  });
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { isProcessing, run } = useAsyncAction();
  const { unsavedChangesDialog } = useUnsavedChangesGuard({ isDirty });

  function onSaveDraft() {
    saveDraft({
      ...(form.values as Record<string, string>),
      partyType,
    });
    setIsDirty(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      if (partyType === PARTY_TYPE_CODES.INDIVIDUAL) {
        const actionResult = await createIndividualPartyAction({
          fullName: form.textValue("fullName"),
          dateOfBirth: form.textValue("dateOfBirth"),
          gender: form.textValue("gender"),
          preferredLanguageCode: form.textValue("preferredLanguageCode"),
          mobile: form.textValue("mobile"),
          notes: form.textValue("notes"),
        });

        if (!actionResult.success) {
          setResult(
            actionResult.platform ??
              platformError(
                "Could not create individual",
                actionResult.error.message,
                actionResult.error.field
              )
          );
          return;
        }

        setResult(actionResult.platform ?? null);
        clearDraft();
        setIsDirty(false);
        return;
      }

      const actionResult = await createOrganizationPartyAction({
        organizationName: form.textValue("organizationName"),
        registrationNumber: form.textValue("registrationNumber"),
        taxNumber: form.textValue("taxNumber"),
        industryCode: form.textValue("industryCode"),
        organizationTypeCode: form.textValue("organizationTypeCode"),
        website: form.textValue("website"),
        mobile: form.textValue("mobile"),
        email: form.textValue("email"),
        notes: form.textValue("notes"),
      });

      if (!actionResult.success) {
        setResult(
          actionResult.platform ??
            platformError(
              "Could not create organization",
              actionResult.error.message,
              actionResult.error.field
            )
        );
        return;
      }

      setResult(actionResult.platform ?? null);
      clearDraft();
      setIsDirty(false);
    });
  }

  const processingLabel =
    partyType === PARTY_TYPE_CODES.INDIVIDUAL
      ? PROCESSING_LABELS.creatingIndividual
      : PROCESSING_LABELS.creatingOrganization;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/parties" label="Back to Party Dashboard" />
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
              onClick={() => {
                setPartyTypeSelection(PARTY_TYPE_CODES.INDIVIDUAL);
                setIsDirty(true);
              }}
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
              onClick={() => {
                setPartyTypeSelection(PARTY_TYPE_CODES.ORGANIZATION);
                setIsDirty(true);
              }}
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

          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="space-y-4"
            onChange={() => setIsDirty(true)}
          >
            {partyType === PARTY_TYPE_CODES.INDIVIDUAL ? (
              <>
                <Field label="Full Name" htmlFor="fullName" required>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    maxLength={300}
                    value={form.textValue("fullName")}
                    onChange={(event) => form.setField("fullName", event.target.value)}
                  />
                </Field>
                <Field label="Date of Birth" htmlFor="dateOfBirth" required>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={form.textValue("dateOfBirth")}
                    onChange={(event) => form.setField("dateOfBirth", event.target.value)}
                  />
                </Field>
                <Field label="Gender" htmlFor="gender" required>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={form.textValue("gender")}
                    onChange={(event) => form.setField("gender", event.target.value)}
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
                    value={form.textValue("preferredLanguageCode")}
                    onChange={(event) =>
                      form.setField("preferredLanguageCode", event.target.value)
                    }
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
                <Field label="Mobile" htmlFor="mobile" required>
                  <Input
                    id="mobile"
                    name="mobile"
                    required
                    maxLength={30}
                    placeholder="+254..."
                    value={form.textValue("mobile")}
                    onChange={(event) => form.setField("mobile", event.target.value)}
                  />
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
                    value={form.textValue("organizationName")}
                    onChange={(event) =>
                      form.setField("organizationName", event.target.value)
                    }
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
                    value={form.textValue("registrationNumber")}
                    onChange={(event) =>
                      form.setField("registrationNumber", event.target.value)
                    }
                  />
                </Field>
                <Field label="Tax Number (optional)" htmlFor="taxNumber">
                  <Input
                    id="taxNumber"
                    name="taxNumber"
                    maxLength={100}
                    value={form.textValue("taxNumber")}
                    onChange={(event) => form.setField("taxNumber", event.target.value)}
                  />
                </Field>
                <Field label="Industry" htmlFor="industryCode" required>
                  <select
                    id="industryCode"
                    name="industryCode"
                    required
                    value={form.textValue("industryCode")}
                    onChange={(event) => form.setField("industryCode", event.target.value)}
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
                    value={form.textValue("organizationTypeCode")}
                    onChange={(event) =>
                      form.setField("organizationTypeCode", event.target.value)
                    }
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
                <Field label="Mobile (optional)" htmlFor="mobile">
                  <Input
                    id="mobile"
                    name="mobile"
                    maxLength={30}
                    placeholder="+254..."
                    value={form.textValue("mobile")}
                    onChange={(event) => form.setField("mobile", event.target.value)}
                  />
                </Field>
                <Field label="Email (optional)" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    maxLength={255}
                    value={form.textValue("email")}
                    onChange={(event) => form.setField("email", event.target.value)}
                  />
                </Field>
                <Field label="Website (optional)" htmlFor="website">
                  <Input
                    id="website"
                    name="website"
                    placeholder="https://"
                    maxLength={500}
                    value={form.textValue("website")}
                    onChange={(event) => form.setField("website", event.target.value)}
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
                value={form.textValue("notes")}
                onChange={(event) => form.setField("notes", event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>

            <PlatformFormActionFooter
              result={result}
              isProcessing={isProcessing}
              processingLabel={processingLabel}
              draftSavedAt={draftSavedAt}
            >
              <PlatformProcessingButton
                type="submit"
                disabled={Boolean(result?.success)}
                isProcessing={isProcessing}
                processingLabel={processingLabel}
                idleLabel={
                  partyType === PARTY_TYPE_CODES.INDIVIDUAL
                    ? "Create Individual"
                    : "Create Organization"
                }
                className="w-full sm:w-auto"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={onSaveDraft}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => setIsDirty(false)}
              >
                Cancel
              </Button>
            </PlatformFormActionFooter>
          </form>
        </CardContent>
      </Card>
      {unsavedChangesDialog}
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
