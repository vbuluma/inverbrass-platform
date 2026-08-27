"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createCrmCommunicationAddendumAction } from "@/modules/crm-communication/actions/crm-communication-actions";
import type { CrmCommunicationDetailView } from "@/modules/crm-communication/types";

type Props = { communication: CrmCommunicationDetailView };

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CrmCommunicationWorkspace({ communication }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addendum, setAddendum] = useState("");

  function saveAddendum(event: React.FormEvent) {
    event.preventDefault();
    if (!addendum.trim()) return;
    startTransition(async () => {
      const result = await createCrmCommunicationAddendumAction(communication.id, {
        summary: addendum.trim(),
      });
      if (result.success) {
        router.push(`/crm/communications/${result.data.id}`);
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/communications" label="Back to Communications" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {communication.communicationNumber}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {communication.subject || "Communication"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {communication.channelTypeLabel} · {communication.directionLabel} ·{" "}
            {communication.primaryPartyDisplayName}
          </p>
        </div>
        <Link
          href={`/parties/${communication.primaryPartyId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Open Party
        </Link>
      </div>

      <section className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">When</p>
          <p>{formatDate(communication.communicatedAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p>{communication.statusCode}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Consent</p>
          <p>{communication.consentCheckResult ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Channel value</p>
          <p>{communication.contactChannelValue ?? "—"}</p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">{communication.summary}</p>
      </section>

      {communication.threadEntries.length > 1 ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Thread</h2>
          <ul className="mt-2 divide-y text-sm">
            {communication.threadEntries.map((entry) => (
              <li key={entry.id} className="py-2">
                <Link
                  href={`/crm/communications/${entry.id}`}
                  className="font-medium text-primary underline"
                >
                  {entry.communicationNumber}
                </Link>{" "}
                · {entry.directionLabel} · {formatDate(entry.communicatedAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={saveAddendum} className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Addendum (append-only correction)</h2>
        <div className="space-y-2">
          <Label htmlFor="addendum">Addendum summary</Label>
          <textarea
            id="addendum"
            className={`${fieldClassName} min-h-20 py-2`}
            value={addendum}
            onChange={(e) => setAddendum(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Saving…" : "Create Addendum"}
        </Button>
      </form>
    </main>
  );
}
