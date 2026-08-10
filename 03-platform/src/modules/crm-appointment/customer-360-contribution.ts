/**
 * Customer 360 widget contract for BP-004 / IP-06.
 *
 * Insight alias: IP-01 "next appointment" → upcoming-appointments[0]
 */

export const CRM_APPOINTMENT_CUSTOMER_360_WIDGETS = [
  {
    id: "upcoming-appointments",
    label: "Upcoming Appointments",
    description: "Scheduled appointments with future start times",
    dataKey: "upcomingAppointments",
  },
  {
    id: "recent-appointments",
    label: "Recent Appointments",
    description: "Recently held or scheduled appointments",
    dataKey: "recentAppointments",
  },
] as const;

export const CRM_APPOINTMENT_CUSTOMER_360_TIMELINE_EVENTS = [
  "APPOINTMENT_SCHEDULED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_COMPLETED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_NO_SHOW",
] as const;

export const CRM_APPOINTMENT_CUSTOMER_360_QUICK_ACTIONS = [
  {
    id: "schedule-appointment",
    label: "Schedule Appointment",
    hrefSuffix: "/crm/appointments/new",
  },
] as const;
