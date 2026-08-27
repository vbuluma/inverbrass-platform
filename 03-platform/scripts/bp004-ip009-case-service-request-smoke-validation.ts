/**
 * Smoke-validate BP-004 / IP-09 Case & Service Request Management.
 * Usage: npx tsx scripts/bp004-ip009-case-service-request-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { AUDIT_ENTITY_NAMES, AUDIT_SOURCE_MODULES } from "@/core/audit/constants";
import {
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline/constants";
import {
  CRM_CASE_ESCALATION_ARCHITECTURE,
  CRM_CASE_PRIORITY_CODES,
  CRM_CASE_SLA_ARCHITECTURE,
  CRM_CASE_STATUS_CODES,
  CRM_CASE_TYPE_CODES,
} from "@/modules/crm-case/constants";
import {
  CRM_CASE_CUSTOMER_360_TIMELINE_EVENTS,
  CRM_CASE_CUSTOMER_360_WIDGETS,
} from "@/modules/crm-case/customer-360-contribution";
import {
  assertTransition,
  buildCaseNumber,
  computeSlaDueDates,
  computeSlaRemainingMs,
  isOverdue,
  isSlaAtRisk,
  isSlaBreached,
  isSlaPausedStatus,
} from "@/modules/crm-case/services/crm-case-rules";
import {
  createCrmCaseSchema,
  crmCaseListFiltersSchema,
} from "@/modules/crm-case/validators/crm-case-validators";

type SmokeResult = { name: string; ok: boolean };

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/crm-case.ts",
  "src/db/schema/crm-case-type.ts",
  "src/db/schema/crm-case-status.ts",
  "src/db/schema/crm-case-priority.ts",
  "src/db/schema/crm-case-severity.ts",
  "src/db/schema/crm-case-resolution-code.ts",
  "src/db/schema/crm-case-entity-link.ts",
  "src/db/schema/crm-case-escalation.ts",
  "drizzle/0052_bp004_ip009_case_service_request_management.sql",
  "drizzle/0054_bp004_se_final_remediation.sql",
  "src/modules/crm-case/constants.ts",
  "src/modules/crm-case/services/crm-case-service.ts",
  "src/modules/crm-case/actions/crm-case-actions.ts",
  "src/modules/crm-case/components/crm-case-dashboard.tsx",
  "src/modules/crm-case/components/crm-case-workspace.tsx",
  "src/app/(authenticated)/(app)/crm/cases/page.tsx",
  "src/app/(authenticated)/(app)/crm/cases/new/page.tsx",
  "src/app/(authenticated)/(app)/crm/cases/[caseId]/page.tsx",
];

function main() {
  const due = computeSlaDueDates(new Date("2026-01-01T00:00:00.000Z"), 24, 72);
  const dueSoon = new Date(Date.now() + 2 * 60 * 60_000);
  const widgetIds = CRM_CASE_CUSTOMER_360_WIDGETS.map((w) => w.id);
  const results: SmokeResult[] = [
    ...REQUIRED_FILES.map((relativePath) => ({
      name: `file:${relativePath}`,
      ok: existsSync(path.join(ROOT, relativePath)),
    })),
    {
      name: "journal:0052",
      ok: (
        JSON.parse(
          readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8")
        ) as { entries: Array<{ tag: string }> }
      ).entries.some(
        (entry) => entry.tag === "0052_bp004_ip009_case_service_request_management"
      ),
    },
    {
      name: "journal:0054",
      ok: (
        JSON.parse(
          readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8")
        ) as { entries: Array<{ tag: string; idx: number }> }
      ).entries.some(
        (entry) =>
          entry.tag === "0054_bp004_se_final_remediation" && entry.idx === 54
      ),
    },
    {
      name: "types:QUERY",
      ok: CRM_CASE_TYPE_CODES.QUERY === "QUERY",
    },
    {
      name: "types:INCIDENT",
      ok: CRM_CASE_TYPE_CODES.INCIDENT === "INCIDENT",
    },
    {
      name: "types:INVESTIGATION",
      ok: CRM_CASE_TYPE_CODES.INVESTIGATION === "INVESTIGATION",
    },
    {
      name: "types:FOLLOW_UP",
      ok: CRM_CASE_TYPE_CODES.FOLLOW_UP === "FOLLOW_UP",
    },
    {
      name: "validator:create",
      ok: createCrmCaseSchema.safeParse({
        caseTypeCode: CRM_CASE_TYPE_CODES.QUERY,
        subcategoryCode: "BILLING",
        subject: "Test enquiry",
        description: "Customer asked about delivery",
        priorityCode: CRM_CASE_PRIORITY_CODES.NORMAL,
        ownerUserId: "00000000-0000-4000-8000-000000000001",
        primaryPartyId: "00000000-0000-4000-8000-000000000002",
      }).success,
    },
    {
      name: "validator:filters",
      ok: crmCaseListFiltersSchema.safeParse({ view: "QUEUE" }).success,
    },
    {
      name: "rules:number",
      ok: buildCaseNumber(1) === "CSE-000001",
    },
    {
      name: "rules:transition-close",
      ok: assertTransition(CRM_CASE_STATUS_CODES.RESOLVED, CRM_CASE_STATUS_CODES.CLOSED),
    },
    {
      name: "rules:pause",
      ok: isSlaPausedStatus(CRM_CASE_STATUS_CODES.PENDING_CUSTOMER),
    },
    {
      name: "rules:sla-due",
      ok:
        due.slaFirstResponseDueAt.toISOString() === "2026-01-02T00:00:00.000Z" &&
        due.slaResolutionDueAt.toISOString() === "2026-01-04T00:00:00.000Z",
    },
    {
      name: "rules:remaining",
      ok: typeof computeSlaRemainingMs(dueSoon, null) === "number",
    },
    {
      name: "rules:at-risk",
      ok: isSlaAtRisk(dueSoon, null),
    },
    {
      name: "rules:breached",
      ok: isSlaBreached(new Date("2020-01-01T00:00:00.000Z"), null),
    },
    {
      name: "rules:overdue",
      ok: isOverdue({
        statusCode: CRM_CASE_STATUS_CODES.OPEN,
        slaResolutionDueAt: new Date("2020-01-01T00:00:00.000Z"),
        slaPausedAt: null,
      }),
    },
    {
      name: "sla:architecture",
      ok:
        CRM_CASE_SLA_ARCHITECTURE.authoritativeEngine.includes("ENG-003n") &&
        CRM_CASE_SLA_ARCHITECTURE.policyAdmin.includes("crm_sla_policy"),
    },
    {
      name: "escalation:eng009",
      ok: CRM_CASE_ESCALATION_ARCHITECTURE.eng009Contract.includes("CASE_ESCALATED"),
    },
    {
      name: "timeline:CASE_OPENED",
      ok: PARTY_TIMELINE_EVENT_TYPES.CASE_OPENED === "CASE_OPENED",
    },
    {
      name: "timeline:CASE_CLOSED",
      ok: PARTY_TIMELINE_EVENT_TYPES.CASE_CLOSED === "CASE_CLOSED",
    },
    {
      name: "timeline:source",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM_CASE === "CRM_CASE",
    },
    {
      name: "audit:entity",
      ok: AUDIT_ENTITY_NAMES.CRM_CASE === "crm_case",
    },
    {
      name: "audit:source",
      ok: AUDIT_SOURCE_MODULES.CRM_CASE === "crm_case",
    },
    {
      name: "customer360:widgets",
      ok:
        widgetIds.includes("open-cases") &&
        widgetIds.includes("sla-at-risk") &&
        widgetIds.includes("breached-cases") &&
        widgetIds.includes("recent-cases") &&
        widgetIds.includes("last-complaint"),
    },
    {
      name: "customer360:events",
      ok: CRM_CASE_CUSTOMER_360_TIMELINE_EVENTS.includes("CASE_CLOSED"),
    },
    {
      name: "schema:sla_columns",
      ok: (() => {
        const text = readFileSync(
          path.join(ROOT, "src/db/schema/crm-case.ts"),
          "utf8"
        );
        return (
          text.includes("subcategory_code") &&
          text.includes("sla_policy_id") &&
          text.includes("escalation_level") &&
          text.includes("sla_at_risk_at")
        );
      })(),
    },
  ];

  let failed = 0;
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}`);
    if (!result.ok) failed += 1;
  }
  if (failed > 0) {
    console.error(`\nIP-09 smoke failed (${failed} checks).`);
    process.exit(1);
  }
  console.log("\nBP-004 IP-09 Case & Service Request Management smoke validation passed.");
}

main();

