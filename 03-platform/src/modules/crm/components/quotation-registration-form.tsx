"use client";

/**
 * Minimal quotation registration form.
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
import { createQuotationAction } from "@/modules/crm/actions/quotation-actions";
import { useCrmQuotationLabels } from "@/modules/crm/crm-terminology-labels";

export function QuotationRegistrationForm() {
  const labels = useCrmQuotationLabels();
  const router = useRouter();
  const { isProcessing, run } = useAsyncAction();
  const [partyId, setPartyId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [offeringId, setOfferingId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    await run(async () => {
      const result = await createQuotationAction({
        partyId: partyId.trim(),
        currencyCode: currencyCode.trim().toUpperCase(),
        lines: offeringId.trim()
          ? [
              {
                offeringId: offeringId.trim(),
                quantity: Number(quantity),
              },
            ]
          : undefined,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      router.push(`/quotations/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <PageBackLink href="/quotations" label={labels.backLabel} />
      <div>
        <h1 className="text-2xl font-semibold">{labels.createLabel}</h1>
        <p className="text-sm text-muted-foreground">
          Link a customer party and optionally add a first line item.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="partyId">Customer Party ID</Label>
          <Input
            id="partyId"
            value={partyId}
            onChange={(event) => setPartyId(event.target.value)}
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
          <Label htmlFor="offeringId">Offering ID (optional)</Label>
          <Input
            id="offeringId"
            value={offeringId}
            onChange={(event) => setOfferingId(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            step="any"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <PlatformFormActionFooter className="flex gap-2">
          <PlatformProcessingButton
            type="submit"
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel="Create Quotation"
          />
          <Link href="/quotations" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </Link>
        </PlatformFormActionFooter>
      </form>
    </main>
  );
}
