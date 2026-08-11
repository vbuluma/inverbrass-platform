"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  addCrmVisitActionItemAction,
  addCrmVisitAttendeeAction,
  approveCrmVisitAction,
  rejectCrmVisitAction,
  returnCrmVisitAction,
  submitCrmVisitAction,
  updateCrmVisitReportAction,
} from "@/modules/crm-visit/actions/crm-visit-actions";
import { CRM_VISIT_STATUS_CODES } from "@/modules/crm-visit/constants";
import type { CrmVisitDetailView } from "@/modules/crm-visit/types";

type Props = { visit: CrmVisitDetailView };

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CrmVisitWorkspace({ visit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [discussion, setDiscussion] = useState(visit.discussion ?? "");
  const [decisions, setDecisions] = useState(visit.decisions ?? "");
  const [risks, setRisks] = useState(visit.risks ?? "");
  const [nextSteps, setNextSteps] = useState(visit.nextSteps ?? "");
  const [minutesSummary, setMinutesSummary] = useState(visit.minutesSummary ?? "");
  const [attendeeName, setAttendeeName] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionDue, setActionDue] = useState("");

  function refresh() {
    router.refresh();
  }

  function saveReport(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateCrmVisitReportAction(visit.id, {
        discussion,
        decisions,
        risks,
        nextSteps,
        minutesSummary,
      });
      if (result.success) refresh();
    });
  }

  function addAttendee(event: React.FormEvent) {
    event.preventDefault();
    if (!attendeeName.trim()) return;
    startTransition(async () => {
      const result = await addCrmVisitAttendeeAction(visit.id, {
        displayName: attendeeName.trim(),
      });
      if (result.success) {
        setAttendeeName("");
        refresh();
      }
    });
  }

  function addAction(event: React.FormEvent) {
    event.preventDefault();
    if (!actionTitle.trim() || !actionDue) return;
    startTransition(async () => {
      const result = await addCrmVisitActionItemAction(visit.id, {
        title: actionTitle.trim(),
        ownerUserId: visit.ownerUserId,
        dueDate: new Date(actionDue).toISOString(),
      });
      if (result.success) {
        setActionTitle("");
        setActionDue("");
        refresh();
      }
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await submitCrmVisitAction(visit.id, {});
      if (result.success) refresh();
      else window.alert(result.error.message);
    });
  }

  function review(kind: "approve" | "return" | "reject") {
    const comments = window.prompt("Reviewer comments (required):");
    if (!comments?.trim()) return;
    startTransition(async () => {
      const action =
        kind === "approve"
          ? approveCrmVisitAction
          : kind === "return"
            ? returnCrmVisitAction
            : rejectCrmVisitAction;
      const result = await action(visit.id, { reviewerComments: comments.trim() });
      if (result.success) refresh();
      else window.alert(result.error.message);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/visits" label="Back to Visits" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{visit.visitNumber}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{visit.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {visit.visitTypeLabel} · {visit.primaryPartyDisplayName} · {visit.statusLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/parties/${visit.primaryPartyId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open Party
          </Link>
          {visit.linkedAppointmentId ? (
            <Link
              href={`/crm/appointments/${visit.linkedAppointmentId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Appointment
            </Link>
          ) : null}
          {visit.isEditable ? (
            <Button type="button" size="sm" disabled={isPending} onClick={submit}>
              Submit for Review
            </Button>
          ) : null}
          {visit.statusCode === CRM_VISIT_STATUS_CODES.SUBMITTED ? (
            <>
              <Button type="button" size="sm" disabled={isPending} onClick={() => review("approve")}>
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => review("return")}
              >
                Return
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => review("reject")}
              >
                Reject
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {visit.isEditable ? (
        <form onSubmit={saveReport} className="space-y-3 rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Call Report Sections</h2>
          {(
            [
              ["discussion", "Discussion", discussion, setDiscussion],
              ["decisions", "Decisions", decisions, setDecisions],
              ["risks", "Risks", risks, setRisks],
              ["nextSteps", "Next Steps", nextSteps, setNextSteps],
              ["minutesSummary", "Minutes Summary", minutesSummary, setMinutesSummary],
            ] as const
          ).map(([id, label, value, setter]) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <textarea
                id={id}
                className={`${fieldClassName} min-h-16 py-2`}
                value={value}
                onChange={(e) => setter(e.target.value)}
              />
            </div>
          ))}
          <Button type="submit" variant="outline" disabled={isPending}>
            Save Report
          </Button>
        </form>
      ) : (
        <section className="space-y-2 rounded-lg border bg-card p-6 text-sm">
          <p>
            <span className="font-medium">Discussion:</span> {visit.discussion ?? "—"}
          </p>
          <p>
            <span className="font-medium">Decisions:</span> {visit.decisions ?? "—"}
          </p>
          <p>
            <span className="font-medium">Next Steps:</span> {visit.nextSteps ?? "—"}
          </p>
        </section>
      )}

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Customer Attendees</h2>
        <ul className="mt-2 divide-y text-sm">
          {visit.attendees.map((attendee) => (
            <li key={attendee.id} className="py-2">
              {attendee.displayName}
              {attendee.organisation ? ` · ${attendee.organisation}` : ""}
            </li>
          ))}
        </ul>
        {visit.isEditable ? (
          <form onSubmit={addAttendee} className="mt-3 flex gap-2">
            <Input
              placeholder="Attendee name"
              value={attendeeName}
              onChange={(e) => setAttendeeName(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={isPending}>
              Add
            </Button>
          </form>
        ) : null}
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Action Items</h2>
        <ul className="mt-2 divide-y text-sm">
          {visit.actionItems.map((item) => (
            <li key={item.id} className="py-2">
              {item.title} · {item.ownerDisplayName} · {item.statusCode}
              {item.linkedActivityId ? (
                <>
                  {" · "}
                  <Link
                    href={`/crm/activities/${item.linkedActivityId}`}
                    className="text-primary underline"
                  >
                    Task
                  </Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        {visit.isEditable ? (
          <form onSubmit={addAction} className="mt-3 grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Action title"
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={actionDue}
              onChange={(e) => setActionDue(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={isPending}>
              Add Action
            </Button>
          </form>
        ) : null}
      </section>

      {visit.reviewerComments ? (
        <section className="rounded-lg border bg-card p-6 text-sm">
          <h2 className="font-medium">Reviewer Comments</h2>
          <p className="mt-2 text-muted-foreground">{visit.reviewerComments}</p>
        </section>
      ) : null}
    </main>
  );
}
