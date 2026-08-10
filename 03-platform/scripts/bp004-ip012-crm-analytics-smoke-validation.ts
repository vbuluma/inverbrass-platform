/**
 * Purpose:
 * Smoke-validate BP-004 / IP-12 CRM Analytics & Dashboards.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip012-crm-analytics-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  calculateHealthScore,
  calculateRate,
  isDormant,
  resolveChurnRisk,
  toCsv,
} from "@/modules/crm/analytics/services/crm-analytics-rules";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0045_bp004_ip012_crm_analytics.sql",
  "src/db/schema/crm-analytics.ts",
  "src/modules/crm/analytics/types.ts",
  "src/modules/crm/analytics/validators/crm-analytics-validators.ts",
  "src/modules/crm/analytics/repositories/crm-metric-repository.ts",
  "src/modules/crm/analytics/services/crm-analytics-rules.ts",
  "src/modules/crm/analytics/services/crm-analytics-service.ts",
  "src/modules/crm/actions/crm-analytics-actions.ts",
  "src/modules/crm/components/crm-analytics-dashboard.tsx",
  "src/modules/crm/components/crm-customer-analytics-panel.tsx",
  "src/app/(authenticated)/(app)/crm-analytics/page.tsx",
  "scripts/bp004-ip012-crm-analytics-smoke-validation.ts",
];

const MIGRATION_TAG = "0045_bp004_ip012_crm_analytics";

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkMigrationSql(): SmokeResult[] {
  const migrationPath = path.join(ROOT, "drizzle/0045_bp004_ip012_crm_analytics.sql");
  if (!existsSync(migrationPath)) {
    return [{ name: "migration:sql", ok: false }];
  }
  const sql = readFileSync(migrationPath, "utf8");
  return ["crm_metric_definition", "crm_metric_snapshot"].map((table) => ({
    name: `migration:table:${table}`,
    ok: sql.includes(`"${table}"`),
  }));
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  const tags = new Set(journal.entries.map((e) => e.tag));
  return [
    {
      name: `migration:journal:${MIGRATION_TAG}`,
      ok: tags.has(MIGRATION_TAG),
      detail: tags.has(MIGRATION_TAG)
        ? undefined
        : "Migration tag not in journal — register in integration handover.",
    },
  ];
}

function checkRules(): SmokeResult[] {
  const past = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
  return [
    { name: "rules:rate", ok: calculateRate(1, 4) === 25 },
    { name: "rules:dormant", ok: isDormant(past) },
    {
      name: "rules:healthScore",
      ok: calculateHealthScore({
        openQuotations: 1,
        acceptedQuotations: 1,
        campaignEngagement: 1,
        daysSinceLastActivity: 5,
      }) > 0,
    },
    {
      name: "rules:churnHigh",
      ok:
        resolveChurnRisk({
          dormant: true,
          openQuotations: 0,
          acceptedQuotations: 0,
          campaignResponses: 0,
        }) === "HIGH",
    },
    {
      name: "rules:csv",
      ok: toCsv([{ a: 1, b: "x" }]).includes("a,b"),
    },
  ];
}

function checkNavigation(): SmokeResult[] {
  const nav = readFileSync(
    path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"),
    "utf8"
  );
  return [
    {
      name: "nav:crmAnalytics",
      ok: nav.includes('href: "/crm-analytics"'),
    },
  ];
}

async function main() {
  const results = [
    ...checkRequiredFiles(),
    ...checkMigrationSql(),
    ...checkMigrationJournal(),
    ...checkRules(),
    ...checkNavigation(),
  ];
  const failed = results.filter((r) => !r.ok);

  console.log("\nBP-004 / IP-12 CRM Analytics Smoke Validation\n");
  for (const result of results) {
    console.log(
      `  [${result.ok ? "PASS" : "FAIL"}] ${result.name}${
        result.detail ? ` — ${result.detail}` : ""
      }`
    );
  }
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    const blocking = failed.filter((f) => !f.name.startsWith("migration:journal:"));
    process.exitCode = blocking.length === 0 ? 0 : 1;
    if (blocking.length === 0) {
      console.log(
        "\nNote: Journal entries deferred to Integration Manager — non-blocking."
      );
    }
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
