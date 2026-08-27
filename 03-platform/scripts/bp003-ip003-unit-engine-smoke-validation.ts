/**
 * Purpose:
 * Smoke-validate BP-003 / IP-003 Units of Measure Engine.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip003-unit-engine-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  UNIT_TIMELINE_EVENT_TYPES,
} from "@/core/unit-timeline/constants";
import {
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import { UNIT_WORKSPACE_TABS } from "@/modules/product/constants";
import { buildUnitUiLabels } from "@/modules/product/product-terminology-labels";
import { createUnitConversionService } from "@/modules/product/services/unit-conversion-service";
import { DEFAULT_PRODUCT_USER_MESSAGES } from "@/modules/product/product-user-messages";
import {
  applyRounding,
  canConvertWithinCategory,
  convertQuantity,
  isValidConversionFactor,
  normalizeUnitCode,
  resolveDefaultUnitStatus,
} from "@/modules/product/services/unit-rules";
import { createUnitService } from "@/modules/product/services/unit-service";
import {
  convertUnitsSchema,
  createUnitSchema,
  searchUnitsSchema,
} from "@/modules/product/validators/unit-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0031_bp003_ip003_unit_engine.sql",
  "src/db/schema/unit-category.ts",
  "src/db/schema/unit-of-measure.ts",
  "src/db/schema/unit-timeline.ts",
  "src/db/seeds/unit-defaults.ts",
  "src/db/seeds/unit-defaults-seed.ts",
  "src/core/unit-timeline/index.ts",
  "src/modules/product/unit-ui-labels.ts",
  "src/modules/product/repositories/unit-category-repository.ts",
  "src/modules/product/repositories/unit-repository.ts",
  "src/modules/product/services/unit-rules.ts",
  "src/modules/product/services/unit-conversion-service.ts",
  "src/modules/product/services/unit-service.ts",
  "src/modules/product/services/unit-audit-query-service.ts",
  "src/modules/product/validators/unit-validators.ts",
  "src/modules/product/actions/unit-actions.ts",
  "src/modules/product/components/unit-dashboard.tsx",
  "src/modules/product/components/unit-registration-form.tsx",
  "src/modules/product/components/unit-workspace.tsx",
  "src/modules/product/components/unit-timeline-panel.tsx",
  "src/modules/product/components/unit-audit-history-panel.tsx",
  "src/app/(authenticated)/(app)/products/units/page.tsx",
  "src/app/(authenticated)/(app)/products/units/new/page.tsx",
  "src/app/(authenticated)/(app)/products/units/[unitId]/page.tsx",
  "scripts/bp003-ip003-unit-engine-smoke-validation.ts",
];

const MIGRATION_TAGS = ["0031_bp003_ip003_unit_engine"];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-003 file.",
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
    detail: tags.has(tag) ? undefined : "Migration tag not in journal.",
  }));
}

function checkRules(): SmokeResult[] {
  const results: SmokeResult[] = [];

  results.push({
    name: "rules:normalizeUnitCode",
    ok: normalizeUnitCode(" kg ") === "KG",
  });

  results.push({
    name: "rules:conversionFactor",
    ok: isValidConversionFactor(1) && !isValidConversionFactor(0),
  });

  results.push({
    name: "rules:convertQuantity",
    ok: convertQuantity(1, 1000, 1) === 1000,
  });

  results.push({
    name: "rules:applyRounding",
    ok: applyRounding(1.006, 2, "HALF_UP") === 1.01,
  });

  results.push({
    name: "rules:categoryMatch",
    ok:
      canConvertWithinCategory("a", "a") &&
      !canConvertWithinCategory("a", "b"),
  });

  results.push({
    name: "rules:defaultStatus",
    ok: resolveDefaultUnitStatus() === "ACTIVE",
  });

  return results;
}

function checkValidators(): SmokeResult[] {
  const results: SmokeResult[] = [];

  const createValid = createUnitSchema.safeParse({
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    code: "BOX",
    name: "Box",
    symbol: "box",
    conversionFactor: 12,
  });
  results.push({
    name: "validators:createUnit happy path",
    ok: createValid.success,
  });

  const createInvalid = createUnitSchema.safeParse({
    categoryId: "not-a-uuid",
    code: "",
    name: "",
    symbol: "",
    conversionFactor: 0,
  });
  results.push({
    name: "validators:createUnit rejects invalid",
    ok: !createInvalid.success,
  });

  const searchValid = searchUnitsSchema.safeParse({ query: "kg" });
  results.push({
    name: "validators:searchUnits",
    ok: searchValid.success,
  });

  const convertValid = convertUnitsSchema.safeParse({
    fromUnitId: "550e8400-e29b-41d4-a716-446655440000",
    toUnitId: "550e8400-e29b-41d4-a716-446655440001",
    value: 2,
  });
  results.push({
    name: "validators:convertUnits",
    ok: convertValid.success,
  });

  return results;
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const required = [
    "UNIT_CREATED",
    "UNIT_UPDATED",
    "UNIT_CONVERSION_CHANGED",
    "UNIT_ACTIVATED",
    "UNIT_SUSPENDED",
    "UNIT_ARCHIVED",
  ] as const;

  return required.map((eventType) => ({
    name: `timeline:${eventType}`,
    ok:
      eventType in UNIT_TIMELINE_EVENT_TYPES &&
      eventType in PRODUCT_TIMELINE_EVENT_TYPES,
  }));
}

function checkWorkspaceTabs(): SmokeResult[] {
  const unitsTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "units");
  return [
    {
      name: "workspace:units tab enabled",
      ok: unitsTab?.available === true && unitsTab.futureIp === null,
    },
    {
      name: "unit workspace tabs",
      ok: UNIT_WORKSPACE_TABS.length === 4,
    },
    {
      name: "unit ui labels",
      ok:
        buildUnitUiLabels(resolveBusinessTerminology(null)).dashboardTitle ===
        "Units of Measure",
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  try {
    createUnitService();
    createUnitConversionService();
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

function checkConversionService(): SmokeResult[] {
  const service = createUnitConversionService();
  const result = service.convert(
    DEFAULT_PRODUCT_USER_MESSAGES,
    {
      id: "from",
      categoryId: "cat",
      name: "Kilogram",
      symbol: "kg",
      conversionFactor: "1",
      decimalPrecision: 3,
      roundingRule: "HALF_UP",
    },
    {
      id: "to",
      categoryId: "cat",
      name: "Gram",
      symbol: "g",
      conversionFactor: "0.001",
      decimalPrecision: 3,
      roundingRule: "HALF_UP",
    },
    1
  );

  return [
    {
      name: "conversion:kg-to-g",
      ok: result.convertedValue === 1000,
      detail:
        result.convertedValue === 1000
          ? undefined
          : `Expected 1000, got ${result.convertedValue}`,
    },
  ];
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
      ? `All ${results.length} IP-003 smoke checks passed.`
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
    ...checkConversionService(),
  ];
  printResults(results);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
