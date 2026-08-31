/**
 * Appointment dashboard — KPIs, calendar week, and recent appointments.
 * BP-004 / IP-06
 */

"use client";

import { CalendarIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRM_APPOINTMENT_LIST_VIEWS } from "@/modules/crm-appointment/constants";
import type { CrmAppointmentDashboardView } from "@/modules/crm-appointment/types";

type CrmAppointmentDashboardProps = {
  data: CrmAppointmentDashboardView;
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

export function CrmAppointmentDashboard({ data }: CrmAppointmentDashboardProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/crm" label="Back to CRM" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-800 ring-1 ring-violet-200">
                <CalendarIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Calendar & Appointments
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Schedule customer meetings, coordinate participants, and capture outcomes.
            </p>
          </div>
          <Link
            href="/crm/appointments/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            Schedule Appointment
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label="Scheduled" value={data.totalScheduled} />
        <PlatformKpiCard label="My Scheduled" value={data.myScheduled} />
        <PlatformKpiCard label="This Week" value={data.upcomingThisWeek} />
        <PlatformKpiCard label="Completed (Month)" value={data.completedThisMonth} />
        <PlatformKpiCard label="No-shows (Month)" value={data.noShowThisMonth} />
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/crm/appointments?view=${CRM_APPOINTMENT_LIST_VIEWS.MY}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          My Calendar
        </Link>
        <Link
          href={`/crm/appointments?view=${CRM_APPOINTMENT_LIST_VIEWS.UPCOMING}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Upcoming
        </Link>
        <Link
          href={`/crm/appointments?view=${CRM_APPOINTMENT_LIST_VIEWS.ALL}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          All Appointments
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">This Week</h2>
        {data.calendarWeek.length === 0 ? (
          <PlatformEmptyState
            title="No appointments this week"
            description="Schedule your first customer appointment to populate the calendar."
            actionLabel="Schedule Appointment"
            actionHref="/crm/appointments/new"
          />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.calendarWeek.map((appointment) => (
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent Appointments</h2>
        {data.recentAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointment history yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.recentAppointments.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/crm/appointments/${appointment.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{appointment.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.ownerDisplayName}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(appointment.startDateTime)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
