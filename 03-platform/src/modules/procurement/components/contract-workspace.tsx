"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateContractAction,
  amendContractAction,
  approveContractAction,
  createContractCallOffAction,
  rejectContractAction,
  submitContractAction,
  suspendContractAction,
  terminateContractAction,
} from "@/modules/procurement/actions/contract-actions";
import type { ContractView } from "@/modules/procurement/types";

type ContractWorkspaceProps = {
  initial: ContractView;
};

export function ContractWorkspace({ initial }: ContractWorkspaceProps) {
  const router = useRouter();
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [callOffDescription, setCallOffDescription] = useState("Contract call-off");
  const [callOffAmount, setCallOffAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(task: () => Promise<{ success: boolean; error?: { message: string }; data?: ContractView }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        setError(result.error?.message ?? "Action failed.");
        return;
      }
      if (result.data) {
        setEvent(result.data);
      }
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/contracts" label="Contracts" />
      <div>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {event.contractNumber} · {event.partyName} · {event.statusLabel}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">Overview</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{event.contractTypeCode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Owner</dt>
              <dd>{event.ownerName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{event.sourceType}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="font-semibold">Commercial</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="text-muted-foreground">Total value</dt>
              <dd>{event.totalValueLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ceiling</dt>
              <dd>{event.callOffCeilingLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Committed</dt>
              <dd>{event.committedAmountLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Remaining</dt>
              <dd>{event.remainingAmountLabel ?? "Uncapped"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Versions</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {event.versions.map((version) => (
            <li key={version.id}>
              v{version.versionNumber} — {version.status}
              {version.changeReason ? ` · ${version.changeReason}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Related purchase orders</h2>
        {event.relatedPurchaseOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No call-offs yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {event.relatedPurchaseOrders.map((row) => (
              <li key={row.poId}>
                <Link href={`/procurement/orders/${row.poId}`} className="font-medium hover:underline">
                  {row.poNumber}
                </Link>{" "}
                — {row.totalAmountLabel} · {row.statusLabel}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        {event.canSubmit ? (
          <Button disabled={isPending} onClick={() => run(() => submitContractAction(event.id))}>
            Submit for approval
          </Button>
        ) : null}
        {event.canApprove ? (
          <Button disabled={isPending} onClick={() => run(() => approveContractAction(event.id))}>
            Approve
          </Button>
        ) : null}
        {event.canReject ? (
          <Button
            variant="outline"
            disabled={isPending || !reason.trim()}
            onClick={() => run(() => rejectContractAction(event.id, { reason }))}
          >
            Reject
          </Button>
        ) : null}
        {event.canActivate ? (
          <Button
            disabled={isPending}
            onClick={() =>
              run(() =>
                activateContractAction(event.id, {
                  executionEvidenceDocumentId: "evidence-doc-1",
                })
              )
            }
          >
            Activate
          </Button>
        ) : null}
        {event.canAmend ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(() =>
                amendContractAction(event.id, {
                  changeReason: reason.trim() || "Commercial amendment",
                  totalValue: event.totalValue,
                })
              )
            }
          >
            Amend
          </Button>
        ) : null}
        {event.canSuspend ? (
          <Button
            variant="outline"
            disabled={isPending || !reason.trim()}
            onClick={() => run(() => suspendContractAction(event.id, { reason }))}
          >
            Suspend
          </Button>
        ) : null}
        {event.canTerminate ? (
          <Button
            variant="outline"
            disabled={isPending || !reason.trim()}
            onClick={() => run(() => terminateContractAction(event.id, { reason }))}
          >
            Terminate
          </Button>
        ) : null}
      </section>

      {(event.canReject || event.canSuspend || event.canTerminate || event.canAmend) && (
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" value={reason} onChange={(change) => setReason(change.target.value)} />
        </div>
      )}

      {event.canCreateCallOff ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Create call-off purchase order</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="callOffDescription">Description</Label>
              <Input
                id="callOffDescription"
                value={callOffDescription}
                onChange={(change) => setCallOffDescription(change.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callOffAmount">Amount</Label>
              <Input
                id="callOffAmount"
                value={callOffAmount}
                onChange={(change) => setCallOffAmount(change.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={isPending || !callOffAmount.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await createContractCallOffAction(event.id, {
                  description: callOffDescription,
                  amount: callOffAmount,
                });
                if (!result.success) {
                  setError(result.error.message);
                  return;
                }
                router.push(`/procurement/orders/${result.data.id}`);
              })
            }
          >
            Create purchase order
          </Button>
        </section>
      ) : null}
    </main>
  );
}
