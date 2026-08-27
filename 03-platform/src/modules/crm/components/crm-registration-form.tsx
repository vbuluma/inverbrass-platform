/**
 * Purpose:
 * Register a CRM customer record from an existing Party.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformProcessingButton,
  PlatformSearchState,
  PROCESSING_LABELS,
} from "@/components/platform";
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
import { searchPartiesForCrmRegistrationAction } from "@/modules/crm/actions/crm-actions";
import type { PartySearchResultView } from "@/modules/party/types";
import { createCrmRecordAction } from "@/modules/crm/actions/crm-actions";
import { useCrmDashboardLabels } from "@/modules/crm/crm-terminology-labels";
import { inferCrmTypeFromPartyType } from "@/modules/crm/services/crm-rules";
import type { CrmRegistrationCatalogues } from "@/modules/crm/types";

type CrmRegistrationFormProps = {
  catalogues: CrmRegistrationCatalogues;
};

export function CrmRegistrationForm({ catalogues }: CrmRegistrationFormProps) {
  const labels = useCrmDashboardLabels();
  const router = useRouter();
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState<PartySearchResultView[]>([]);
  const [partySearchStatus, setPartySearchStatus] = useState<
    "idle" | "searching" | "empty" | "error" | "success"
  >("idle");
  const [selectedParty, setSelectedParty] = useState<PartySearchResultView | null>(
    null
  );
  const [ownerPartyId, setOwnerPartyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function searchParties(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPartyResults([]);
      setPartySearchStatus("idle");
      return;
    }

    setPartySearchStatus("searching");
    startTransition(async () => {
      const result = await searchPartiesForCrmRegistrationAction(trimmed);
      if (!result.success) {
        setPartySearchStatus("error");
        setError(result.error.message);
        return;
      }
      setPartyResults(result.data);
      setPartySearchStatus(result.data.length === 0 ? "empty" : "success");
    });
  }

  function handleRegister() {
    if (!selectedParty) {
      setError("Select a party to register as a customer.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createCrmRecordAction({
        partyId: selectedParty.id,
        crmTypeCode: inferCrmTypeFromPartyType(selectedParty.partyTypeCode),
        ownerPartyId: ownerPartyId || null,
        branchId: branchId || null,
        sourceCode: sourceCode || null,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      router.push(`/customers/${result.data.crmId}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/customers" label={labels.backToDashboard} />

      <Card>
        <CardHeader>
          <CardTitle>{labels.registerCustomer}</CardTitle>
          <CardDescription>
            Link an existing party to a new CRM customer record. Party identity
            is never duplicated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="party-search">Find party</Label>
            <Input
              id="party-search"
              value={partyQuery}
              onChange={(event) => {
                const value = event.target.value;
                setPartyQuery(value);
                searchParties(value);
              }}
              placeholder="Search by party name or number…"
            />
            <PlatformSearchState
              status={partySearchStatus}
              emptyTitle="No parties matched your search."
              errorMessage={error ?? undefined}
              onRetry={() => searchParties(partyQuery)}
            >
              <div className="space-y-2">
                {partyResults.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onClick={() => setSelectedParty(party)}
                    className={`block w-full rounded-lg border p-3 text-left transition ${
                      selectedParty?.id === party.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="font-medium">{party.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {party.partyNumber} · {party.partyTypeName}
                    </div>
                  </button>
                ))}
              </div>
            </PlatformSearchState>
          </div>

          {selectedParty ? (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              Selected: <strong>{selectedParty.displayName}</strong> (
              {selectedParty.partyNumber})
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="owner-party">Owner (optional)</Label>
              <select
                id="owner-party"
                value={ownerPartyId}
                onChange={(event) => setOwnerPartyId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No owner assigned</option>
                {catalogues.ownerParties.map((party) => (
                  <option key={party.partyId} value={party.partyId}>
                    {party.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch (optional)</Label>
              <select
                id="branch"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No branch</option>
                {catalogues.branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="source">Source (optional)</Label>
              <select
                id="source"
                value={sourceCode}
                onChange={(event) => setSourceCode(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Not specified</option>
                {catalogues.sourceCodes.map((source) => (
                  <option key={source.code} value={source.code}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <PlatformProcessingButton
              type="button"
              onClick={handleRegister}
              isProcessing={isPending}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel="Create customer record"
              disabled={!selectedParty}
            />
            <Link href="/parties/new" className={buttonVariants({ variant: "outline" })}>
              Register new party first
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
