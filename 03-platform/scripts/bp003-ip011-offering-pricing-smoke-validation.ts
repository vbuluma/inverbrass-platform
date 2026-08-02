/**
 * Purpose:
 * Smoke-validate BP-003 / IP-011 Offering Pricing & Pricing Rules.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip011-offering-pricing-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import { AUDIT_ENTITY_NAMES, AUDIT_OPERATIONS } from "@/core/audit/constants";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import {
  PRICING_CATALOGUE_STATUS_CODES,
  PRICING_ITEM_STATUS_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { buildPricingUiLabels } from "@/modules/product/product-terminology-labels";
import { createPricingService } from "@/modules/product/services/pricing-service";
import {
  buildPricingDimensionKey,
  canTransitionPricingItemStatus,
  dimensionKeysMatch,
  isEffectivePeriodValid,
  isPricingItemActiveNow,
  isPricingItemFuture,
  isValidPriceRange,
  normalizePricingCode,
  periodsOverlap,
  resolveDefaultPricingItemStatus,
} from "@/modules/product/services/pricing-rules";
import {
  comparePricingItemsSchema,
  createPricingCatalogueSchema,
  createPricingItemSchema,
  searchPricingItemsSchema,
} from "@/modules/product/validators/pricing-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0039_bp003_ip011_offering_pricing.sql",
  "src/db/schema/pricing-method.ts",
  "src/db/schema/pricing-catalogue.ts",
  "src/db/schema/pricing-item.ts",
  "src/db/seeds/pricing-methods.ts",
  "src/db/seeds/pricing-methods-seed.ts",
  "src/modules/product/pricing-ui-labels.ts",
  "src/modules/product/repositories/pricing-method-repository.ts",
  "src/modules/product/repositories/pricing-catalogue-repository.ts",
  "src/modules/product/repositories/pricing-item-repository.ts",
  "src/modules/product/services/pricing-rules.ts",
  "src/modules/product/services/pricing-service.ts",
  "src/modules/product/validators/pricing-validators.ts",
  "src/modules/product/actions/pricing-actions.ts",
  "src/modules/product/components/product-pricing-panel.tsx",
  "src/modules/product/components/pricing-dashboard.tsx",
  "src/app/(authenticated)/(app)/products/pricing/page.tsx",
  "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
];

const MIGRATION_TAG = "0039_bp003_ip011_offering_pricing";

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-011 file.",
  }));
}

function checkMigrationSql(): SmokeResult[] {
  const migrationPath = path.join(
    ROOT,
    "drizzle/0039_bp003_ip011_offering_pricing.sql"
  );
  if (!existsSync(migrationPath)) {
    return [
      {
        name: "migration:sql",
        ok: false,
        detail: "Migration SQL file missing.",
      },
    ];
  }

  const sql = readFileSync(migrationPath, "utf8");
  const requiredTables = ["pricing_method", "pricing_catalogue", "pricing_item"];

  return requiredTables.map((table) => ({
    name: `migration:table:${table}`,
    ok: sql.includes(`"${table}"`),
    detail: sql.includes(`"${table}"`) ? undefined : `Table ${table} not in migration.`,
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

function checkRules(): SmokeResult[] {
  const now = new Date("2026-01-15T12:00:00.000Z");
  const future = new Date("2026-06-01T00:00:00.000Z");

  const keyA = buildPricingDimensionKey({
    offeringId: "a",
    pricingCatalogueId: "b",
    currencyCode: "kes",
    customerSegment: " retail ",
    salesChannel: null,
    region: null,
    effectiveFrom: now,
    effectiveTo: null,
  });

  const keyB = buildPricingDimensionKey({
    offeringId: "a",
    pricingCatalogueId: "b",
    currencyCode: "KES",
    customerSegment: "RETAIL",
    salesChannel: null,
    region: null,
    effectiveFrom: now,
    effectiveTo: null,
  });

  return [
    {
      name: "rules:normalizePricingCode",
      ok: normalizePricingCode(" retail ") === "RETAIL",
    },
    {
      name: "rules:dimensionKeysMatch",
      ok: dimensionKeysMatch(keyA, keyB),
    },
    {
      name: "rules:periodsOverlap",
      ok: periodsOverlap(now, null, future, null),
    },
    {
      name: "rules:isValidPriceRange",
      ok: isValidPriceRange(100, 50, 200) && !isValidPriceRange(-1),
    },
    {
      name: "rules:isEffectivePeriodValid",
      ok: isEffectivePeriodValid(now, future) && !isEffectivePeriodValid(future, now),
    },
    {
      name: "rules:defaultStatus",
      ok: resolveDefaultPricingItemStatus() === PRICING_ITEM_STATUS_CODES.DRAFT,
    },
    {
      name: "rules:canActivate",
      ok: canTransitionPricingItemStatus(
        PRICING_ITEM_STATUS_CODES.DRAFT,
        PRICING_ITEM_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rules:activeNow",
      ok: isPricingItemActiveNow(
        {
          status: PRICING_ITEM_STATUS_CODES.ACTIVE,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          effectiveTo: null,
        },
        now
      ),
    },
    {
      name: "rules:futurePrice",
      ok: isPricingItemFuture(
        {
          status: PRICING_ITEM_STATUS_CODES.ACTIVE,
          effectiveFrom: future,
        },
        now
      ),
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const offeringId = "550e8400-e29b-41d4-a716-446655440000";
  const catalogueId = "550e8400-e29b-41d4-a716-446655440001";

  const catalogueValid = createPricingCatalogueSchema.safeParse({
    code: "RETAIL",
    name: "Retail Prices",
    currencyCode: "KES",
  });

  const itemValid = createPricingItemSchema.safeParse({
    offeringId,
    pricingCatalogueId: catalogueId,
    currencyCode: "KES",
    unitPrice: 500,
    pricingMethod: "FIXED",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
  });

  const itemInvalid = createPricingItemSchema.safeParse({
    offeringId: "bad",
    pricingCatalogueId: catalogueId,
    currencyCode: "KES",
    unitPrice: -10,
    pricingMethod: "",
    effectiveFrom: "",
  });

  const searchValid = searchPricingItemsSchema.safeParse({ query: "retail" });
  const compareValid = comparePricingItemsSchema.safeParse({
    itemIds: [offeringId, catalogueId],
  });

  return [
    {
      name: "validators:createCatalogue",
      ok: catalogueValid.success,
    },
    {
      name: "validators:createItem",
      ok: itemValid.success,
    },
    {
      name: "validators:rejectInvalidItem",
      ok: !itemInvalid.success,
    },
    {
      name: "validators:searchItems",
      ok: searchValid.success,
    },
    {
      name: "validators:compareItems",
      ok: compareValid.success,
    },
  ];
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const required = [
    "PRICE_CREATED",
    "PRICE_UPDATED",
    "PRICE_ACTIVATED",
    "PRICE_EXPIRED",
    "PRICE_ARCHIVED",
  ] as const;

  return required.map((eventType) => ({
    name: `timeline:${eventType}`,
    ok: eventType in PRODUCT_TIMELINE_EVENT_TYPES,
  }));
}

function checkAuditTaxonomy(): SmokeResult[] {
  return [
    {
      name: "audit:pricing_catalogue entity",
      ok: AUDIT_ENTITY_NAMES.PRICING_CATALOGUE === "pricing_catalogue",
    },
    {
      name: "audit:pricing_item entity",
      ok: AUDIT_ENTITY_NAMES.PRICING_ITEM === "pricing_item",
    },
    {
      name: "audit:activate operation",
      ok: AUDIT_OPERATIONS.ACTIVATE === "ACTIVATE",
    },
  ];
}

function checkWorkspaceTabs(): SmokeResult[] {
  const pricingTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "pricing");
  return [
    {
      name: "workspace:pricing tab enabled",
      ok: pricingTab?.available === true && pricingTab.futureIp === null,
    },
    {
      name: "pricing ui labels",
      ok:
        resolveBusinessTerminology(null).pricing.moduleName === "Pricing",
    },
    {
      name: "pricing status codes",
      ok:
        PRICING_ITEM_STATUS_CODES.ACTIVE === "ACTIVE" &&
        PRICING_CATALOGUE_STATUS_CODES.ACTIVE === "ACTIVE",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  try {
    createPricingService();
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
      ? `All ${results.length} IP-011 smoke checks passed.`
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
    ...checkRules(),
    ...checkValidators(),
    ...checkTimelineTaxonomy(),
    ...checkAuditTaxonomy(),
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
