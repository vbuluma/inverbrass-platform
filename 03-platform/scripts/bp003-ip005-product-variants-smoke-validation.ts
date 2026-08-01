/**
 * Purpose:
 * Smoke-validate BP-003 / IP-005 Product Variants Engine.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip005-product-variants-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { resolveVariantLabel } from "@/core/industry-experience/variant-terminology";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import { VARIANT_TIMELINE_EVENT_TYPES } from "@/core/variant-timeline/constants";
import {
  PRODUCT_WORKSPACE_TABS,
  VARIANT_STATUS_CODES,
} from "@/modules/product/constants";
import { createProductVariantService } from "@/modules/product/services/product-variant-service";
import {
  buildCloneVariantCode,
  canTransitionVariantStatus,
  isParentProductAvailableForVariants,
  isVariantEditable,
  normalizeVariantCode,
  resolveDefaultVariantStatus,
} from "@/modules/product/services/product-variant-rules";
import { computeVariantFingerprint } from "@/modules/product/services/product-variant-validation-service";
import {
  cloneVariantSchema,
  createVariantSchema,
  searchVariantsSchema,
  updateVariantSchema,
} from "@/modules/product/validators/variant-validators";
import { VARIANT_UI_LABELS } from "@/modules/product/variant-ui-labels";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0033_bp003_ip005_product_variants.sql",
  "src/db/schema/product-variant.ts",
  "src/db/schema/product-variant-attribute.ts",
  "src/db/schema/variant-timeline.ts",
  "src/core/variant-timeline/index.ts",
  "src/core/industry-experience/variant-terminology.ts",
  "src/modules/product/variant-ui-labels.ts",
  "src/modules/product/repositories/product-variant-repository.ts",
  "src/modules/product/repositories/product-variant-attribute-repository.ts",
  "src/modules/product/services/product-variant-rules.ts",
  "src/modules/product/services/product-variant-validation-service.ts",
  "src/modules/product/services/product-variant-audit-query-service.ts",
  "src/modules/product/services/product-variant-service.ts",
  "src/modules/product/validators/variant-validators.ts",
  "src/modules/product/actions/variant-actions.ts",
  "src/modules/product/components/variant-dashboard.tsx",
  "src/modules/product/components/variant-registration-form.tsx",
  "src/modules/product/components/variant-workspace.tsx",
  "src/modules/product/components/product-variants-panel.tsx",
  "src/modules/product/components/variant-timeline-panel.tsx",
  "src/modules/product/components/variant-audit-history-panel.tsx",
  "src/app/(authenticated)/(app)/products/variants/page.tsx",
  "src/app/(authenticated)/(app)/products/variants/new/page.tsx",
  "src/app/(authenticated)/(app)/products/variants/[variantId]/page.tsx",
  "scripts/bp003-ip005-product-variants-smoke-validation.ts",
];

const MIGRATION_TAGS = ["0033_bp003_ip005_product_variants"];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-005 file.",
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
  const definitionIdA = "550e8400-e29b-41d4-a716-446655440001";
  const definitionIdB = "550e8400-e29b-41d4-a716-446655440002";

  const fingerprint = computeVariantFingerprint([
    { attributeDefinitionId: definitionIdA, value: "RED" },
    { attributeDefinitionId: definitionIdB, value: "128GB" },
  ]);

  return [
    {
      name: "rules:normalizeVariantCode",
      ok: normalizeVariantCode(" sku-001 ") === "SKU-001",
    },
    {
      name: "rules:defaultStatus",
      ok: resolveDefaultVariantStatus() === VARIANT_STATUS_CODES.DRAFT,
    },
    {
      name: "rules:editableAndParent",
      ok:
        isVariantEditable(VARIANT_STATUS_CODES.ACTIVE) &&
        !isVariantEditable(VARIANT_STATUS_CODES.ARCHIVED) &&
        isParentProductAvailableForVariants("ACTIVE") &&
        !isParentProductAvailableForVariants("ARCHIVED"),
    },
    {
      name: "rules:statusTransition",
      ok:
        canTransitionVariantStatus(
          VARIANT_STATUS_CODES.DRAFT,
          VARIANT_STATUS_CODES.ACTIVE
        ) &&
        !canTransitionVariantStatus(
          VARIANT_STATUS_CODES.ARCHIVED,
          VARIANT_STATUS_CODES.ACTIVE
        ),
    },
    {
      name: "rules:cloneCode",
      ok: buildCloneVariantCode("SKU-001").startsWith("SKU-001_COPY"),
    },
    {
      name: "rules:fingerprint",
      ok: typeof fingerprint === "string" && fingerprint.length > 0,
    },
    {
      name: "rules:industryLabel",
      ok:
        resolveVariantLabel("RETAIL") === "Variants" &&
        resolveVariantLabel("HEALTHCARE") === "Service Options",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const definitionId = "550e8400-e29b-41d4-a716-446655440000";

  return [
    {
      name: "validators:createVariant",
      ok: createVariantSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440099",
        variantCode: "SKU-001",
        variantName: "128GB Black",
        attributes: [{ attributeDefinitionId: definitionId, value: "BLACK" }],
      }).success,
    },
    {
      name: "validators:updateVariant",
      ok: updateVariantSchema.safeParse({ variantName: "Updated Name" }).success,
    },
    {
      name: "validators:cloneVariant",
      ok: cloneVariantSchema.safeParse({ variantName: "Clone" }).success,
    },
    {
      name: "validators:searchVariants",
      ok: searchVariantsSchema.safeParse({ query: "sku" }).success,
    },
  ];
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const variantEvents = [
    "VARIANT_CREATED",
    "VARIANT_UPDATED",
    "VARIANT_CLONED",
    "VARIANT_ACTIVATED",
    "VARIANT_SUSPENDED",
    "VARIANT_ARCHIVED",
  ] as const;

  return variantEvents.flatMap((eventType) => [
    {
      name: `timeline:variant:${eventType}`,
      ok: eventType in VARIANT_TIMELINE_EVENT_TYPES,
    },
    {
      name: `timeline:product:${eventType}`,
      ok: eventType in PRODUCT_TIMELINE_EVENT_TYPES,
    },
  ]);
}

function checkWorkspaceTabs(): SmokeResult[] {
  const variantsTab = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "variants");
  return [
    {
      name: "workspace:variants tab enabled",
      ok: variantsTab?.available === true && variantsTab.futureIp === null,
    },
    {
      name: "variant ui labels",
      ok: VARIANT_UI_LABELS.dashboardTitle === "Product Variants",
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  try {
    createProductVariantService();
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
      ? `All ${results.length} IP-005 smoke checks passed.`
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
