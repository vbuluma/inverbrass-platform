/**
 * Purpose:
 * Smoke-validate BP-004 / IP-013 CRM Governance & Administration.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip013-crm-governance-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";
import { PARTY_TIMELINE_EVENT_TYPES } from "@/core/party-timeline/constants";
import {
  defaultCrmGovernanceChecklist,
  defaultCrmGovernanceStatuses,
  defaultCrmSlaPolicies,
  defaultCrmBusinessHours,
} from "@/db/seeds/crm-governance-defaults";
import {
  CRM_GOVERNANCE_CHANGE_TYPES,
  CRM_GOVERNANCE_STATUS_CODES,
} from "@/modules/crm-governance/constants";
import { createCrmGovernanceService } from "@/modules/crm-governance/services/crm-governance-service";
import {
  calculateReadinessScore,
  deriveGovernanceStatus,
  evaluateChecklistItem,
  governanceStatusLabel,
} from "@/modules/crm-governance/services/crm-governance-rules";
import {
  runCrmGovernanceValidationSchema,
  updateCrmGovernanceOwnershipSchema,
  upsertCrmSlaPolicySchema,
} from "@/modules/crm-governance/validators/crm-governance-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0053_bp004_ip013_crm_governance.sql",
  "src/db/schema/crm-governance-status.ts",
  "src/db/schema/crm-governance-checklist-definition.ts",
  "src/db/schema/crm-governance.ts",
  "src/db/schema/crm-governance-history.ts",
  "src/db/schema/crm-governance-ownership-history.ts",
  "src/db/schema/crm-merge-proposal.ts",
  "src/db/schema/crm-sla-policy.ts",
  "src/db/schema/crm-business-hours.ts",
  "src/db/schema/crm-holiday-calendar.ts",
  "src/db/schema/crm-approval-matrix.ts",
  "src/db/seeds/crm-governance-defaults.ts",
  "src/db/seeds/crm-governance-defaults-seed.ts",
  "src/modules/crm-governance/constants.ts",
  "src/modules/crm-governance/errors.ts",
  "src/modules/crm-governance/types.ts",
  "src/modules/crm-governance/validators/crm-governance-validators.ts",
  "src/modules/crm-governance/services/crm-governance-rules.ts",
  "src/modules/crm-governance/services/crm-governance-service.ts",
  "src/modules/crm-governance/actions/crm-governance-actions.ts",
  "src/modules/crm-governance/components/crm-governance-dashboard.tsx",
  "src/modules/crm-governance/components/crm-governance-panel.tsx",
  "src/modules/crm-governance/components/crm-sla-policy-panel.tsx",
  "src/modules/crm-governance/customer-360-contribution.ts",
  "src/app/(authenticated)/(app)/crm/governance/page.tsx",
  "src/app/(authenticated)/(app)/crm/governance/parties/[partyId]/page.tsx",
  "scripts/bp004-ip013-crm-governance-smoke-validation.ts",
];

const MIGRATION_TAG = "0053_bp004_ip013_crm_governance";

const MIGRATION_TABLES = [
  "crm_governance_status",
  "crm_governance_checklist_definition",
  "crm_governance",
  "crm_governance_history",
  "crm_governance_ownership_history",
  "crm_merge_proposal",
  "crm_sla_policy",
  "crm_business_hours",
  "crm_holiday_calendar",
  "crm_approval_matrix",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-013 file.",
  }));
}

function checkMigrationSql(): SmokeResult[] {
  const migrationPath = path.join(
    ROOT,
    "drizzle/0053_bp004_ip013_crm_governance.sql"
  );
  if (!existsSync(migrationPath)) {
    return [{ name: "migration:sql", ok: false, detail: "Migration SQL missing." }];
  }

  const sql = readFileSync(migrationPath, "utf8");
  return MIGRATION_TABLES.map((table) => ({
    name: `migration:table:${table}`,
    ok: sql.includes(`"${table}"`),
  }));
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    return [{ name: "journal", ok: false, detail: "Missing drizzle journal." }];
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string; when?: number; idx?: number }>;
  };
  const entry = journal.entries.find((item) => item.tag === MIGRATION_TAG);

  return [
    {
      name: "journal:0053_bp004_ip013",
      ok: Boolean(entry),
      detail: entry ? undefined : "Expected journal tag missing.",
    },
    {
      name: "journal:idx-when",
      ok: entry?.idx === 53 && entry?.when === 1784564588850,
      detail:
        entry?.idx === 53 && entry?.when === 1784564588850
          ? undefined
          : "Expected idx 53 and when 1784564588850.",
    },
  ];
}

function checkSeedsAndRules(): SmokeResult[] {
  const checklistItem = evaluateChecklistItem(
    "PARTY_IDENTITY_COMPLETE",
    defaultCrmGovernanceChecklist[0]!,
    {
      partyDisplayName: "Acme Corp",
      ownerUserId: null,
      relationshipManagerUserId: null,
      stewardUserId: null,
      activityCount: 0,
      overdueOpenCaseCount: 0,
      isArchived: false,
    }
  );

  const ownerItem = evaluateChecklistItem(
    "OWNER_ASSIGNED",
    defaultCrmGovernanceChecklist[1]!,
    {
      partyDisplayName: "Acme Corp",
      ownerUserId: null,
      relationshipManagerUserId: null,
      stewardUserId: null,
      activityCount: 0,
      overdueOpenCaseCount: 0,
      isArchived: false,
    }
  );

  const score = calculateReadinessScore([checklistItem, ownerItem]);
  const status = deriveGovernanceStatus(
    false,
    score,
    [checklistItem, ownerItem],
    false,
    false
  );

  return [
    {
      name: "seed:governance-statuses",
      ok: defaultCrmGovernanceStatuses.length >= 6,
    },
    {
      name: "seed:checklist-definitions",
      ok: defaultCrmGovernanceChecklist.length >= 8,
    },
    {
      name: "seed:sla-policies",
      ok: defaultCrmSlaPolicies.length >= 5,
    },
    {
      name: "seed:business-hours",
      ok: defaultCrmBusinessHours.length === 7,
    },
    {
      name: "rules:identity-evaluator",
      ok: checklistItem.status === "COMPLETED",
    },
    {
      name: "rules:readiness-score",
      ok: score > 0 && score <= 100,
    },
    {
      name: "rules:derive-status",
      ok: status === CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED,
    },
    {
      name: "rules:governance-status-label",
      ok: governanceStatusLabel(CRM_GOVERNANCE_STATUS_CODES.READY) === "Ready",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const ownership = updateCrmGovernanceOwnershipSchema.safeParse({
    partyId: "00000000-0000-4000-8000-000000000001",
    ownerUserId: "00000000-0000-4000-8000-000000000002",
  });
  const validation = runCrmGovernanceValidationSchema.safeParse({
    partyId: "00000000-0000-4000-8000-000000000001",
  });
  const sla = upsertCrmSlaPolicySchema.safeParse({
    entityTypeCode: "CASE",
    priorityCode: "HIGH",
    name: "Case High",
    resolutionTargetHours: 24,
    firstResponseTargetHours: 8,
  });

  return [
    { name: "validator:ownership", ok: ownership.success },
    { name: "validator:validation", ok: validation.success },
    { name: "validator:sla", ok: sla.success },
  ];
}

function checkTimelineAudit(): SmokeResult[] {
  return [
    {
      name: "timeline:GOVERNANCE_VALIDATED",
      ok:
        PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATED ===
        "GOVERNANCE_VALIDATED",
    },
    {
      name: "timeline:GOVERNANCE_OWNER_CHANGED",
      ok:
        PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_OWNER_CHANGED ===
        "GOVERNANCE_OWNER_CHANGED",
    },
    {
      name: "timeline:GOVERNANCE_LOCKED",
      ok: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_LOCKED === "GOVERNANCE_LOCKED",
    },
    {
      name: "timeline:MERGE_PROPOSED",
      ok: PARTY_TIMELINE_EVENT_TYPES.MERGE_PROPOSED === "MERGE_PROPOSED",
    },
    {
      name: "audit:CRM_GOVERNANCE",
      ok: AUDIT_ENTITY_NAMES.CRM_GOVERNANCE === "crm_governance",
    },
    {
      name: "audit:CRM_MERGE_PROPOSAL",
      ok: AUDIT_ENTITY_NAMES.CRM_MERGE_PROPOSAL === "crm_merge_proposal",
    },
    {
      name: "audit:CRM_SLA_POLICY",
      ok: AUDIT_ENTITY_NAMES.CRM_SLA_POLICY === "crm_sla_policy",
    },
    {
      name: "constants:change-types",
      ok: CRM_GOVERNANCE_CHANGE_TYPES.OWNER_CHANGED === "OWNER_CHANGED",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  try {
    const service = createCrmGovernanceService();
    return [
      {
        name: "service:factory",
        ok: typeof service.getPartyGovernancePanel === "function",
      },
      {
        name: "service:customer360-settings",
        ok:
          service.getCustomer360SettingsContribution().settingsContributionIds
            .length >= 4,
      },
    ];
  } catch (error) {
    return [
      {
        name: "service:factory",
        ok: false,
        detail: error instanceof Error ? error.message : "Factory failed.",
      },
    ];
  }
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkMigrationSql(),
    ...checkMigrationJournal(),
    ...checkSeedsAndRules(),
    ...checkValidators(),
    ...checkTimelineAudit(),
    ...checkServiceFactory(),
  ];

  const passed = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok);

  console.log("BP-004 IP-013 CRM Governance — Smoke Validation\n");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(
      `${status}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }

  console.log(`\n${passed}/${results.length} checks passed.`);

  await closeDb();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
