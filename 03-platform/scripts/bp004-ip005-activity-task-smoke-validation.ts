/**
 * Purpose:
 * Smoke-validate BP-004 / IP-05 Activity & Task Management.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip005-activity-task-smoke-validation.ts
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete business data.
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  CRM_ACTIVITY_CUSTOMER_360_WIDGETS,
  CRM_ACTIVITY_CUSTOMER_360_TIMELINE_EVENTS,
} from "@/modules/crm-activity/customer-360-contribution";
import {
  CRM_ACTIVITY_STATUS_CODES,
  CRM_ACTIVITY_TYPE_CODES,
} from "@/modules/crm-activity/constants";
import {
  buildActivityNumber,
  canCompleteActivity,
  isActivityEditable,
  isActivityOverdue,
} from "@/modules/crm-activity/services/crm-activity-rules";
import {
  createCrmActivitySchema,
  crmActivityListFiltersSchema,
} from "@/modules/crm-activity/validators/crm-activity-validators";
import {
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline/constants";
import { AUDIT_ENTITY_NAMES, AUDIT_SOURCE_MODULES } from "@/core/audit/constants";

const ROOT = path.resolve(__dirname, "..");

const MIGRATION_TAGS = ["0042_bp004_ip005_activity_task_management"] as const;

const REQUIRED_FILES = [
  "src/db/schema/crm-activity.ts",
  "src/db/schema/crm-activity-entity-link.ts",
  "drizzle/0042_bp004_ip005_activity_task_management.sql",
  "src/modules/crm-activity/constants.ts",
  "src/modules/crm-activity/errors.ts",
  "src/modules/crm-activity/types.ts",
  "src/modules/crm-activity/customer-360-contribution.ts",
  "src/modules/crm-activity/validators/crm-activity-validators.ts",
  "src/modules/crm-activity/services/crm-activity-rules.ts",
  "src/modules/crm-activity/services/crm-activity-service.ts",
  "src/modules/crm-activity/services/crm-activity-audit-helper.ts",
  "src/modules/crm-activity/repositories/crm-activity-repository.ts",
  "src/modules/crm-activity/repositories/crm-activity-entity-link-repository.ts",
  "src/modules/crm-activity/repositories/crm-activity-reference-repository.ts",
  "src/modules/crm-activity/actions/crm-activity-actions.ts",
  "src/modules/crm-activity/components/crm-activity-dashboard.tsx",
  "src/modules/crm-activity/components/crm-activity-registration-form.tsx",
  "src/modules/crm-activity/components/crm-activity-workspace.tsx",
  "src/modules/crm-activity/components/crm-activity-list-panel.tsx",
  "src/app/(authenticated)/(app)/crm/activities/page.tsx",
  "src/app/(authenticated)/(app)/crm/activities/new/page.tsx",
  "src/app/(authenticated)/(app)/crm/activities/[activityId]/page.tsx",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolute = path.join(ROOT, relativePath);
    return {
      name: `file:${relativePath}`,
      ok: existsSync(absolute),
      detail: existsSync(absolute) ? undefined : "Missing required file.",
    };
  });
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    return [{ name: "journal:exists", ok: false, detail: "Missing _journal.json" }];
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };

  return MIGRATION_TAGS.map((tag) => ({
    name: `journal:${tag}`,
    ok: journal.entries.some((entry) => entry.tag === tag),
    detail: journal.entries.some((entry) => entry.tag === tag)
      ? undefined
      : `Migration ${tag} not registered in journal.`,
  }));
}

function checkValidators(): SmokeResult[] {
  const valid = createCrmActivitySchema.safeParse({
    activityTypeCode: CRM_ACTIVITY_TYPE_CODES.TASK,
    subject: "Follow up with customer",
    ownerUserId: "00000000-0000-4000-8000-000000000001",
    primaryPartyId: "00000000-0000-4000-8000-000000000002",
  });

  const filters = crmActivityListFiltersSchema.safeParse({ view: "MY" });

  return [
    {
      name: "validator:createCrmActivitySchema",
      ok: valid.success,
      detail: valid.success ? undefined : valid.error.message,
    },
    {
      name: "validator:crmActivityListFiltersSchema",
      ok: filters.success,
      detail: filters.success ? undefined : filters.error.message,
    },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:buildActivityNumber",
      ok: buildActivityNumber(1) === "ACT-000001",
    },
    {
      name: "rules:isActivityEditable",
      ok: isActivityEditable(CRM_ACTIVITY_STATUS_CODES.ASSIGNED),
    },
    {
      name: "rules:canCompleteActivity",
      ok: canCompleteActivity(CRM_ACTIVITY_STATUS_CODES.IN_PROGRESS),
    },
    {
      name: "rules:isActivityOverdue",
      ok: isActivityOverdue(
        CRM_ACTIVITY_STATUS_CODES.ASSIGNED,
        new Date(Date.now() - 86_400_000)
      ),
    },
  ];
}

function checkIntegrations(): SmokeResult[] {
  return [
    {
      name: "timeline:ACTIVITY_CREATED",
      ok: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_CREATED === "ACTIVITY_CREATED",
    },
    {
      name: "timeline:CRM_ACTIVITY source",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM_ACTIVITY === "CRM_ACTIVITY",
    },
    {
      name: "audit:crm_activity entity",
      ok: AUDIT_ENTITY_NAMES.CRM_ACTIVITY === "crm_activity",
    },
    {
      name: "audit:crm_activity source module",
      ok: AUDIT_SOURCE_MODULES.CRM_ACTIVITY === "crm_activity",
    },
    {
      name: "timeline:ACTIVITY_OVERDUE",
      ok: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_OVERDUE === "ACTIVITY_OVERDUE",
    },
    {
      name: "schema:overdue_event_emitted_at",
      ok: readFileSync(
        path.join(ROOT, "src/db/schema/crm-activity.ts"),
        "utf8"
      ).includes("overdue_event_emitted_at"),
    },
    {
      name: "migration:0050",
      ok: existsSync(
        path.join(ROOT, "drizzle/0050_bp004_se_final_remediation.sql")
      ),
    },
    {
      name: "customer360:widgets",
      ok: CRM_ACTIVITY_CUSTOMER_360_WIDGETS.length >= 3,
    },
    {
      name: "customer360:timeline-events",
      ok: CRM_ACTIVITY_CUSTOMER_360_TIMELINE_EVENTS.includes("ACTIVITY_OVERDUE"),
    },
  ];
}

function main() {
  const results = [
    ...checkRequiredFiles(),
    ...checkMigrationJournal(),
    ...checkValidators(),
    ...checkRules(),
    ...checkIntegrations(),
  ];

  const failed = results.filter((result) => !result.ok);

  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  console.log("");
  console.log(
    failed.length === 0
      ? "BP-004 IP-05 Activity & Task Management smoke validation passed."
      : `BP-004 IP-05 smoke validation failed (${failed.length} checks).`
  );

  process.exit(failed.length === 0 ? 0 : 1);
}

main();
