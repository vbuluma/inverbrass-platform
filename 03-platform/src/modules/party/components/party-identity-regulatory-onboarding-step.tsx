/**
 * Purpose:
 * Guided onboarding step for Identity & Regulatory identifier capture after registration.
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  identityRegulatoryOnboardingNextActions,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
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
import { capturePartyIdentifierAction } from "@/modules/party/actions/party-identity-regulatory-actions";
import { PartyIdentityRegulatoryPanel } from "@/modules/party/components/party-identity-regulatory-panel";
import type { PartyDetailView, PartyIdentityRegulatoryPanelView } from "@/modules/party/types";

type PartyIdentityRegulatoryOnboardingStepProps = {
  party: PartyDetailView;
  initialPanel: PartyIdentityRegulatoryPanelView;
};

export function PartyIdentityRegulatoryOnboardingStep({
  party,
  initialPanel,
}: PartyIdentityRegulatoryOnboardingStepProps) {
  const [panel, setPanel] = useState(initialPanel);
  const [selectedTypeCode, setSelectedTypeCode] = useState(
    initialPanel.requiredIdentifiers.find((row) => row.isRequired)?.identifierTypeCode ?? ""
  );
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const form = useControlledForm({
    initial: {
      identifierValue: "",
    },
  });

  async function handleCapture() {
    if (!selectedTypeCode) {
      return;
    }

    await run(async () => {
      const actionResult = await capturePartyIdentifierAction(party.id, {
        identifierTypeCode: selectedTypeCode,
        identifierValue: form.textValue("identifierValue"),
      });

      if (!actionResult.success) {
        setResult(
          platformError("Capture failed", actionResult.error.message, actionResult.error.field)
        );
        return;
      }

      setPanel(actionResult.data);
      form.reset({ identifierValue: "" });
      setResult(
        platformSuccess(
          "Identifier captured",
          "Continue capturing required identifiers or proceed to documents.",
          actionResult.data,
          identityRegulatoryOnboardingNextActions(party.id)
        )
      );
    });
  }

  const missingRequired = panel.requiredIdentifiers.filter(
    (row) => row.isRequired && row.displayStatus === "MISSING"
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageBackLink href={`/parties/${party.id}`} label="Back to Party Workspace" />

      <div className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground">Party Registration → Identity & Regulatory</p>
        <h1 className="text-2xl font-semibold">Identity & Regulatory</h1>
        <p className="text-sm text-muted-foreground">
          Capture official regulatory identifiers for {party.displayName}. Requirements are
          loaded from ENG-003b — nothing is hardcoded.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Guided Capture</CardTitle>
          <CardDescription>
            {missingRequired.length > 0
              ? `${missingRequired.length} required identifier(s) still missing.`
              : "All required identifiers captured. You may continue to documents."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="identifierType">Identifier Type</Label>
            <select
              id="identifierType"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={selectedTypeCode}
              onChange={(event) => setSelectedTypeCode(event.target.value)}
            >
              <option value="">Select identifier type</option>
              {panel.requiredIdentifiers.map((row) => (
                <option key={row.identifierTypeCode} value={row.identifierTypeCode}>
                  {row.identifierTypeName}
                  {row.isRequired ? " (Required)" : " (Optional)"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="onboardingIdentifierValue">Identifier Value</Label>
            <Input
              id="onboardingIdentifierValue"
              value={form.textValue("identifierValue")}
              onChange={(event) => form.setField("identifierValue", event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <PlatformProcessingButton
              type="button"
              disabled={!selectedTypeCode || isProcessing}
              isProcessing={isProcessing}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel="Capture Identifier"
              onClick={handleCapture}
            />
            <Link
              href={`/parties/${party.id}?tab=documents`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium"
            >
              Skip to Documents
            </Link>
            <Link
              href={`/parties/${party.id}`}
              className="inline-flex h-9 items-center justify-center px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Finish Later
            </Link>
          </div>
        </CardContent>
      </Card>

      <PlatformFormActionFooter result={result} isProcessing={isProcessing}>
        <span />
      </PlatformFormActionFooter>

      <div className="mt-8">
        <PartyIdentityRegulatoryPanel partyId={party.id} initialData={panel} />
      </div>
    </main>
  );
}
