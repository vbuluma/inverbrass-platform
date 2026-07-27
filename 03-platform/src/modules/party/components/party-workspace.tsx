/**
 * Purpose:
 * Party Workspace — Overview tab functional; other tabs are placeholders.
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
  activatePartyAction,
  archivePartyAction,
  suspendPartyAction,
  updatePartyAction,
} from "@/modules/party/actions/party-actions";
import {
  FUTURE_TAB_MESSAGE,
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import type {
  PartyDetailView,
  PartyRegistrationCatalogues,
} from "@/modules/party/types";

type PartyWorkspaceProps = {
  party: PartyDetailView;
  catalogues: PartyRegistrationCatalogues;
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PartyWorkspace({ party, catalogues }: PartyWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshAfter(result: { success: boolean; error?: { message: string } }) {
    if (!result.success) {
      setError(result.error?.message ?? "Action failed.");
      return;
    }
    setError(null);
    setMessage("Party updated.");
    router.refresh();
  }

  function onSaveOverview(formData: FormData) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updatePartyAction(party.id, {
        displayName: String(formData.get("displayName") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
        gender: String(formData.get("gender") ?? ""),
        preferredLanguageCode: String(
          formData.get("preferredLanguageCode") ?? ""
        ),
        registrationNumber: String(formData.get("registrationNumber") ?? ""),
        taxNumber: String(formData.get("taxNumber") ?? ""),
        industryCode: String(formData.get("industryCode") ?? ""),
        organizationTypeCode: String(
          formData.get("organizationTypeCode") ?? ""
        ),
        website: String(formData.get("website") ?? ""),
      });
      refreshAfter(result);
    });
  }

  function runLifecycle(
    action: typeof activatePartyAction
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action(party.id);
      refreshAfter(result);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Party Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {party.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {party.partyNumber} · {party.partyTypeName} · {party.statusName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {party.statusCode !== PARTY_STATUS_CODES.ACTIVE ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending || party.statusCode === PARTY_STATUS_CODES.ARCHIVED}
                onClick={() => runLifecycle(activatePartyAction)}
              >
                Activate
              </Button>
            ) : null}
            {party.statusCode === PARTY_STATUS_CODES.ACTIVE ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => runLifecycle(suspendPartyAction)}
              >
                Suspend
              </Button>
            ) : null}
            {party.statusCode !== PARTY_STATUS_CODES.ARCHIVED ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => runLifecycle(archivePartyAction)}
              >
                Archive
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <nav
        aria-label="Party workspace tabs"
        className="flex gap-1 overflow-x-auto border-b pb-px"
      >
        {PARTY_WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-t-md px-3 py-2 text-sm transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-emerald-700 font-medium text-emerald-900"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>
                Core Party details. Party type cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={onSaveOverview} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField label="Party ID" value={party.partyNumber} />
                  <ReadOnlyField label="Party Type" value={party.partyTypeName} />
                  <ReadOnlyField label="Status" value={party.statusName} />
                  <ReadOnlyField
                    label="Registration Date"
                    value={formatDate(party.registrationDate)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    defaultValue={party.displayName}
                    required
                    maxLength={300}
                    disabled={party.statusCode === PARTY_STATUS_CODES.ARCHIVED}
                  />
                </div>

                {party.partyTypeCode === PARTY_TYPE_CODES.INDIVIDUAL &&
                party.individual ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        defaultValue={party.individual.dateOfBirth ?? ""}
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        name="gender"
                        defaultValue={party.individual.gender ?? ""}
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select gender</option>
                        {catalogues.genders.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredLanguageCode">
                        Preferred Language
                      </Label>
                      <select
                        id="preferredLanguageCode"
                        name="preferredLanguageCode"
                        defaultValue={
                          party.individual.preferredLanguageCode ?? ""
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
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
                    </div>
                  </>
                ) : null}

                {party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION &&
                party.organization ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">
                        Registration Number
                      </Label>
                      <Input
                        id="registrationNumber"
                        name="registrationNumber"
                        defaultValue={
                          party.organization.registrationNumber ?? ""
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Tax Number</Label>
                      <Input
                        id="taxNumber"
                        name="taxNumber"
                        defaultValue={party.organization.taxNumber ?? ""}
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industryCode">Industry</Label>
                      <select
                        id="industryCode"
                        name="industryCode"
                        defaultValue={party.organization.industryCode}
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {catalogues.industries.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationTypeCode">
                        Organization Type
                      </Label>
                      <select
                        id="organizationTypeCode"
                        name="organizationTypeCode"
                        defaultValue={party.organization.organizationTypeCode}
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {catalogues.organizationTypes.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        defaultValue={party.organization.website ?? ""}
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={party.notes ?? ""}
                    disabled={party.statusCode === PARTY_STATUS_CODES.ARCHIVED}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {party.statusCode !== PARTY_STATUS_CODES.ARCHIVED ? (
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving…" : "Save Overview"}
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Display Name" value={party.displayName} />
              <SummaryRow label="Type" value={party.partyTypeName} />
              <SummaryRow label="Status" value={party.statusName} />
              {party.individual ? (
                <>
                  <SummaryRow
                    label="Date of Birth"
                    value={formatDate(party.individual.dateOfBirth)}
                  />
                  <SummaryRow
                    label="Gender"
                    value={
                      catalogues.genders.find(
                        (g) => g.code === party.individual?.gender
                      )?.name ??
                      party.individual.gender ??
                      "—"
                    }
                  />
                  <SummaryRow
                    label="Language"
                    value={
                      catalogues.languages.find(
                        (l) =>
                          l.code === party.individual?.preferredLanguageCode
                      )?.name ??
                      party.individual.preferredLanguageCode ??
                      "—"
                    }
                  />
                </>
              ) : null}
              {party.organization ? (
                <>
                  <SummaryRow
                    label="Industry"
                    value={party.organization.industryName ?? "—"}
                  />
                  <SummaryRow
                    label="Org Type"
                    value={party.organization.organizationTypeName ?? "—"}
                  />
                  <SummaryRow
                    label="Website"
                    value={party.organization.website ?? "—"}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {PARTY_WORKSPACE_TABS.find((tab) => tab.id === activeTab)?.label}
            </CardTitle>
            <CardDescription>{FUTURE_TAB_MESSAGE}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
