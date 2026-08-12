/**
 * Smoke-validate BP-004 / IP-07 Visit & Call Report Management.
 * Usage: npx tsx scripts/bp004-ip007-visit-call-report-smoke-validation.ts
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
  CRM_VISIT_STATUS_CODES,
  CRM_VISIT_TYPE_CODES,
} from "@/modules/crm-visit/constants";
import {
  CRM_VISIT_CUSTOMER_360_TIMELINE_EVENTS,
  CRM_VISIT_CUSTOMER_360_WIDGETS,
} from "@/modules/crm-visit/customer-360-contribution";
import {
  buildVisitNumber,
  canSubmitVisit,
  isVisitEditable,
} from "@/modules/crm-visit/services/crm-visit-rules";
import {
  createCrmVisitSchema,
  crmVisitListFiltersSchema,
} from "@/modules/crm-visit/validators/crm-visit-validators";

type SmokeResult = { name: string; ok: boolean; detail?: string };

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/crm-visit.ts",
  "src/db/schema/crm-visit-participant.ts",
  "src/db/schema/crm-visit-customer-attendee.ts",
  "src/db/schema/crm-visit-action-item.ts",
  "src/db/schema/crm-visit-entity-link.ts",
  "src/db/schema/crm-visit-document.ts",
  "src/db/schema/crm-visit-type.ts",
  "src/db/schema/crm-visit-status.ts",
  "drizzle/0050_bp004_ip007_visit_call_report_management.sql",
  "src/modules/crm-visit/constants.ts",
  "src/modules/crm-visit/services/crm-visit-service.ts",
  "src/modules/crm-visit/actions/crm-visit-actions.ts",
  "src/modules/crm-visit/components/crm-visit-dashboard.tsx",
  "src/modules/crm-visit/components/crm-visit-workspace.tsx",
  "src/app/(authenticated)/(app)/crm/visits/page.tsx",
  "src/app/(authenticated)/(app)/crm/visits/new/page.tsx",
  "src/app/(authenticated)/(app)/crm/visits/[visitId]/page.tsx",
];

function main() {
  const results: SmokeResult[] = [
    ...REQUIRED_FILES.map((relativePath) => ({
      name: `file:${relativePath}`,
      ok: existsSync(path.join(ROOT, relativePath)),
    })),
    {
      name: "journal:0050",
      ok: (
        JSON.parse(
          readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8")
        ) as { entries: Array<{ tag: string }> }
      ).entries.some(
        (entry) => entry.tag === "0050_bp004_ip007_visit_call_report_management"
      ),
    },
    {
      name: "validator:createCrmVisitSchema",
      ok: createCrmVisitSchema.safeParse({
        visitTypeCode: CRM_VISIT_TYPE_CODES.SALES,
        subject: "Site visit",
        visitDate: new Date().toISOString(),
        ownerUserId: "00000000-0000-4000-8000-000000000001",
        primaryPartyId: "00000000-0000-4000-8000-000000000002",
      }).success,
    },
    {
      name: "validator:listFilters",
      ok: crmVisitListFiltersSchema.safeParse({ view: "MY" }).success,
    },
    {
      name: "rules:buildVisitNumber",
      ok: buildVisitNumber(1) === "VST-000001",
    },
    {
      name: "rules:isVisitEditable",
      ok: isVisitEditable(CRM_VISIT_STATUS_CODES.DRAFT),
    },
    {
      name: "rules:canSubmitVisit",
      ok: canSubmitVisit(CRM_VISIT_STATUS_CODES.IN_PROGRESS),
    },
    {
      name: "timeline:VISIT_PLANNED",
      ok: PARTY_TIMELINE_EVENT_TYPES.VISIT_PLANNED === "VISIT_PLANNED",
    },
    {
      name: "timeline:CRM_VISIT source",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT === "CRM_VISIT",
    },
    {
      name: "audit:crm_visit",
      ok: AUDIT_ENTITY_NAMES.CRM_VISIT === "crm_visit",
    },
    {
      name: "audit:source",
      ok: AUDIT_SOURCE_MODULES.CRM_VISIT === "crm_visit",
    },
    {
      name: "customer360:widgets",
      ok:
        CRM_VISIT_CUSTOMER_360_WIDGETS.length >= 4 &&
        CRM_VISIT_CUSTOMER_360_WIDGETS.some((w) => w.id === "upcoming-visits"),
    },
    {
      name: "customer360:events",
      ok: CRM_VISIT_CUSTOMER_360_TIMELINE_EVENTS.length >= 6,
    },
  ];

  let failed = 0;
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}`);
    if (!result.ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\nIP-07 smoke failed (${failed} checks).`);
    process.exit(1);
  }
  console.log("\nBP-004 IP-07 Visit & Call Report Management smoke validation passed.");
}

main();
