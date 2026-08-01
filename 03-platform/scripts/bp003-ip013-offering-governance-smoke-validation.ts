/**
 * Purpose:
 * Smoke-validate BP-003 / IP-013 Offering Governance.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip013-offering-governance-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";
import {
  OFFERING_GOVERNANCE_CHANGE_TYPES,
  OFFERING_GOVERNANCE_STATUS_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import {
  defaultOfferingGovernanceChecklist,
  defaultOfferingGovernanceStatuses,
} from "@/db/seeds/offering-governance-defaults";
import { OFFERING_GOVERNANCE_UI_LABELS } from "@/modules/product/offering-governance-ui-labels";
import { createOfferingGovernanceService } from "@/modules/product/services/offering-governance-service";
import {
  calculateReadinessScore,
  deriveGovernanceStatus,
  evaluateChecklistItem,
  governanceStatusLabel,
} from "@/modules/product/services/offering-governance-rules";
import {
  offeringGovernanceFiltersSchema,
  runOfferingGovernanceValidationSchema,
  updateOfferingGovernanceOwnershipSchema,
} from "@/modules/product/validators/offering-governance-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0034_bp003_ip013_offering_governance.sql",
  "src/db/schema/offering-governance-status.ts",
  "src/db/schema/offering-governance-checklist-definition.ts",
  "src/db/schema/offering-governance.ts",
  "src/db/schema/offering-governance-history.ts",
  "src/db/seeds/offering-governance-defaults.ts",
  "src/db/seeds/offering-governance-defaults-seed.ts",
  "src/modules/product/offering-governance-ui-labels.ts",
  "src/modules/product/repositories/offering-governance-repository.ts",
  "src/modules/product/repositories/offering-governance-history-repository.ts",
  "src/modules/product/repositories/offering-governance-checklist-definition-repository.ts",
  "src/modules/product/services/offering-governance-rules.ts",
  "src/modules/product/services/offering-governance-service.ts",
  "src/modules/product/validators/offering-governance-validators.ts",
  "src/modules/product/actions/offering-governance-actions.ts",
  "src/modules/product/components/product-governance-panel.tsx",
  "src/modules/product/components/offering-governance-dashboard.tsx",
  "src/app/(authenticated)/(app)/products/governance/page.tsx",
  "scripts/bp003-ip013-offering-governance-smoke-validation.ts",
];

const MIGRATION_TAG = "0034_bp003_ip013_offering_governance";

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
    "drizzle/0034_bp003_ip013_offering_governance.sql"
  );
  if (!existsSync(migrationPath)) {
    return [{ name: "migration:sql", ok: false, detail: "Migration SQL missing." }];
  }

  const sql = readFileSync(migrationPath, "utf8");
  return [
    "offering_governance_status",
    "offering_governance_checklist_definition",
    "offering_governance",
    "offering_governance_history",
  ].map((table) => ({
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
    entries: Array<{ tag: string }>;
  };
  const tags = new Set(journal.entries.map((entry) => entry.tag));

  return [
    {
      name: "journal:0034_bp003_ip013",
      ok: tags.has(MIGRATION_TAG),
      detail: tags.has(MIGRATION_TAG)
        ? undefined
        : "Expected fail until platform integrator adds journal entry.",
    },
  ];
}

function checkSeedsAndRules(): SmokeResult[] {
  const checklistItem = evaluateChecklistItem(
    "IDENTITY_COMPLETE",
    defaultOfferingGovernanceChecklist[0]!,
    {
      productCode: "SKU-001",
      productName: "Sample Offering",
      productType: "SERVICE",
      productStatusCode: "DRAFT",
      responsibleBusinessOwnerPartyId: null,
      classificationCount: 0,
      pricingCount: 0,
      analyticsSnapshotCount: 0,
    }
  );

  const score = calculateReadinessScore([checklistItem]);
  const status = deriveGovernanceStatus(
    "DRAFT",
    false,
    score,
    [checklistItem],
    false
  );

  return [
    {
      name: "seed:governance-statuses",
      ok: defaultOfferingGovernanceStatuses.length >= 6,
    },
    {
      name: "seed:checklist-definitions",
      ok: defaultOfferingGovernanceChecklist.length >= 9,
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
      ok: status === OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED,
    },
    {
      name: "rules:governance-status-label",
      ok: governanceStatusLabel(OFFERING_GOVERNANCE_STATUS_CODES.READY) === "Ready",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const ownership = updateOfferingGovernanceOwnershipSchema.safeParse({
    offeringId: "00000000-0000-4000-8000-000000000001",
    responsibleBusinessOwnerPartyId: "00000000-0000-4000-8000-000000000002",
  });
  const validation = runOfferingGovernanceValidationSchema.safeParse({
    offeringId: "00000000-0000-4000-8000-000000000001",
  });
  const filters = offeringGovernanceFiltersSchema.safeParse({
    query: "loan",
    readinessMin: 50,
  });

  return [
    { name: "validator:ownership", ok: ownership.success },
    { name: "validator:validation", ok: validation.success },
    { name: "validator:filters", ok: filters.success },
  ];
}

function checkTimelineAuditWorkspace(): SmokeResult[] {
  const governanceTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "governance");

  return [
    {
      name: "timeline:GOVERNANCE_UPDATED",
      ok: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_UPDATED === "GOVERNANCE_UPDATED",
    },
    {
      name: "timeline:GOVERNANCE_OWNER_CHANGED",
      ok:
        PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_OWNER_CHANGED ===
        "GOVERNANCE_OWNER_CHANGED",
    },
    {
      name: "timeline:GOVERNANCE_READINESS_UPDATED",
      ok:
        PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_READINESS_UPDATED ===
        "GOVERNANCE_READINESS_UPDATED",
    },
    {
      name: "timeline:GOVERNANCE_VALIDATION_EXECUTED",
      ok:
        PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATION_EXECUTED ===
        "GOVERNANCE_VALIDATION_EXECUTED",
    },
    {
      name: "audit:OFFERING_GOVERNANCE",
      ok: AUDIT_ENTITY_NAMES.OFFERING_GOVERNANCE === "offering_governance",
    },
    {
      name: "workspace:governance-tab",
      ok: Boolean(governanceTab?.available),
    },
    {
      name: "constants:change-types",
      ok: OFFERING_GOVERNANCE_CHANGE_TYPES.OWNER_CHANGED === "OWNER_CHANGED",
    },
    {
      name: "ui:labels",
      ok: OFFERING_GOVERNANCE_UI_LABELS.panelTitle === "Governance",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  try {
    const service = createOfferingGovernanceService();
    return [
      {
        name: "service:factory",
        ok: typeof service.getProductGovernancePanel === "function",
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
    ...checkTimelineAuditWorkspace(),
    ...checkServiceFactory(),
  ];

  const passed = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok);

  console.log("BP-003 IP-013 Offering Governance — Smoke Validation\n");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  console.log(`\n${passed}/${results.length} checks passed.`);

  if (failed.length > 0) {
    const journalOnly =
      failed.length === 1 && failed[0]?.name === "journal:0034_bp003_ip013";
    if (journalOnly) {
      console.log("\nJournal failure is expected until shared integration.");
    }
  }

  await closeDb();
  process.exit(failed.length > 0 && !failed.every((f) => f.name.startsWith("journal:")) ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
