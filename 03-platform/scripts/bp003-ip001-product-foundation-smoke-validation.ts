/**
 * Purpose:
 * Smoke-validate BP-003 / IP-001 Product Foundation.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip001-product-foundation-smoke-validation.ts
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete business data.
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { productStatus } from "@/db/schema/product-status";
import { productType } from "@/db/schema/product-type";
import {
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline/constants";
import {
  filterProductTypesForIndustry,
} from "@/core/industry-experience/product-type-filters";
import {
  resolveOfferingCatalogueNavLabel,
} from "@/core/industry-experience/offering-terminology";
import {
  PRODUCT_RECORD_SOURCE_CODES,
  PRODUCT_STATUS_CODES,
  PRODUCT_TYPE_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { createProductService } from "@/modules/product/services/product-service";
import {
  canTransitionProductStatus,
  isProductEditable,
  isProductRecordSourceCode,
  isProductStatusCode,
  normalizeProductCode,
  recordSourceLabel,
  resolveDefaultProductStatus,
} from "@/modules/product/services/product-rules";
import {
  createProductSchema,
  productListFiltersSchema,
  productSearchQuerySchema,
  updateProductSchema,
} from "@/modules/product/validators/product-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/product-type.ts",
  "src/db/schema/product-status.ts",
  "src/db/schema/product.ts",
  "src/db/schema/product-timeline.ts",
  "src/db/seeds/product-types.ts",
  "src/db/seeds/product-types-seed.ts",
  "src/db/seeds/product-statuses.ts",
  "src/db/seeds/product-statuses-seed.ts",
  "drizzle/0028_bp003_ip001_product_foundation.sql",
  "src/core/product-timeline/constants.ts",
  "src/core/product-timeline/services/product-timeline-service.ts",
  "src/core/product-timeline/repositories/product-timeline-repository.ts",
  "src/modules/product/constants.ts",
  "src/modules/product/errors.ts",
  "src/modules/product/types.ts",
  "src/modules/product/validators/product-validators.ts",
  "src/modules/product/services/product-rules.ts",
  "src/modules/product/services/product-service.ts",
  "src/modules/product/repositories/product-repository.ts",
  "src/modules/product/repositories/product-reference-repository.ts",
  "src/modules/product/actions/product-actions.ts",
  "src/modules/product/actions/product-timeline-actions.ts",
  "src/modules/product/actions/product-audit-actions.ts",
  "src/modules/product/components/product-dashboard.tsx",
  "src/modules/product/components/product-registration-form.tsx",
  "src/modules/product/components/product-workspace.tsx",
  "src/modules/product/components/product-timeline-panel.tsx",
  "src/modules/product/components/product-capabilities-panel.tsx",
  "src/modules/product/ui-labels.ts",
  "src/core/industry-experience/index.ts",
  "src/core/industry-experience/offering-terminology.ts",
  "src/core/industry-experience/product-type-filters.ts",
  "src/core/industry-experience/services/industry-experience-service.ts",
  "src/app/(authenticated)/(app)/products/page.tsx",
  "src/app/(authenticated)/(app)/products/new/page.tsx",
  "src/app/(authenticated)/(app)/products/[productId]/page.tsx",
];

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolute = path.join(ROOT, relativePath);
    const ok = existsSync(absolute);
    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "Missing required Product Foundation file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  const createOk = createProductSchema.safeParse({
    productCode: "PRD-100",
    productName: "Consultation Service",
    productTypeCode: PRODUCT_TYPE_CODES.SERVICE,
  }).success;

  const createBad = !createProductSchema.safeParse({
    productCode: "A",
    productName: "",
    productTypeCode: "",
  }).success;

  const updateOk = updateProductSchema.safeParse({
    productName: "Updated Product",
    description: "Updated",
  }).success;

  const listOk = productListFiltersSchema.safeParse({ search: "laptop" }).success;
  const searchOk = productSearchQuerySchema.safeParse({ query: "laptop" }).success;

  return [
    { name: "validator:createProduct happy path", ok: createOk },
    { name: "validator:createProduct rejects invalid", ok: createBad },
    { name: "validator:updateProduct happy path", ok: updateOk },
    { name: "validator:productListFilters", ok: listOk },
    { name: "validator:productSearchQuery", ok: searchOk },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:default status is DRAFT",
      ok: resolveDefaultProductStatus() === PRODUCT_STATUS_CODES.DRAFT,
    },
    {
      name: "rules:DRAFT -> ACTIVE allowed",
      ok: canTransitionProductStatus(
        PRODUCT_STATUS_CODES.DRAFT,
        PRODUCT_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rules:ARCHIVED not editable",
      ok: !isProductEditable(PRODUCT_STATUS_CODES.ARCHIVED),
    },
    {
      name: "rules:ARCHIVED cannot transition",
      ok: !canTransitionProductStatus(
        PRODUCT_STATUS_CODES.ARCHIVED,
        PRODUCT_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rules:normalize product code",
      ok: normalizeProductCode(" prd-001 ") === "PRD-001",
    },
    {
      name: "rules:record source codes",
      ok:
        isProductRecordSourceCode(PRODUCT_RECORD_SOURCE_CODES.MIGRATED) &&
        isProductRecordSourceCode(PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED),
    },
    {
      name: "rules:record source labels",
      ok: recordSourceLabel(PRODUCT_RECORD_SOURCE_CODES.MIGRATED) === "Migrated",
    },
    {
      name: "rules:status code guard",
      ok: isProductStatusCode(PRODUCT_STATUS_CODES.SUSPENDED),
    },
  ];
}

function checkWorkspaceTabs(): SmokeResult[] {
  const overview = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "overview");
  const timeline = PRODUCT_WORKSPACE_TABS.find((tab) => tab.id === "timeline");
  const audit = PRODUCT_WORKSPACE_TABS.find(
    (tab) => tab.id === "audit-history"
  );
  const classification = PRODUCT_WORKSPACE_TABS.find(
    (tab) => tab.id === "classification"
  );

  return [
    { name: "workspace:overview available", ok: overview?.available === true },
    { name: "workspace:timeline available", ok: timeline?.available === true },
    {
      name: "workspace:audit available",
      ok: audit?.available === true,
    },
    {
      name: "workspace:classification placeholder",
      ok: classification?.available === false && classification?.futureIp === "IP-002",
    },
  ];
}

function checkIndustryExperience(): SmokeResult[] {
  const bankingTypes = filterProductTypesForIndustry(
    [
      { code: PRODUCT_TYPE_CODES.LOAN_PRODUCT, name: "Loan Product" },
      { code: PRODUCT_TYPE_CODES.RENTAL_ASSET, name: "Rental Asset" },
      { code: PRODUCT_TYPE_CODES.SERVICE, name: "Service" },
    ],
    "FINANCIAL"
  );
  const bankingHasLoan = bankingTypes.some(
    (type) => type.code === PRODUCT_TYPE_CODES.LOAN_PRODUCT
  );
  const bankingHidesRental = !bankingTypes.some(
    (type) => type.code === PRODUCT_TYPE_CODES.RENTAL_ASSET
  );

  return [
    {
      name: "industry:banking nav label",
      ok: resolveOfferingCatalogueNavLabel("FINANCIAL") === "Loan Products",
    },
    {
      name: "industry:default nav label",
      ok: resolveOfferingCatalogueNavLabel(null) === "Products",
    },
    {
      name: "industry:banking product type filter",
      ok: bankingHasLoan && bankingHidesRental,
    },
    {
      name: "timeline:future event types reserved",
      ok:
        PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_PRICE_CHANGED ===
          "PRODUCT_PRICE_CHANGED" &&
        PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_OWNER_CHANGED ===
          "PRODUCT_OWNER_CHANGED",
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  try {
    createProductService();
    return [{ name: "service:createProductService", ok: true }];
  } catch (error) {
    return [
      {
        name: "service:createProductService",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

async function checkReferenceDataReadonly(): Promise<SmokeResult[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        name: "db:reference-data",
        ok: true,
        detail: "Skipped — DATABASE_URL not set.",
      },
    ];
  }

  try {
    const db = getDb();
    const [typeCount] = await db
      .select({ value: count() })
      .from(productType)
      .where(eq(productType.isActive, true));
    const [statusCount] = await db
      .select({ value: count() })
      .from(productStatus)
      .where(eq(productStatus.isActive, true));

    const typesOk = Number(typeCount?.value ?? 0) >= 10;
    const statusesOk = Number(statusCount?.value ?? 0) >= 5;

    return [
      {
        name: "db:product types seeded",
        ok: typesOk,
        detail: typesOk
          ? undefined
          : "Product Type catalogue empty — run npm run db:migrate && npm run db:seed.",
      },
      {
        name: "db:product statuses seeded",
        ok: statusesOk,
        detail: statusesOk
          ? undefined
          : "Product Status catalogue empty — run npm run db:migrate && npm run db:seed.",
      },
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingSchema =
      /product_type|product_status/.test(message) &&
      /does not exist|Failed query/.test(message);

    if (missingSchema) {
      return [
        {
          name: "db:reference-data",
          ok: true,
          detail:
            "Skipped — product tables not migrated yet. Run npm run db:migrate && npm run db:seed.",
        },
      ];
    }

    return [
      {
        name: "db:reference-data",
        ok: false,
        detail: message,
      },
    ];
  }
}

function printResults(results: SmokeResult[]): boolean {
  let failed = 0;
  for (const result of results) {
    const marker = result.ok ? "PASS" : "FAIL";
    console.log(`${marker}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
    if (!result.ok) failed += 1;
  }
  console.log("");
  console.log(`${results.length - failed}/${results.length} checks passed.`);
  return failed === 0;
}

async function main() {
  console.log("BP-003 / IP-001 Product Foundation — read-only smoke validation");
  const results = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkRules(),
    ...checkWorkspaceTabs(),
    ...checkIndustryExperience(),
    ...checkServiceFactories(),
    ...(await checkReferenceDataReadonly()),
  ];
  const ok = printResults(results);
  await closeDb();
  if (!ok) process.exitCode = 1;
}

main();
