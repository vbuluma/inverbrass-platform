/**
 * Purpose:
 * Smoke-validate BP-003 / IP-012 Offering Analytics & Performance.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip012-offering-analytics-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import {
  OFFERING_METRIC_CATEGORIES,
  OFFERING_SNAPSHOT_PERIODS,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { defaultOfferingMetricDefinitions } from "@/db/seeds/offering-metric-defaults";
import { createOfferingAnalyticsService } from "@/modules/product/services/offering-analytics-service";
import {
  formatSnapshotDate,
  isOfferingMetricCategory,
  isOfferingSnapshotPeriod,
  metricCategoryLabel,
  resolveDefaultSnapshotPeriod,
  statusCodeToMetricValue,
} from "@/modules/product/services/offering-analytics-rules";
import {
  compareOfferingAnalyticsSchema,
  offeringAnalyticsFiltersSchema,
  refreshOfferingAnalyticsSchema,
} from "@/modules/product/validators/offering-analytics-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0040_bp003_ip012_offering_analytics.sql",
  "src/db/schema/offering-metric-definition.ts",
  "src/db/schema/offering-metric-snapshot.ts",
  "src/db/seeds/offering-metric-defaults.ts",
  "src/db/seeds/offering-metric-defaults-seed.ts",
  "src/modules/product/offering-analytics-ui-labels.ts",
  "src/modules/product/repositories/offering-metric-definition-repository.ts",
  "src/modules/product/repositories/offering-metric-snapshot-repository.ts",
  "src/modules/product/services/offering-analytics-rules.ts",
  "src/modules/product/services/offering-analytics-service.ts",
  "src/modules/product/validators/offering-analytics-validators.ts",
  "src/modules/product/actions/offering-analytics-actions.ts",
  "src/modules/product/components/product-analytics-panel.tsx",
  "src/modules/product/components/offering-analytics-dashboard.tsx",
  "src/app/(authenticated)/(app)/products/analytics/page.tsx",
  "scripts/bp003-ip012-offering-analytics-smoke-validation.ts",
];

const MIGRATION_TAG = "0040_bp003_ip012_offering_analytics";

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-012 file.",
  }));
}

function checkMigrationSql(): SmokeResult[] {
  const migrationPath = path.join(
    ROOT,
    "drizzle/0040_bp003_ip012_offering_analytics.sql"
  );
  if (!existsSync(migrationPath)) {
    return [{ name: "migration:sql", ok: false, detail: "Migration SQL missing." }];
  }

  const sql = readFileSync(migrationPath, "utf8");
  return ["offering_metric_definition", "offering_metric_snapshot"].map((table) => ({
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
      name: `migration:${MIGRATION_TAG}`,
      ok: tags.has(MIGRATION_TAG),
      detail: tags.has(MIGRATION_TAG)
        ? undefined
        : "Migration tag not in journal — register in integration handover.",
    },
  ];
}

function checkMetricSeeds(): SmokeResult[] {
  return [
    {
      name: "seeds:default definitions",
      ok: defaultOfferingMetricDefinitions.length >= 10,
    },
    {
      name: "seeds:categories",
      ok: defaultOfferingMetricDefinitions.every((item) =>
        isOfferingMetricCategory(item.metricCategory)
      ),
    },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:default period",
      ok: resolveDefaultSnapshotPeriod() === OFFERING_SNAPSHOT_PERIODS.DAILY,
    },
    {
      name: "rules:snapshot date",
      ok: formatSnapshotDate(new Date("2026-01-15T12:00:00.000Z")) === "2026-01-15",
    },
    {
      name: "rules:status metric",
      ok: statusCodeToMetricValue("ACTIVE") === 2,
    },
    {
      name: "rules:category label",
      ok: metricCategoryLabel(OFFERING_METRIC_CATEGORIES.COMMERCIAL) === "Commercial",
    },
    {
      name: "rules:period enum",
      ok: isOfferingSnapshotPeriod("WEEKLY"),
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const offeringId = "550e8400-e29b-41d4-a716-446655440000";

  return [
    {
      name: "validators:filters",
      ok: offeringAnalyticsFiltersSchema.safeParse({ dateFrom: "2026-01-01" }).success,
    },
    {
      name: "validators:refresh",
      ok: refreshOfferingAnalyticsSchema.safeParse({ offeringId }).success,
    },
    {
      name: "validators:compare",
      ok: compareOfferingAnalyticsSchema.safeParse({
        offeringIds: [offeringId, "550e8400-e29b-41d4-a716-446655440001"],
      }).success,
    },
  ];
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const required = [
    "ANALYTICS_REFRESHED",
    "SNAPSHOT_CREATED",
    "METRIC_DEFINITION_UPDATED",
  ] as const;

  return required.map((eventType) => ({
    name: `timeline:${eventType}`,
    ok: eventType in PRODUCT_TIMELINE_EVENT_TYPES,
  }));
}

function checkWorkspaceTabs(): SmokeResult[] {
  const analyticsTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "analytics");
  return [
    {
      name: "workspace:analytics tab enabled",
      ok: analyticsTab?.available === true && analyticsTab.futureIp === null,
    },
    {
      name: "analytics ui labels",
      ok: resolveBusinessTerminology(null).analytics.moduleName === "Analytics",
    },
    {
      name: "audit:metric definition entity",
      ok: AUDIT_ENTITY_NAMES.OFFERING_METRIC_DEFINITION === "offering_metric_definition",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  try {
    createOfferingAnalyticsService();
    return [{ name: "services:factory", ok: true }];
  } catch (error) {
    return [
      {
        name: "services:factory",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function printResults(results: SmokeResult[]) {
  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }
  console.log("");
  console.log(
    failed.length === 0
      ? `All ${results.length} IP-012 smoke checks passed.`
      : `${failed.length} of ${results.length} checks failed.`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const results = [
    ...checkRequiredFiles(),
    ...checkMigrationSql(),
    ...checkMigrationJournal(),
    ...checkMetricSeeds(),
    ...checkRules(),
    ...checkValidators(),
    ...checkTimelineTaxonomy(),
    ...checkWorkspaceTabs(),
    ...checkServiceFactory(),
  ];
  printResults(results);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
