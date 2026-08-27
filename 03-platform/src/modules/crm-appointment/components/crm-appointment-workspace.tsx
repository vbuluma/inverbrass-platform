/**
 * Appointment workspace — overview and outcome actions.
 * BP-004 / IP-06
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  cancelCrmAppointmentAction,
  completeCrmAppointmentAction,
  markNoShowCrmAppointmentAction,
  updateCrmAppointmentMinutesAction,
} from "@/modules/crm-appointment/actions/crm-appointment-actions";
import type { CrmAppointmentDetailView } from "@/modules/crm-appointment/types";

type CrmAppointmentWorkspaceProps = {
  appointment: CrmAppointmentDetailView;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CrmAppointmentWorkspace({
  appointment,
}: CrmAppointmentWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [meetingNotes, setMeetingNotes] = useState(appointment.meetingNotes ?? "");
  const [decisions, setDecisions] = useState(appointment.decisions ?? "");
  const [actionItemsSummary, setActionItemsSummary] = useState(
    appointment.actionItemsSummary ?? ""
  );

  function handleSaveMinutes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateCrmAppointmentMinutesAction(appointment.id, {
        meetingNotes: meetingNotes || null,
        decisions: decisions || null,
        actionItemsSummary: actionItemsSummary || null,
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await completeCrmAppointmentAction(appointment.id, {
        outcomeNotes: outcomeNotes || null,
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleCancel() {
    const cancelReason = window.prompt("Reason for cancellation:");
    if (!cancelReason?.trim()) return;

    startTransition(async () => {
      const result = await cancelCrmAppointmentAction(appointment.id, {
        cancelReason: cancelReason.trim(),
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleNoShow() {
    const noShowReason = window.prompt("No-show reason:");
    if (!noShowReason?.trim()) return;

    startTransition(async () => {
      const result = await markNoShowCrmAppointmentAction(appointment.id, {
        noShowReason: noShowReason.trim(),
        suggestFollowUpTask: true,
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/appointments" label="Back to Calendar" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{appointment.appointmentNumber}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{appointment.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {appointment.appointmentTypeLabel} · {appointment.primaryPartyDisplayName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/parties/${appointment.primaryPartyId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open Party
          </Link>
          {appointment.linkedActivityId ? (
            <Link
              href={`/crm/activities/${appointment.linkedActivityId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Linked Activity
            </Link>
          ) : null}
          {appointment.isEditable ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleNoShow}
              >
                Mark No-show
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="font-medium">{appointment.statusLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
          <p className="font-medium">{appointment.ownerDisplayName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Start</p>
          <p>{formatDateTime(appointment.startDateTime)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">End</p>
          <p>{formatDateTime(appointment.endDateTime)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
          <p>{appointment.location ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Virtual Link
          </p>
          {appointment.virtualMeetingUrl ? (
            <a
              href={appointment.virtualMeetingUrl}
              className="text-sm text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              Join meeting
            </a>
          ) : (
            <p>—</p>
          )}
        </div>
      </section>

      {appointment.description ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Description</h2>
          <p className="mt-2 text-sm text-muted-foreground">{appointment.description}</p>
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Meeting Minutes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lightweight notes for this appointment. Full collaborative visit reports are in IP-07.
        </p>
        {appointment.isEditable ? (
          <form onSubmit={handleSaveMinutes} className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="meetingNotes">Notes</Label>
              <textarea
                id="meetingNotes"
                className={`${fieldClassName} min-h-20 py-2`}
                value={meetingNotes}
                onChange={(event) => setMeetingNotes(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decisions">Decisions</Label>
              <textarea
                id="decisions"
                className={`${fieldClassName} min-h-16 py-2`}
                value={decisions}
                onChange={(event) => setDecisions(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionItemsSummary">Action Items</Label>
              <textarea
                id="actionItemsSummary"
                className={`${fieldClassName} min-h-16 py-2`}
                value={actionItemsSummary}
                onChange={(event) => setActionItemsSummary(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? "Saving…" : "Save Minutes"}
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Notes:</span>{" "}
              {appointment.meetingNotes ?? "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Decisions:</span>{" "}
              {appointment.decisions ?? "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Action Items:</span>{" "}
              {appointment.actionItemsSummary ?? "—"}
            </p>
          </div>
        )}
      </section>

      {appointment.participants.length > 0 ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Participants</h2>
          <ul className="mt-2 divide-y">
            {appointment.participants.map((participant) => (
              <li key={participant.id} className="py-2 text-sm">
                {participant.displayName}
                {participant.isOrganizer ? " (Organizer)" : ""} ·{" "}
                {participant.responseStatusCode}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {appointment.isEditable ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Complete Appointment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completing creates a linked IP-05 activity with outcome notes.
          </p>
          <form onSubmit={handleComplete} className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="outcomeNotes">Outcome Notes</Label>
              <textarea
                id="outcomeNotes"
                className={`${fieldClassName} min-h-20 py-2`}
                value={outcomeNotes}
                onChange={(event) => setOutcomeNotes(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Completing…" : "Mark Completed"}
            </Button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
