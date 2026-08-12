/**
 * Smoke-validate BP-004 / IP-06 Calendar & Appointment Management.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip006-calendar-appointment-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  CRM_APPOINTMENT_CUSTOMER_360_WIDGETS,
  CRM_APPOINTMENT_CUSTOMER_360_TIMELINE_EVENTS,
} from "@/modules/crm-appointment/customer-360-contribution";
import {
  CRM_APPOINTMENT_STATUS_CODES,
  CRM_APPOINTMENT_TYPE_CODES,
} from "@/modules/crm-appointment/constants";
import {
  buildAppointmentNumber,
  canCompleteAppointment,
  isAppointmentEditable,
  validateEndAfterStart,
} from "@/modules/crm-appointment/services/crm-appointment-rules";
import {
  createCrmAppointmentSchema,
  crmAppointmentListFiltersSchema,
} from "@/modules/crm-appointment/validators/crm-appointment-validators";
import {
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline/constants";
import { AUDIT_ENTITY_NAMES, AUDIT_SOURCE_MODULES } from "@/core/audit/constants";

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/crm-appointment.ts",
  "src/db/schema/crm-appointment-participant.ts",
  "src/db/schema/crm-appointment-entity-link.ts",
  "src/db/schema/crm-appointment-type.ts",
  "src/db/schema/crm-appointment-status.ts",
  "drizzle/0048_bp004_ip006_calendar_appointment_management.sql",
  "drizzle/0049_bp004_ip006_appointment_minutes_and_extensions.sql",
  "src/modules/crm-appointment/constants.ts",
  "src/modules/crm-appointment/errors.ts",
  "src/modules/crm-appointment/types.ts",
  "src/modules/crm-appointment/customer-360-contribution.ts",
  "src/modules/crm-appointment/validators/crm-appointment-validators.ts",
  "src/modules/crm-appointment/services/crm-appointment-rules.ts",
  "src/modules/crm-appointment/services/crm-appointment-service.ts",
  "src/modules/crm-appointment/services/crm-appointment-audit-helper.ts",
  "src/modules/crm-appointment/repositories/crm-appointment-repository.ts",
  "src/modules/crm-appointment/repositories/crm-appointment-participant-repository.ts",
  "src/modules/crm-appointment/repositories/crm-appointment-entity-link-repository.ts",
  "src/modules/crm-appointment/repositories/crm-appointment-catalogue-repository.ts",
  "src/modules/crm-appointment/actions/crm-appointment-actions.ts",
  "src/modules/crm-appointment/components/crm-appointment-dashboard.tsx",
  "src/modules/crm-appointment/components/crm-appointment-registration-form.tsx",
  "src/modules/crm-appointment/components/crm-appointment-workspace.tsx",
  "src/modules/crm-appointment/components/crm-appointment-list-panel.tsx",
  "src/app/(authenticated)/(app)/crm/appointments/page.tsx",
  "src/app/(authenticated)/(app)/crm/appointments/new/page.tsx",
  "src/app/(authenticated)/(app)/crm/appointments/[appointmentId]/page.tsx",
];

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };

  return [
    {
      name: "journal:0048_bp004_ip006_calendar_appointment_management",
      ok: journal.entries.some(
        (entry) => entry.tag === "0048_bp004_ip006_calendar_appointment_management"
      ),
    },
    {
      name: "journal:0049_bp004_ip006_appointment_minutes_and_extensions",
      ok: journal.entries.some(
        (entry) =>
          entry.tag === "0049_bp004_ip006_appointment_minutes_and_extensions"
      ),
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const valid = createCrmAppointmentSchema.safeParse({
    appointmentTypeCode: CRM_APPOINTMENT_TYPE_CODES.MEETING,
    subject: "Customer demo",
    startDateTime: new Date().toISOString(),
    endDateTime: new Date(Date.now() + 3_600_000).toISOString(),
    ownerUserId: "00000000-0000-4000-8000-000000000001",
    primaryPartyId: "00000000-0000-4000-8000-000000000002",
  });

  const filters = crmAppointmentListFiltersSchema.safeParse({ view: "MY" });

  return [
    {
      name: "validator:createCrmAppointmentSchema",
      ok: valid.success,
      detail: valid.success ? undefined : valid.error.message,
    },
    {
      name: "validator:crmAppointmentListFiltersSchema",
      ok: filters.success,
      detail: filters.success ? undefined : filters.error.message,
    },
  ];
}

function checkRules(): SmokeResult[] {
  const start = new Date();
  const end = new Date(start.getTime() + 3_600_000);

  return [
    {
      name: "rules:buildAppointmentNumber",
      ok: buildAppointmentNumber(1) === "APT-000001",
    },
    {
      name: "rules:isAppointmentEditable",
      ok: isAppointmentEditable(CRM_APPOINTMENT_STATUS_CODES.SCHEDULED),
    },
    {
      name: "rules:canCompleteAppointment",
      ok: canCompleteAppointment(CRM_APPOINTMENT_STATUS_CODES.SCHEDULED),
    },
    {
      name: "rules:validateEndAfterStart",
      ok: validateEndAfterStart(start, end) === null,
    },
  ];
}

function checkIntegrations(): SmokeResult[] {
  return [
    {
      name: "timeline:APPOINTMENT_SCHEDULED",
      ok:
        PARTY_TIMELINE_EVENT_TYPES.APPOINTMENT_SCHEDULED === "APPOINTMENT_SCHEDULED",
    },
    {
      name: "timeline:CRM_APPOINTMENT source",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM_APPOINTMENT === "CRM_APPOINTMENT",
    },
    {
      name: "audit:crm_appointment entity",
      ok: AUDIT_ENTITY_NAMES.CRM_APPOINTMENT === "crm_appointment",
    },
    {
      name: "audit:crm_appointment source module",
      ok: AUDIT_SOURCE_MODULES.CRM_APPOINTMENT === "crm_appointment",
    },
    {
      name: "customer360:widgets",
      ok: CRM_APPOINTMENT_CUSTOMER_360_WIDGETS.length >= 2,
    },
    {
      name: "customer360:timeline-events",
      ok: CRM_APPOINTMENT_CUSTOMER_360_TIMELINE_EVENTS.length >= 5,
    },
  ];
}

function main() {
  const results = [
    ...checkFiles(),
    ...checkJournal(),
    ...checkValidators(),
    ...checkRules(),
    ...checkIntegrations(),
  ];

  let failed = 0;

  for (const result of results) {
    const label = result.ok ? "PASS" : "FAIL";
    if (!result.ok) failed += 1;
    console.log(
      `${label} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }

  if (failed > 0) {
    console.error(
      `\nBP-004 IP-06 Calendar & Appointment Management smoke validation failed (${failed} checks).`
    );
    process.exit(1);
  }

  console.log(
    "\nBP-004 IP-06 Calendar & Appointment Management smoke validation passed."
  );
}

main();
