/**
 * Purpose:
 * Smoke-validate BP-003 / IP-007 Digital Catalogue Engine.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip007-digital-catalogue-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { resolveDigitalCatalogueLabel } from "@/core/industry-experience/digital-catalogue-terminology";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import {
  CATALOGUE_VISIBILITY_CODES,
  PRODUCT_STATUS_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { CATALOGUE_UI_LABELS } from "@/modules/product/catalogue-ui-labels";
import { createProductCatalogueService } from "@/modules/product/services/product-catalogue-service";
import {
  buildQrSlug,
  isProductPublishable,
  isPublicationCurrentlyActive,
  validatePublicationSchedule,
  visibilityLabel,
  visibilityOptions,
} from "@/modules/product/services/product-catalogue-rules";
import {
  catalogueChannelQuerySchema,
  searchCatalogueSchema,
  upsertPublicationSchema,
} from "@/modules/product/validators/product-catalogue-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0035_bp003_ip007_digital_catalogue.sql",
  "src/db/schema/catalogue-channel.ts",
  "src/db/schema/product-catalogue-publication.ts",
  "src/core/industry-experience/digital-catalogue-terminology.ts",
  "src/modules/product/catalogue-ui-labels.ts",
  "src/modules/product/repositories/catalogue-channel-repository.ts",
  "src/modules/product/repositories/product-catalogue-publication-repository.ts",
  "src/modules/product/services/product-catalogue-rules.ts",
  "src/modules/product/services/product-catalogue-service.ts",
  "src/modules/product/validators/product-catalogue-validators.ts",
  "src/modules/product/actions/product-catalogue-actions.ts",
  "src/modules/product/components/catalogue-dashboard.tsx",
  "src/modules/product/components/catalogue-workspace.tsx",
  "src/modules/product/components/catalogue-preview-panel.tsx",
  "src/modules/product/components/product-catalogue-panel.tsx",
  "src/app/(authenticated)/(app)/products/catalogue/page.tsx",
  "src/app/(authenticated)/(app)/products/catalogue/[productId]/page.tsx",
  "scripts/bp003-ip007-digital-catalogue-smoke-validation.ts",
];

const MIGRATION_TAGS = ["0035_bp003_ip007_digital_catalogue"];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-007 file.",
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

  return MIGRATION_TAGS.map((tag) => ({
    name: `migration:${tag}`,
    ok: tags.has(tag),
    detail: tags.has(tag)
      ? undefined
      : "Migration tag not in journal (integration handover required).",
  }));
}

function checkRules(): SmokeResult[] {
  const now = new Date("2026-08-01T12:00:00.000Z");
  const future = new Date("2026-09-01T12:00:00.000Z");
  const past = new Date("2026-07-01T12:00:00.000Z");

  return [
    {
      name: "rules:publishableOnlyActive",
      ok:
        isProductPublishable(PRODUCT_STATUS_CODES.ACTIVE) &&
        !isProductPublishable(PRODUCT_STATUS_CODES.DRAFT),
    },
    {
      name: "rules:scheduleValidation",
      ok:
        validatePublicationSchedule(past.toISOString(), future.toISOString()) &&
        !validatePublicationSchedule(future.toISOString(), past.toISOString()),
    },
    {
      name: "rules:publicationActiveWindow",
      ok:
        isPublicationCurrentlyActive({
          published: true,
          publishFrom: past.toISOString(),
          publishTo: future.toISOString(),
          now,
        }) &&
        !isPublicationCurrentlyActive({
          published: true,
          publishFrom: future.toISOString(),
          now,
        }),
    },
    {
      name: "rules:visibilityOptions",
      ok: visibilityOptions().length === Object.keys(CATALOGUE_VISIBILITY_CODES).length,
    },
    {
      name: "rules:visibilityLabel",
      ok: visibilityLabel(CATALOGUE_VISIBILITY_CODES.PUBLIC) === "Public",
    },
    {
      name: "rules:qrSlug",
      ok: buildQrSlug("SAV-001", "WEBSITE") === "sav-001-website",
    },
    {
      name: "rules:industryLabel",
      ok:
        resolveDigitalCatalogueLabel("FINANCIAL") === "Products" &&
        resolveDigitalCatalogueLabel("HOSPITALITY") === "Offers",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validators:upsertPublication",
      ok: upsertPublicationSchema.safeParse({
        channelCode: "WEBSITE",
        published: true,
        visibility: CATALOGUE_VISIBILITY_CODES.PUBLIC,
      }).success,
    },
    {
      name: "validators:searchCatalogue",
      ok: searchCatalogueSchema.safeParse({ query: "savings", publishedOnly: true }).success,
    },
    {
      name: "validators:channelQuery",
      ok: catalogueChannelQuerySchema.safeParse({ channelCode: "WEBSITE" }).success,
    },
  ];
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const events = [
    "PRODUCT_PUBLISHED",
    "PRODUCT_UNPUBLISHED",
    "CATALOGUE_VISIBILITY_CHANGED",
    "CATALOGUE_CHANNEL_ADDED",
    "CATALOGUE_CHANNEL_REMOVED",
    "CATALOGUE_FEATURED_CHANGED",
    "CATALOGUE_SCHEDULE_CHANGED",
  ] as const;

  return events.map((eventType) => ({
    name: `timeline:product:${eventType}`,
    ok: eventType in PRODUCT_TIMELINE_EVENT_TYPES,
  }));
}

function checkWorkspaceTabs(): SmokeResult[] {
  const catalogueTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "catalogue");
  return [
    {
      name: "workspace:catalogue tab enabled",
      ok: catalogueTab?.available === true && catalogueTab.futureIp === null,
    },
    {
      name: "catalogue ui labels",
      ok: CATALOGUE_UI_LABELS.dashboardTitle === "Digital Catalogue",
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  try {
    createProductCatalogueService();
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
      ? `All ${results.length} IP-007 smoke checks passed.`
      : `${failed.length} of ${results.length} checks failed.`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const results = [
    ...checkRequiredFiles(),
    ...checkMigrationJournal(),
    ...checkRules(),
    ...checkValidators(),
    ...checkTimelineTaxonomy(),
    ...checkWorkspaceTabs(),
    ...checkServiceFactories(),
  ];
  printResults(results);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
