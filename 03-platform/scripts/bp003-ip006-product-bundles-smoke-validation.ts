/**
 * Purpose:
 * Smoke-validate BP-003 / IP-006 Bundles & Packages Engine.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip006-product-bundles-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import { resolveBundleLabel } from "@/core/industry-experience/bundle-terminology";
import { BUNDLE_TIMELINE_EVENT_TYPES } from "@/core/bundle-timeline/constants";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import {
  BUNDLE_STATUS_CODES,
  BUNDLE_TYPE_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { buildBundleUiLabels } from "@/modules/product/product-terminology-labels";
import { createProductBundleService } from "@/modules/product/services/product-bundle-service";
import {
  bundleTypeOptions,
  canTransitionBundleStatus,
  findDuplicateBundleItemKeys,
  isBundleEditable,
  isProductBundleable,
  normalizeBundleCode,
  resolveDefaultBundleStatus,
} from "@/modules/product/services/product-bundle-rules";
import {
  createBundleSchema,
  searchBundlesSchema,
  updateBundleSchema,
} from "@/modules/product/validators/product-bundle-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0034_bp003_ip006_product_bundles.sql",
  "src/db/schema/product-bundle.ts",
  "src/db/schema/product-bundle-item.ts",
  "src/db/schema/bundle-timeline.ts",
  "src/core/bundle-timeline/index.ts",
  "src/core/industry-experience/bundle-terminology.ts",
  "src/modules/product/bundle-ui-labels.ts",
  "src/modules/product/repositories/product-bundle-repository.ts",
  "src/modules/product/repositories/product-bundle-item-repository.ts",
  "src/modules/product/services/product-bundle-rules.ts",
  "src/modules/product/services/product-bundle-audit-query-service.ts",
  "src/modules/product/services/product-bundle-service.ts",
  "src/modules/product/validators/product-bundle-validators.ts",
  "src/modules/product/actions/product-bundle-actions.ts",
  "src/modules/product/components/bundle-dashboard.tsx",
  "src/modules/product/components/bundle-registration-wizard.tsx",
  "src/modules/product/components/bundle-workspace.tsx",
  "src/modules/product/components/product-bundles-panel.tsx",
  "src/modules/product/components/bundle-timeline-panel.tsx",
  "src/modules/product/components/bundle-audit-history-panel.tsx",
  "src/app/(authenticated)/(app)/products/bundles/page.tsx",
  "src/app/(authenticated)/(app)/products/bundles/new/page.tsx",
  "src/app/(authenticated)/(app)/products/bundles/[bundleId]/page.tsx",
  "scripts/bp003-ip006-product-bundles-smoke-validation.ts",
];

const MIGRATION_TAGS = ["0034_bp003_ip006_product_bundles"];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-006 file.",
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
  const productId = "550e8400-e29b-41d4-a716-446655440099";

  return [
    {
      name: "rules:normalizeBundleCode",
      ok: normalizeBundleCode(" starter kit ") === "STARTER_KIT",
    },
    {
      name: "rules:defaultStatus",
      ok: resolveDefaultBundleStatus() === BUNDLE_STATUS_CODES.DRAFT,
    },
    {
      name: "rules:editableAndBundleable",
      ok:
        isBundleEditable(BUNDLE_STATUS_CODES.ACTIVE) &&
        !isBundleEditable(BUNDLE_STATUS_CODES.ARCHIVED) &&
        isProductBundleable("ACTIVE") &&
        !isProductBundleable("DRAFT"),
    },
    {
      name: "rules:statusTransition",
      ok:
        canTransitionBundleStatus(BUNDLE_STATUS_CODES.DRAFT, BUNDLE_STATUS_CODES.ACTIVE) &&
        !canTransitionBundleStatus(BUNDLE_STATUS_CODES.ARCHIVED, BUNDLE_STATUS_CODES.ACTIVE),
    },
    {
      name: "rules:duplicateItems",
      ok:
        findDuplicateBundleItemKeys([
          { productId, quantity: 1 },
          { productId, quantity: 2 },
        ]) === `${productId}:none`,
    },
    {
      name: "rules:bundleTypes",
      ok: bundleTypeOptions().length === Object.keys(BUNDLE_TYPE_CODES).length,
    },
    {
      name: "rules:industryLabel",
      ok:
        resolveBundleLabel("FINANCIAL") === "Product Packages" &&
        resolveBundleLabel("HOSPITALITY") === "Offers",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const productId = "550e8400-e29b-41d4-a716-446655440099";

  return [
    {
      name: "validators:createBundle",
      ok: createBundleSchema.safeParse({
        bundleCode: "STARTER-KIT-001",
        bundleName: "Laptop Starter Kit",
        bundleType: BUNDLE_TYPE_CODES.STARTER_KIT,
        items: [{ productId, quantity: 1 }],
      }).success,
    },
    {
      name: "validators:updateBundle",
      ok: updateBundleSchema.safeParse({ bundleName: "Updated Bundle" }).success,
    },
    {
      name: "validators:searchBundles",
      ok: searchBundlesSchema.safeParse({ query: "starter" }).success,
    },
  ];
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const events = [
    "BUNDLE_CREATED",
    "BUNDLE_UPDATED",
    "BUNDLE_ACTIVATED",
    "BUNDLE_SUSPENDED",
    "BUNDLE_ARCHIVED",
    "BUNDLE_ITEM_ADDED",
    "BUNDLE_ITEM_REMOVED",
    "BUNDLE_ITEM_QUANTITY_CHANGED",
  ] as const;

  return events.flatMap((eventType) => [
    {
      name: `timeline:bundle:${eventType}`,
      ok: eventType in BUNDLE_TIMELINE_EVENT_TYPES,
    },
    {
      name: `timeline:product:${eventType}`,
      ok: eventType in PRODUCT_TIMELINE_EVENT_TYPES,
    },
  ]);
}

function checkWorkspaceTabs(): SmokeResult[] {
  const bundlesTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "bundles");
  return [
    {
      name: "workspace:bundles tab enabled",
      ok: bundlesTab?.available === true && bundlesTab.futureIp === null,
    },
    {
      name: "bundle ui labels",
      ok:
        buildBundleUiLabels(resolveBusinessTerminology(null)).dashboardTitle ===
        "Bundles",
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  try {
    createProductBundleService();
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
      ? `All ${results.length} IP-006 smoke checks passed.`
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
