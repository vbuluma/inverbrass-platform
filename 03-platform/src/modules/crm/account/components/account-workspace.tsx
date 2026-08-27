/**
 * Purpose:
 * Account workspace — hierarchy, contacts, consent indicators, SLA.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { PlatformProcessingButton, PROCESSING_LABELS } from "@/components/platform";
import { PlatformWorkspaceHeader } from "@/components/platform";
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
  assignAccountContactAction,
  removeAccountContactAction,
  searchPartiesForAccountAction,
} from "@/modules/crm/account/actions/account-actions";
import type {
  AccountDetailView,
  AccountRegistrationCatalogues,
} from "@/modules/crm/account/types";
import type { PartySearchResultView } from "@/modules/party/types";

type AccountWorkspaceProps = {
  account: AccountDetailView;
  catalogues: AccountRegistrationCatalogues;
};

export function AccountWorkspace({ account, catalogues }: AccountWorkspaceProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState<PartySearchResultView[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartySearchResultView | null>(
    null
  );
  const [roleCode, setRoleCode] = useState(catalogues.contactRoles[0]?.code ?? "");
  const [isPrimary, setIsPrimary] = useState(false);
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

  function assignContact() {
    if (!selectedParty) {
      setErrorMessage("Select a BP-002 party as the contact person.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await assignAccountContactAction(account.accountId, {
        contactPartyId: selectedParty.id,
        roleCode,
        isPrimary,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      setSelectedParty(null);
      setPartyQuery("");
      router.refresh();
    });
  }

  function removeContact(accountContactId: string, version: number) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await removeAccountContactAction(
        account.accountId,
        accountContactId,
        version
      );
      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SetBreadcrumbs
        items={[
          { label: "Accounts", href: "/accounts" },
          { label: account.accountNumber },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/accounts"
        backLabel="Back to accounts"
        workspaceLabel="Account"
        title={account.name}
        subtitle={`${account.accountNumber} · ${account.statusName}`}
        primaryActions={
          account.crmRecordId ? (
            <Link
              href={`/customers/${account.crmRecordId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Open customer
            </Link>
          ) : account.partyId ? (
            <Link
              href={`/parties/${account.partyId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Open party
            </Link>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Type" value={account.accountTypeName} />
            <Field label="Status" value={account.statusName} />
            <Field label="Owner" value={account.ownerDisplayName ?? "—"} />
            <Field label="Branch" value={account.branchName ?? "—"} />
            <Field label="Segment" value={account.segmentCode ?? "—"} />
            <Field label="Parent" value={account.parentAccountName ?? "—"} />
            <Field label="Linked party" value={account.partyDisplayName ?? "—"} />
            <Field
              label="Classification"
              value={
                account.classificationTags.length > 0
                  ? account.classificationTags.join(", ")
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & SLA</CardTitle>
            <CardDescription>ENG-003n consumption contract</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {account.assignmentSummary ? (
              <div className="space-y-2">
                <Field
                  label="Owner"
                  value={account.assignmentSummary.ownerDisplayName ?? "Assigned"}
                />
                <Field
                  label="SLA"
                  value={
                    account.assignmentSummary.isBreached ? "Breached" : "Within target"
                  }
                />
              </div>
            ) : (
              <p className="text-muted-foreground">No owner assignment recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hierarchy</CardTitle>
          <CardDescription>Child accounts under this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {account.children.length === 0 ? (
            <p className="text-sm text-muted-foreground">No child accounts.</p>
          ) : (
            account.children.map((child) => (
              <Link
                key={child.accountId}
                href={`/accounts/${child.accountId}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <div>
                  <div className="font-medium">{child.name}</div>
                  <div className="text-muted-foreground">{child.accountNumber}</div>
                </div>
                <span>{child.statusName}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            CRM roles only — identity and channels remain BP-002. Consent shown before
            outbound communication (IP-08).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {account.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact roles assigned.</p>
          ) : (
            account.contacts.map((contact) => (
              <div
                key={contact.accountContactId}
                className="rounded-lg border px-3 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {contact.contactDisplayName}
                      {contact.isPrimary ? " · Primary" : ""}
                    </div>
                    <div className="text-muted-foreground">
                      {contact.roleName}
                      {contact.influenceLevel ? ` · ${contact.influenceLevel}` : ""}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {contact.preferredEmail ?? "No email"} ·{" "}
                      {contact.preferredPhone ?? "No phone"}
                    </div>
                    <div className="mt-1">
                      {contact.canCommunicateOutbound ? (
                        <span className="text-emerald-700">Consent allows outbound</span>
                      ) : (
                        <span className="text-amber-700">
                          Check BP-002 consent before communicating
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/parties/${contact.contactPartyId}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Party
                    </Link>
                    <PlatformProcessingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      isProcessing={isPending}
                      idleLabel="Remove role"
                      processingLabel={PROCESSING_LABELS.saving}
                      onClick={() =>
                        removeContact(contact.accountContactId, contact.version)
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="space-y-3 border-t pt-4">
            <Label>Assign contact role</Label>
            <Input
              value={partyQuery}
              onChange={(event) => {
                setPartyQuery(event.target.value);
                runPartySearch(event.target.value);
              }}
              placeholder="Search BP-002 party (contact person)..."
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
                <span className="text-muted-foreground">{party.partyTypeName}</span>
              </button>
            ))}
            <div className="flex flex-wrap gap-3">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={roleCode}
                onChange={(event) => setRoleCode(event.target.value)}
              >
                {catalogues.contactRoles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(event) => setIsPrimary(event.target.checked)}
                />
                Primary contact
              </label>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                idleLabel="Assign role"
                processingLabel={PROCESSING_LABELS.saving}
                onClick={assignContact}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
