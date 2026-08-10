/**
 * Purpose:
 * Register a lead from an existing Party.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
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
import {
  createLeadAction,
  searchPartiesForLeadRegistrationAction,
} from "@/modules/crm/lead/actions/lead-actions";
import type { LeadRegistrationCatalogues } from "@/modules/crm/lead/types";
import type { PartySearchResultView } from "@/modules/party/types";

type LeadRegistrationFormProps = {
  catalogues: LeadRegistrationCatalogues;
};

export function LeadRegistrationForm({ catalogues }: LeadRegistrationFormProps) {
  const router = useRouter();
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState<PartySearchResultView[]>([]);
  const [partySearchStatus, setPartySearchStatus] = useState<
    "idle" | "searching" | "empty" | "error" | "success"
  >("idle");
  const [selectedParty, setSelectedParty] = useState<PartySearchResultView | null>(
    null
  );
  const [sourceCode, setSourceCode] = useState(catalogues.leadSources[0]?.code ?? "");
  const [ownerPartyId, setOwnerPartyId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runPartySearch(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPartyResults([]);
      setPartySearchStatus("idle");
      return;
    }

    setPartySearchStatus("searching");
    startTransition(async () => {
      const result = await searchPartiesForLeadRegistrationAction(trimmed);
      if (!result.success) {
        setPartyResults([]);
        setPartySearchStatus("error");
        return;
      }
      setPartyResults(result.data);
      setPartySearchStatus(result.data.length === 0 ? "empty" : "success");
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedParty) {
      setErrorMessage("Select a party for this lead.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await createLeadAction({
        partyId: selectedParty.id,
        sourceCode,
        ownerPartyId: ownerPartyId || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.push(`/leads/${result.data.leadId}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/leads" label="Back to leads" />

      <Card>
        <CardHeader>
          <CardTitle>Register lead</CardTitle>
          <CardDescription>
            Link a lead to an existing party — same Party ID through conversion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="party-search">Party</Label>
              <Input
                id="party-search"
                value={partyQuery}
                onChange={(event) => {
                  setPartyQuery(event.target.value);
                  runPartySearch(event.target.value);
                }}
                placeholder="Search parties by name or number..."
              />
              <PlatformSearchState
                status={
                  partySearchStatus === "idle"
                    ? "idle"
                    : partySearchStatus === "searching"
                      ? "searching"
                      : partySearchStatus === "empty"
                        ? "empty"
                        : partySearchStatus === "error"
                          ? "error"
                          : "success"
                }
                emptyTitle="No parties matched your search"
              />
              {partyResults.length > 0 ? (
                <div className="space-y-2">
                  {partyResults.map((party) => (
                    <button
                      key={party.id}
                      type="button"
                      onClick={() => setSelectedParty(party)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                        selectedParty?.id === party.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{party.displayName}</div>
                        <div className="text-muted-foreground">
                          {party.partyNumber}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedParty ? (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedParty.displayName} ({selectedParty.partyNumber})
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source">Lead source</Label>
                <select
                  id="source"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sourceCode}
                  onChange={(event) => setSourceCode(event.target.value)}
                >
                  {catalogues.leadSources.map((source) => (
                    <option key={source.code} value={source.code}>
                      {source.name}
                    </option>
                  ))}
                </select>
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
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <div className="flex gap-3">
              <PlatformProcessingButton
                type="submit"
                isProcessing={isPending}
                idleLabel="Create lead"
                processingLabel={PROCESSING_LABELS.saving}
              />
              <Link href="/leads" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
