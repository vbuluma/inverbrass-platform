/**
 * Purpose:
 * Smoke-validate BP-004 / IP-03 Opportunity Management.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip003-opportunity-management-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { opportunityPipeline } from "@/db/schema/opportunity-pipeline";
import {
  PARTY_TIMELINE_EVENT_TYPES,
} from "@/core/party-timeline/constants";
import { WORK_SUBJECT_TYPES } from "@/core/work-assignment-sla/constants";
import { CUSTOMER_360_WIDGET_CATALOG } from "@/modules/crm/customer-360/widget-catalog";
import {
  DEFAULT_PIPELINE_CODE,
  buildLeadConversionMetadata,
  readLeadConversionMetadata,
} from "@/modules/crm/opportunity/constants";
import { createOpportunityService } from "@/modules/crm/opportunity/services/opportunity-service";
import {
  calculateWeightedAmount,
  formatOpportunityNumber,
} from "@/modules/crm/opportunity/services/opportunity-rules";
import {
  createOpportunitySchema,
  updateOpportunitySchema,
} from "@/modules/crm/opportunity/validators/opportunity-validators";

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_TAGS = ["0044_bp004_ip003_opportunity_management"] as const;

const REQUIRED_FILES = [
  "drizzle/0044_bp004_ip003_opportunity_management.sql",
  "src/db/schema/opportunity-pipeline.ts",
  "src/db/schema/opportunity-stage.ts",
  "src/db/schema/opportunity-loss-reason.ts",
  "src/db/schema/crm-opportunity.ts",
  "src/db/schema/crm-opportunity-line-item.ts",
  "src/modules/crm/opportunity/constants.ts",
  "src/modules/crm/opportunity/services/opportunity-service.ts",
  "src/modules/crm/customer-360/widgets/register-open-opportunities-widget.ts",
  "src/app/(authenticated)/(app)/opportunities/page.tsx",
  "02-build-packs/Build Pack 004 - Customer Relationship Management/Lead Conversion Contract.md",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolute = path.join(ROOT, "..", relativePath);
    const alt = path.join(ROOT, relativePath);
    const ok = existsSync(absolute) || existsSync(alt);
    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "Missing required file.",
    };
  });
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ tag?: string }>;
  };
  const tags = new Set((journal.entries ?? []).map((e) => e.tag));
  return MIGRATION_TAGS.map((tag) => ({
    name: `migration:journal:${tag}`,
    ok: tags.has(tag),
  }));
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:opportunityNumberFormat",
      ok: formatOpportunityNumber(3) === "OPP-000003",
    },
    {
      name: "rules:weightedAmount",
      ok: calculateWeightedAmount("1000", 50) === "500.00",
    },
    {
      name: "validator:createOpportunitySchema",
      ok: createOpportunitySchema.safeParse({
        crmRecordId: "00000000-0000-4000-8000-000000000001",
        name: "Deal",
      }).success,
    },
    {
      name: "validator:createOpportunitySchema:accountIdOptional",
      ok: createOpportunitySchema.safeParse({
        crmRecordId: "00000000-0000-4000-8000-000000000001",
        name: "Deal",
        accountId: "00000000-0000-4000-8000-000000000099",
      }).success,
    },
    {
      name: "validator:updateOpportunitySchema:accountId",
      ok: updateOpportunitySchema.safeParse({
        accountId: "00000000-0000-4000-8000-000000000099",
        version: 1,
      }).success,
    },
    {
      name: "conversion:attributionMetadataPersisted",
      ok: (() => {
        const metadata = buildLeadConversionMetadata({
          sourceCode: "WEB",
          qualificationScore: 80,
          companyName: "Acme",
        });
        const read = readLeadConversionMetadata(metadata);
        return (
          read?.sourceCode === "WEB" &&
          read.qualificationScore === 80 &&
          read.companyName === "Acme"
        );
      })(),
    },
    {
      name: "timeline:opportunityCreated",
      ok: PARTY_TIMELINE_EVENT_TYPES.OPPORTUNITY_CREATED === "OPPORTUNITY_CREATED",
    },
    {
      name: "sla:crmOpportunitySubject",
      ok: WORK_SUBJECT_TYPES.CRM_OPPORTUNITY === "crm_opportunity",
    },
    {
      name: "customer360:openOpportunitiesWidget",
      ok: CUSTOMER_360_WIDGET_CATALOG.some((w) => w.id === "open-opportunities"),
    },
    {
      name: "pipeline:defaultCode",
      ok: DEFAULT_PIPELINE_CODE === "STANDARD_SALES",
    },
  ];
}

function checkService(): SmokeResult[] {
  const service = createOpportunityService();
  return [
    {
      name: "service:createOpportunityService",
      ok: typeof service.createFromLeadConversion === "function",
    },
    {
      name: "service:updateOpportunity",
      ok: typeof service.updateOpportunity === "function",
    },
    {
      name: "service:getOpenOpportunitiesWidgetSummary",
      ok: typeof service.getOpenOpportunitiesWidgetSummary === "function",
    },
  ];
}

async function checkReferenceData(): Promise<SmokeResult[]> {
  if (!process.env.DATABASE_URL) {
    return [{ name: "seed:referenceData", ok: true, detail: "Skipped — no DATABASE_URL." }];
  }

  const db = getDb();
  try {
    const [countRow] = await db.select({ total: count() }).from(opportunityPipeline);
    const [pipeline] = await db
      .select({ code: opportunityPipeline.code })
      .from(opportunityPipeline)
      .where(eq(opportunityPipeline.code, DEFAULT_PIPELINE_CODE))
      .limit(1);

    return [
      {
        name: "seed:pipelinesPresent",
        ok: Number(countRow?.total ?? 0) > 0,
      },
      { name: "seed:standardPipeline", ok: Boolean(pipeline) },
    ];
  } finally {
    await closeDb();
  }
}

async function main() {
  const results = [
    ...checkFiles(),
    ...checkMigrationJournal(),
    ...checkRules(),
    ...checkService(),
    ...(await checkReferenceData()),
  ];

  const failed = results.filter((r) => !r.ok);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }
  console.log(
    failed.length === 0
      ? `\nAll ${results.length} Opportunity Management smoke checks passed.`
      : `\n${failed.length} of ${results.length} checks failed.`
  );
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
