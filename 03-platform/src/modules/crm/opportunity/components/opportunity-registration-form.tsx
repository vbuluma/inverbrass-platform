/**
 * Purpose:
 * Register a new opportunity linked to a CRM customer record.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformProcessingButton, PROCESSING_LABELS } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOpportunityAction } from "@/modules/crm/opportunity/actions/opportunity-actions";
import type { OpportunityRegistrationCatalogues } from "@/modules/crm/opportunity/types";

type OpportunityRegistrationFormProps = {
  catalogues: OpportunityRegistrationCatalogues;
  defaultCrmRecordId?: string;
};

export function OpportunityRegistrationForm({
  defaultCrmRecordId,
}: OpportunityRegistrationFormProps) {
  const router = useRouter();
  const [crmRecordId, setCrmRecordId] = useState(defaultCrmRecordId ?? "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createOpportunityAction({
        crmRecordId,
        name,
        amount: amount || null,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.push(`/opportunities/${result.data.opportunityId}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/opportunities" label="Back to opportunities" />
      <Card>
        <CardHeader>
          <CardTitle>New opportunity</CardTitle>
          <CardDescription>
            Link to an existing CRM customer record — account/contact enrichment arrives in IP-04.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="crmRecordId">CRM record ID</Label>
              <Input
                id="crmRecordId"
                value={crmRecordId}
                onChange={(event) => setCrmRecordId(event.target.value)}
                placeholder="Customer record UUID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Opportunity name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            <div className="flex gap-3">
              <PlatformProcessingButton
                type="submit"
                isProcessing={isPending}
                idleLabel="Create opportunity"
                processingLabel={PROCESSING_LABELS.saving}
              />
              <Link href="/opportunities" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
