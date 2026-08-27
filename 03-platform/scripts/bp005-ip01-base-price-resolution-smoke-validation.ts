/**
 * Purpose:
 * Smoke-validate BP-005 / IP-01 Base Price Consumption & Applicable Selection.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip01-base-price-resolution-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  BP003_SUPPORTED_PRICE_DIMENSIONS,
  BP003_UNSUPPORTED_PRICE_DIMENSIONS,
  createBasePriceResolutionService,
  createInterimIp05BasePricePrecedenceResolver,
  filterApplicableCandidates,
  interimSpecificityScore,
  isEffectiveAtInWindow,
  isItemLifecycleApplicable,
  noteUnsupportedDimensions,
  resolveEffectiveAt,
  type RawPriceItemForCandidate,
} from "@/modules/commercial";
import { PRICING_ITEM_STATUS_CODES } from "@/modules/product/constants";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/modules/commercial/index.ts",
  "src/modules/commercial/constants.ts",
  "src/modules/commercial/errors.ts",
  "src/modules/commercial/types.ts",
  "src/modules/commercial/adapters/bp003-pricing-read-adapter.ts",
  "src/modules/commercial/services/base-price-candidate-rules.ts",
  "src/modules/commercial/services/base-price-resolution-service.ts",
  "src/modules/commercial/services/ip05-base-price-precedence-port.ts",
  "src/modules/crm/adapters/pricing-resolution-adapter.ts",
  "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-01 file.",
  }));
}

function checkNoDuplicatePricingMaster(): SmokeResult[] {
  const commercialDir = path.join(ROOT, "src/modules/commercial");
  const schemaDir = path.join(ROOT, "src/db/schema");
  const results: SmokeResult[] = [];

  const commercialFiles = walkTsFiles(commercialDir);
  const hasPricingTableCreate = commercialFiles.some((file) => {
    const content = readFileSync(file, "utf8");
    return (
      content.includes("pgTable") &&
      (content.includes('"pricing_catalogue"') ||
        content.includes('"pricing_item"') ||
        content.includes('"pricing_method"'))
    );
  });

  results.push({
    name: "architecture:no-duplicate-pricing-master-in-commercial",
    ok: !hasPricingTableCreate,
    detail: hasPricingTableCreate
      ? "Commercial module must not define pricing_* tables."
      : undefined,
  });

  const schemaFiles = readdirSync(schemaDir).filter((f) => f.endsWith(".ts"));
  const pricingSchemas = schemaFiles.filter((f) => f.startsWith("pricing-"));
  results.push({
    name: "architecture:bp003-pricing-schemas-unchanged-set",
    ok:
      pricingSchemas.includes("pricing-catalogue.ts") &&
      pricingSchemas.includes("pricing-item.ts") &&
      pricingSchemas.includes("pricing-method.ts") &&
      pricingSchemas.length === 3,
    detail: `Found pricing schemas: ${pricingSchemas.join(", ")}`,
  });

  return results;
}

function walkTsFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function checkCrmAdapterWiring(): SmokeResult[] {
  const adapterPath = path.join(
    ROOT,
    "src/modules/crm/adapters/pricing-resolution-adapter.ts"
  );
  const content = readFileSync(adapterPath, "utf8");
  return [
    {
      name: "wiring:crm-adapter-uses-bp005-ip01",
      ok:
        content.includes("createBasePriceResolutionService") &&
        content.includes("@/modules/commercial") &&
        !content.includes("scorePricingCandidate"),
      detail:
        "PricingResolutionAdapter must delegate to BP-005 IP-01 (no local scoring).",
    },
    {
      name: "wiring:crm-adapter-does-not-call-pricing-service-directly",
      ok: !content.includes("createPricingService"),
      detail: "CRM adapter must not bypass IP-01 via PricingService.",
    },
  ];
}

function fixtureItem(
  overrides: Partial<RawPriceItemForCandidate> & { id: string }
): RawPriceItemForCandidate {
  return {
    offeringId: "offering-1",
    offeringCode: "OFF-1",
    offeringName: "Offering One",
    pricingCatalogueId: "cat-default",
    catalogueCode: "DEFAULT",
    catalogueName: "Default",
    catalogueStatus: "ACTIVE",
    currencyCode: "KES",
    unitPrice: "1000",
    minimumPrice: null,
    maximumPrice: null,
    pricingMethod: "FIXED",
    pricingMethodLabel: "Fixed",
    customerSegment: null,
    salesChannel: null,
    region: null,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    status: PRICING_ITEM_STATUS_CODES.ACTIVE,
    ...overrides,
  };
}

function checkTc01SingleApplicable(): SmokeResult {
  const items = [
    fixtureItem({ id: "price-1", unitPrice: "1000" }),
    fixtureItem({
      id: "price-draft",
      unitPrice: "999",
      status: PRICING_ITEM_STATUS_CODES.DRAFT,
    }),
  ];
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    items,
    { currencyCode: "KES" },
    asAt
  );
  const precedence = createInterimIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    },
    effectiveAt: asAt,
    candidates,
  });

  const ok =
    candidates.length === 1 &&
    candidates[0]?.pricingItemId === "price-1" &&
    precedence.outcome === "WINNER" &&
    precedence.winner.unitPrice === 1000;

  return {
    name: "TC-01:single-applicable-price",
    ok,
    detail: ok
      ? undefined
      : `candidates=${candidates.length} outcome=${precedence.outcome}`,
  };
}

function checkTc02EffectiveDating(): SmokeResult {
  const items = [
    fixtureItem({
      id: "past",
      unitPrice: "800",
      effectiveFrom: "2025-01-01T00:00:00.000Z",
      effectiveTo: "2025-12-31T23:59:59.999Z",
    }),
    fixtureItem({
      id: "current",
      unitPrice: "1000",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: "2026-12-31T23:59:59.999Z",
    }),
    fixtureItem({
      id: "future",
      unitPrice: "1200",
      effectiveFrom: "2027-01-01T00:00:00.000Z",
      effectiveTo: null,
    }),
  ];

  const past = filterApplicableCandidates(
    items,
    { currencyCode: "KES" },
    new Date("2025-06-15T00:00:00.000Z")
  );
  const current = filterApplicableCandidates(
    items,
    { currencyCode: "KES" },
    new Date("2026-06-15T00:00:00.000Z")
  );
  const future = filterApplicableCandidates(
    items,
    { currencyCode: "KES" },
    new Date("2027-06-15T00:00:00.000Z")
  );

  const ok =
    past.length === 1 &&
    past[0]?.pricingItemId === "past" &&
    current.length === 1 &&
    current[0]?.pricingItemId === "current" &&
    future.length === 1 &&
    future[0]?.pricingItemId === "future" &&
    !isEffectiveAtInWindow(
      new Date("2027-01-01T00:00:00.000Z"),
      null,
      new Date("2026-06-15T00:00:00.000Z")
    );

  return {
    name: "TC-02:effective-dating",
    ok,
    detail: ok
      ? undefined
      : `past=${past.map((c) => c.pricingItemId)} current=${current.map((c) => c.pricingItemId)} future=${future.map((c) => c.pricingItemId)}`,
  };
}

function checkTc03MultipleCataloguesDimensions(): SmokeResult {
  const items = [
    fixtureItem({
      id: "retail-web",
      pricingCatalogueId: "cat-retail",
      catalogueCode: "RETAIL",
      salesChannel: "WEB",
      unitPrice: "900",
    }),
    fixtureItem({
      id: "wholesale",
      pricingCatalogueId: "cat-wholesale",
      catalogueCode: "WHOLESALE",
      customerSegment: "WHOLESALE",
      unitPrice: "700",
    }),
    fixtureItem({
      id: "wildcard",
      unitPrice: "1000",
    }),
  ];

  const retailWeb = filterApplicableCandidates(
    items,
    {
      currencyCode: "KES",
      pricingCatalogueId: "cat-retail",
      salesChannel: "WEB",
    },
    new Date("2026-06-01T00:00:00.000Z")
  );

  const wholesale = filterApplicableCandidates(
    items,
    {
      currencyCode: "KES",
      customerSegment: "WHOLESALE",
    },
    new Date("2026-06-01T00:00:00.000Z")
  );

  const precedence = createInterimIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      pricingCatalogueId: "cat-retail",
      salesChannel: "WEB",
    },
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
    candidates: retailWeb,
  });

  const ok =
    retailWeb.some((c) => c.pricingItemId === "retail-web") &&
    !retailWeb.some((c) => c.pricingItemId === "wholesale") &&
    wholesale.some((c) => c.pricingItemId === "wholesale") &&
    wholesale.some((c) => c.pricingItemId === "wildcard") &&
    precedence.outcome === "WINNER" &&
    precedence.winner.pricingItemId === "retail-web";

  return {
    name: "TC-03:multiple-catalogues-dimensions",
    ok,
    detail: ok
      ? undefined
      : `retailWeb=${retailWeb.map((c) => c.pricingItemId).join(",")} wholesale=${wholesale.map((c) => c.pricingItemId).join(",")}`,
  };
}

function checkTc04Conflict(): SmokeResult {
  const items = [
    fixtureItem({
      id: "a",
      pricingCatalogueId: "cat-a",
      catalogueCode: "A",
      unitPrice: "1000",
    }),
    fixtureItem({
      id: "b",
      pricingCatalogueId: "cat-b",
      catalogueCode: "B",
      unitPrice: "1100",
    }),
  ];

  const candidates = filterApplicableCandidates(
    items,
    { currencyCode: "KES" },
    new Date("2026-06-01T00:00:00.000Z")
  );

  const precedence = createInterimIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    },
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
    candidates,
  });

  const scoreA = interimSpecificityScore(candidates[0]!, {
    currencyCode: "KES",
  });
  const scoreB = interimSpecificityScore(candidates[1]!, {
    currencyCode: "KES",
  });

  const ok =
    candidates.length === 2 &&
    scoreA === scoreB &&
    precedence.outcome === "CONFLICT" &&
    precedence.tied.length === 2;

  return {
    name: "TC-04:conflict-no-silent-pick",
    ok,
    detail: ok
      ? undefined
      : `outcome=${precedence.outcome} scores=${scoreA}/${scoreB}`,
  };
}

function checkTc05MissingPrice(): SmokeResult {
  const candidates = filterApplicableCandidates(
    [
      fixtureItem({
        id: "expired",
        status: PRICING_ITEM_STATUS_CODES.EXPIRED,
      }),
      fixtureItem({
        id: "wrong-currency",
        currencyCode: "USD",
      }),
    ],
    { currencyCode: "KES" },
    new Date("2026-06-01T00:00:00.000Z")
  );

  const precedence = createInterimIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    },
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
    candidates,
  });

  return {
    name: "TC-05:missing-price-explicit",
    ok: candidates.length === 0 && precedence.outcome === "MISSING",
    detail:
      candidates.length === 0
        ? undefined
        : `Unexpected candidates: ${candidates.map((c) => c.pricingItemId).join(",")}`,
  };
}

function checkTc06TenantIsolationContract(): SmokeResult {
  const servicePath = path.join(
    ROOT,
    "src/modules/commercial/services/base-price-resolution-service.ts"
  );
  const adapterPath = path.join(
    ROOT,
    "src/modules/commercial/adapters/bp003-pricing-read-adapter.ts"
  );
  const serviceSrc = readFileSync(servicePath, "utf8");
  const adapterSrc = readFileSync(adapterPath, "utf8");

  const ok =
    serviceSrc.includes("request.businessId !== context.businessId") &&
    adapterSrc.includes("context.businessId") &&
    adapterSrc.includes("searchPriceItems(context");

  return {
    name: "TC-06:tenant-isolation-contract",
    ok,
    detail: ok
      ? undefined
      : "businessId mismatch guard and BP-003 scoped search required.",
  };
}

function checkTc07PricingMethod(): SmokeResult {
  const items = [
    fixtureItem({
      id: "tiered",
      pricingMethod: "TIERED",
      pricingMethodLabel: "Tiered",
      unitPrice: "50",
    }),
  ];
  const candidates = filterApplicableCandidates(
    items,
    { currencyCode: "KES" },
    new Date("2026-06-01T00:00:00.000Z")
  );

  const ok =
    candidates.length === 1 &&
    candidates[0]?.pricingMethod === "TIERED" &&
    candidates[0]?.pricingMethodLabel === "Tiered";

  return {
    name: "TC-07:pricing-method-preserved",
    ok,
    detail: okDetail(ok, "Method not preserved from BP-003 fixture."),
  };
}

function okDetail(ok: boolean, detail: string): string | undefined {
  return ok ? undefined : detail;
}

function checkTc08Provenance(): SmokeResult {
  const items = [
    fixtureItem({
      id: "prov-1",
      pricingCatalogueId: "cat-x",
      catalogueCode: "CAT-X",
      catalogueName: "Catalogue X",
      pricingMethod: "FIXED",
      pricingMethodLabel: "Fixed",
      salesChannel: "POS",
      unitPrice: "1500",
    }),
  ];
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    items,
    { currencyCode: "KES", salesChannel: "POS" },
    asAt
  );
  const precedence = createInterimIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      salesChannel: "POS",
      quantity: 5,
      partyId: "party-1",
    },
    effectiveAt: asAt,
    candidates,
  });

  const unsupported = noteUnsupportedDimensions({
    quantity: 5,
    partyId: "party-1",
  });

  const ok =
    precedence.outcome === "WINNER" &&
    precedence.winner.pricingItemId === "prov-1" &&
    precedence.winner.catalogueCode === "CAT-X" &&
    precedence.winner.pricingMethod === "FIXED" &&
    unsupported.includes("quantity") &&
    unsupported.includes("partyId") &&
    BP003_SUPPORTED_PRICE_DIMENSIONS.includes("salesChannel") &&
    BP003_UNSUPPORTED_PRICE_DIMENSIONS.includes("quantity");

  return {
    name: "TC-08:provenance-identities",
    ok,
    detail: ok
      ? undefined
      : "Provenance identities or unsupported-dimension notes missing.",
  };
}

function checkLifecycleHelpers(): SmokeResult[] {
  return [
    {
      name: "rules:draft-not-applicable",
      ok: !isItemLifecycleApplicable(PRICING_ITEM_STATUS_CODES.DRAFT),
    },
    {
      name: "rules:active-applicable",
      ok: isItemLifecycleApplicable(PRICING_ITEM_STATUS_CODES.ACTIVE),
    },
    {
      name: "rules:resolve-effective-at-explicit",
      ok:
        resolveEffectiveAt("2026-03-01T12:00:00.000Z").toISOString() ===
        "2026-03-01T12:00:00.000Z",
    },
  ];
}

function checkFactory(): SmokeResult {
  const service = createBasePriceResolutionService();
  return {
    name: "factory:base-price-resolution-service",
    ok: typeof service.resolveBasePrice === "function" &&
      typeof service.identifyCandidates === "function",
  };
}

async function main() {
  console.log("\nBP-005 / IP-01 Base Price Resolution Smoke Validation\n");

  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkNoDuplicatePricingMaster(),
    ...checkCrmAdapterWiring(),
    ...checkLifecycleHelpers(),
    checkTc01SingleApplicable(),
    checkTc02EffectiveDating(),
    checkTc03MultipleCataloguesDimensions(),
    checkTc04Conflict(),
    checkTc05MissingPrice(),
    checkTc06TenantIsolationContract(),
    checkTc07PricingMethod(),
    checkTc08Provenance(),
    checkFactory(),
  ];

  let failed = 0;
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    if (!result.ok) {
      failed += 1;
    }
    console.log(
      `${mark}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }

  console.log(
    `\n${failed === 0 ? `All ${results.length} IP-01 smoke checks passed.` : `${failed}/${results.length} checks failed.`}\n`
  );

  process.exitCode = failed === 0 ? 0 : 1;
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await closeDb();
});
