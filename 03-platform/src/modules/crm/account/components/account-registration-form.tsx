/**
 * Purpose:
 * Register a CRM account with optional Party and CRM record linkage.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
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
import {
  createAccountAction,
  searchPartiesForAccountAction,
} from "@/modules/crm/account/actions/account-actions";
import type { AccountRegistrationCatalogues } from "@/modules/crm/account/types";
import type { PartySearchResultView } from "@/modules/party/types";

type AccountRegistrationFormProps = {
  catalogues: AccountRegistrationCatalogues;
  defaultCrmRecordId?: string;
};

export function AccountRegistrationForm({
  catalogues,
  defaultCrmRecordId,
}: AccountRegistrationFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accountTypeCode, setAccountTypeCode] = useState(
    catalogues.accountTypes[0]?.code ?? ""
  );
  const [statusCode, setStatusCode] = useState(
    catalogues.accountStatuses.find((s) => s.code === "PROSPECT")?.code ??
      catalogues.accountStatuses[0]?.code ??
      ""
  );
  const [crmRecordId, setCrmRecordId] = useState(defaultCrmRecordId ?? "");
  const [ownerPartyId, setOwnerPartyId] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState<PartySearchResultView[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartySearchResultView | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runPartySearch(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPartyResults([]);
      return;
    }

    startTransition(async () => {
      const result = await searchPartiesForAccountAction(trimmed);
      if (result.success) {
        setPartyResults(result.data);
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createAccountAction({
        name,
        accountTypeCode,
        statusCode,
        partyId: selectedParty?.id ?? null,
        crmRecordId: crmRecordId || null,
        ownerPartyId: ownerPartyId || null,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.push(`/accounts/${result.data.accountId}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/accounts" label="Back to accounts" />
      <Card>
        <CardHeader>
          <CardTitle>New account</CardTitle>
          <CardDescription>
            Link to a Party and CRM record where applicable — identity stays in BP-002.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Account name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Account type</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={accountTypeCode}
                  onChange={(event) => setAccountTypeCode(event.target.value)}
                >
                  {catalogues.accountTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={statusCode}
                  onChange={(event) => setStatusCode(event.target.value)}
                >
                  {catalogues.accountStatuses.map((status) => (
                    <option key={status.code} value={status.code}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="party">Linked party (optional)</Label>
              <Input
                id="party"
                value={partyQuery}
                onChange={(event) => {
                  setPartyQuery(event.target.value);
                  runPartySearch(event.target.value);
                }}
                placeholder="Search organisations or individuals..."
              />
              {partyResults.map((party) => (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => {
                    setSelectedParty(party);
                    setPartyQuery(party.displayName);
                    setPartyResults([]);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  <span>{party.displayName}</span>
                  <span className="text-muted-foreground">{party.partyNumber}</span>
                </button>
              ))}
              {selectedParty ? (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedParty.displayName}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="crmRecordId">CRM record ID (optional)</Label>
              <Input
                id="crmRecordId"
                value={crmRecordId}
                onChange={(event) => setCrmRecordId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <select
                id="owner"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ownerPartyId}
                onChange={(event) => setOwnerPartyId(event.target.value)}
              >
                <option value="">Unassigned</option>
                {catalogues.ownerParties.map((owner) => (
                  <option key={owner.partyId} value={owner.partyId}>
                    {owner.displayName}
                  </option>
                ))}
              </select>
            </div>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            <div className="flex gap-3">
              <PlatformProcessingButton
                type="submit"
                isProcessing={isPending}
                idleLabel="Create account"
                processingLabel={PROCESSING_LABELS.saving}
              />
              <Link href="/accounts" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
