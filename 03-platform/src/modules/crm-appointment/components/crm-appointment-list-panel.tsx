/**
 * Appointment list panel for filtered views.
 * BP-004 / IP-06
 */

"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrmAppointmentSummaryView } from "@/modules/crm-appointment/types";

type CrmAppointmentListPanelProps = {
  appointments: CrmAppointmentSummaryView[];
  activeView: string;
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CrmAppointmentListPanel({
  appointments,
  activeView,
}: CrmAppointmentListPanelProps) {
  const title =
    activeView === "MY"
      ? "My Appointments"
      : activeView === "UPCOMING"
        ? "Upcoming Appointments"
        : "All Appointments";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/appointments" label="Back to Calendar" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

      {appointments.length === 0 ? (
        <PlatformEmptyState
          title="No appointments found"
          description="Try a different view or schedule a new appointment."
          actionLabel="Schedule Appointment"
          actionHref="/crm/appointments/new"
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <Link
                href={`/crm/appointments/${appointment.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{appointment.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.appointmentTypeLabel} ·{" "}
                    {appointment.primaryPartyDisplayName}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {appointment.statusLabel} · {formatDateTime(appointment.startDateTime)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/crm/appointments/new"
        className={cn(buttonVariants({ variant: "default" }), "w-fit")}
      >
        Schedule Appointment
      </Link>
    </main>
  );
}
