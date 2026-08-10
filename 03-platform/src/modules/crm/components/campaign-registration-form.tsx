"use client";

/**
 * Minimal campaign registration form.
 */

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
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createCampaignAction } from "@/modules/crm/actions/campaign-actions";
import { CAMPAIGN_TYPE_CODES } from "@/modules/crm/constants";
import { useCrmCampaignLabels } from "@/modules/crm/crm-terminology-labels";

export function CampaignRegistrationForm() {
  const labels = useCrmCampaignLabels();
  const router = useRouter();
  const { isProcessing, run } = useAsyncAction();
  const [name, setName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [partyGroupId, setPartyGroupId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    await run(async () => {
      const result = await createCampaignAction({
        name: name.trim(),
        campaignType: CAMPAIGN_TYPE_CODES.EMAIL,
        currencyCode: currencyCode.trim().toUpperCase(),
        partyGroupId: partyGroupId.trim() || undefined,
        budgetAmount: Number(budgetAmount) || 0,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      router.push(`/campaigns/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <PageBackLink href="/campaigns" label={labels.backLabel} />
      <div>
        <h1 className="text-2xl font-semibold">{labels.createLabel}</h1>
        <p className="text-sm text-muted-foreground">
          Create a planned campaign and optionally link a party group audience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency</Label>
          <Input
            id="currencyCode"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value)}
            maxLength={3}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partyGroupId">Party Group ID (optional)</Label>
          <Input
            id="partyGroupId"
            value={partyGroupId}
            onChange={(event) => setPartyGroupId(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetAmount">Budget</Label>
          <Input
            id="budgetAmount"
            type="number"
            min="0"
            step="any"
            value={budgetAmount}
            onChange={(event) => setBudgetAmount(event.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <PlatformFormActionFooter className="flex gap-2">
          <PlatformProcessingButton
            type="submit"
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel="Create Campaign"
          />
          <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </Link>
        </PlatformFormActionFooter>
      </form>
    </main>
  );
}
