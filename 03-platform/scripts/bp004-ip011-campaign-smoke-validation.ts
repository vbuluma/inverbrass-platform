/**
 * Purpose:
 * Smoke-validate BP-004 / IP-11 Campaign Management.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip011-campaign-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  CAMPAIGN_MEMBER_STATUS_CODES,
  CAMPAIGN_STATUS_CODES,
  CAMPAIGN_TYPE_CODES,
} from "@/modules/crm/constants";
import {
  canTransitionCampaignStatus,
  computeCampaignRoi,
  isCampaignReadOnly,
} from "@/modules/crm/campaign/services/campaign-rules";
import { createCampaignSchema } from "@/modules/crm/campaign/validators/campaign-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0044_bp004_ip011_campaign_foundation.sql",
  "src/db/schema/campaign.ts",
  "src/modules/crm/campaign/types.ts",
  "src/modules/crm/campaign/validators/campaign-validators.ts",
  "src/modules/crm/campaign/repositories/campaign-repository.ts",
  "src/modules/crm/campaign/repositories/campaign-member-repository.ts",
  "src/modules/crm/campaign/services/campaign-rules.ts",
  "src/modules/crm/campaign/services/campaign-service.ts",
  "src/modules/crm/campaign/services/campaign-customer-360-provider.ts",
  "src/modules/crm/adapters/campaign-outreach-adapter.ts",
  "src/modules/crm/adapters/lead-attribution-adapter.ts",
  "src/modules/crm/adapters/campaign-consent-adapter.ts",
  "src/modules/crm/actions/campaign-actions.ts",
  "src/modules/crm/components/campaign-dashboard.tsx",
  "src/modules/crm/components/campaign-workspace.tsx",
  "src/modules/crm/components/campaign-registration-form.tsx",
  "src/app/(authenticated)/(app)/campaigns/page.tsx",
  "src/app/(authenticated)/(app)/campaigns/new/page.tsx",
  "src/app/(authenticated)/(app)/campaigns/[campaignId]/page.tsx",
  "scripts/bp004-ip011-campaign-smoke-validation.ts",
];

const MIGRATION_TAG = "0044_bp004_ip011_campaign_foundation";

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-11 file.",
  }));
}

function checkMigrationSql(): SmokeResult[] {
  const migrationPath = path.join(
    ROOT,
    "drizzle/0044_bp004_ip011_campaign_foundation.sql"
  );
  if (!existsSync(migrationPath)) {
    return [{ name: "migration:sql", ok: false, detail: "Missing migration." }];
  }

  const sql = readFileSync(migrationPath, "utf8");
  return ["campaign", "campaign_member"].map((table) => ({
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
      name: `migration:journal:${MIGRATION_TAG}`,
      ok: tags.has(MIGRATION_TAG),
      detail: tags.has(MIGRATION_TAG)
        ? undefined
        : "Migration tag not in journal — register in integration handover.",
    },
  ];
}

function checkRules(): SmokeResult[] {
  const roi = computeCampaignRoi({
    statuses: [
      CAMPAIGN_MEMBER_STATUS_CODES.SENT,
      CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
      CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
    ],
    budgetAmount: 1000,
    actualCost: 400,
  });

  return [
    {
      name: "rules:plannedToActive",
      ok: canTransitionCampaignStatus(
        CAMPAIGN_STATUS_CODES.PLANNED,
        CAMPAIGN_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rules:completedReadOnly",
      ok: isCampaignReadOnly(CAMPAIGN_STATUS_CODES.COMPLETED),
    },
    {
      name: "rules:roiMemberCount",
      ok: roi.memberCount === 3,
    },
    {
      name: "rules:roiPipelineStub",
      ok: roi.attributedPipelineValue === 0,
    },
    {
      name: "rules:costVariance",
      ok: roi.costVariance === 600,
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const parsed = createCampaignSchema.safeParse({
    name: "Spring Outreach",
    campaignType: CAMPAIGN_TYPE_CODES.EMAIL,
    currencyCode: "USD",
  });

  return [
    {
      name: "validator:createCampaign",
      ok: parsed.success,
      detail: parsed.success ? undefined : parsed.error.message,
    },
  ];
}

function checkNavigation(): SmokeResult[] {
  const navPath = path.join(ROOT, "src/lib/navigation/platform-nav-config.ts");
  if (!existsSync(navPath)) {
    return [{ name: "nav:config", ok: false, detail: "Missing nav config." }];
  }

  const nav = readFileSync(navPath, "utf8");
  return [
    {
      name: "nav:campaignsEntry",
      ok: nav.includes('href: "/campaigns"'),
    },
  ];
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkMigrationSql(),
    ...checkMigrationJournal(),
    ...checkRules(),
    ...checkValidators(),
    ...checkNavigation(),
  ];

  const failed = results.filter((result) => !result.ok);

  console.log("\nBP-004 / IP-11 Campaign Smoke Validation\n");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.detail ? ` — ${result.detail}` : "";
    console.log(`  [${status}] ${result.name}${detail}`);
  }

  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    const nonJournalFailed = failed.filter(
      (f) => !f.name.startsWith("migration:journal:")
    );
    if (nonJournalFailed.length === 0) {
      console.log(
        "\nNote: Journal entries deferred to Integration Manager — non-blocking for feature branch."
      );
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
