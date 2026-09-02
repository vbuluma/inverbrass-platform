"use client";

/**
 * Purpose:
 * Create an RFX from approved purchase requests. Budget is taken from those requests.
 * Evaluation criteria are configured after tender close (evaluation workflow).
 */

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSourcingEventAction } from "@/modules/procurement/actions/sourcing-actions";
import type { PurchaseRequestListView } from "@/modules/procurement/types";

type SourcingCreateFormProps = {
  approvedRequests: PurchaseRequestListView[];
  presetRequestId?: string | null;
};

function defaultClosesAtLocal(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function SourcingCreateForm({
  approvedRequests,
  presetRequestId,
}: SourcingCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [rfxType, setRfxType] = useState("RFQ");
  const [closesAt, setClosesAt] = useState(defaultClosesAtLocal);
  const [riskLevel, setRiskLevel] = useState("LOW");
  const [requestedOpeningPolicy, setRequestedOpeningPolicy] = useState("ORGANISATION_DEFAULT");
  const [selected, setSelected] = useState<string[]>(
    presetRequestId ? [presetRequestId] : []
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id]
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createSourcingEventAction({
        title,
        rfxType,
        purchaseRequestIds: selected,
        closesAt: new Date(closesAt).toISOString(),
        riskLevel,
        requestedOpeningPolicy,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/procurement/sourcing/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/sourcing" label="RFX" />
      <div>
        <h1 className="text-2xl font-semibold">New RFX</h1>
        <p className="text-sm text-muted-foreground">
          The budgeted amount comes from the approved purchase request(s) you select. Evaluation
          committee and criteria are set after the tender closes.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rfxType">Type</Label>
            <select
              id="rfxType"
              value={rfxType}
              onChange={(event) => setRfxType(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="RFQ">RFQ</option>
              <option value="RFI">RFI</option>
              <option value="RFP">RFP</option>
              <option value="RFX">RFX</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="closesAt">Closes at</Label>
            <Input
              id="closesAt"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="riskLevel">Risk level</Label>
            <select
              id="riskLevel"
              value={riskLevel}
              onChange={(event) => setRiskLevel(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openingPolicy">Opening policy</Label>
            <select
              id="openingPolicy"
              value={requestedOpeningPolicy}
              onChange={(event) => setRequestedOpeningPolicy(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="ORGANISATION_DEFAULT">Organisation default</option>
              <option value="STANDARD">Standard opening</option>
              <option value="MAKER_CHECKER">Maker-checker opening</option>
            </select>
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Approved purchase requests</legend>
          {approvedRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved purchase requests are ready for sourcing.
            </p>
          ) : (
            approvedRequests.map((row) => (
              <label key={row.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={() => toggle(row.id)}
                  className="mt-1"
                />
                <span>
                  {row.requestNumber} · {row.need} · {row.currencyCode} {row.estimatedValue}
                </span>
              </label>
            ))
          )}
        </fieldset>
        <Button type="submit" disabled={isPending || selected.length === 0}>
          {isPending ? "Creating…" : "Create RFX"}
        </Button>
      </form>
    </main>
  );
}
