/**
 * Purpose:
 * Smoke-validate BP-005 / IP-05 Pricing Precedence, Eligibility & Conflict Resolution.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip05-pricing-precedence-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  BASE_PRICE_PRECEDENCE_WEIGHTS,
  BASE_PRICE_RESOLUTION_CODES,
  basePriceSpecificityScore,
  createIp05BasePricePrecedenceResolver,
  filterApplicableCandidates,
  isEffectiveAtInWindow,
  type RawPriceItemForCandidate,
} from "@/modules/commercial";
import { PRICING_ITEM_STATUS_CODES } from "@/modules/product/constants";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/modules/commercial/services/pricing-precedence-rules.ts",
  "src/modules/commercial/services/ip05-base-price-precedence-port.ts",
  "src/modules/commercial/services/base-price-resolution-service.ts",
  "src/modules/commercial/services/base-price-candidate-rules.ts",
  "scripts/bp005-ip05-pricing-precedence-smoke-validation.ts",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function fixtureItem(
  overrides: Partial<RawPriceItemForCandidate> & { id: string }
): RawPriceItemForCandidate {
  return {
    offeringId: "offering-1",
    offeringCode: "OFF-1",
    offeringName: "Offering One",
    pricingCatalogueId: "cat-default",
    catalogueCode: "DEFAULT",
    catalogueName: "Default Catalogue",
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

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-05 file.",
  }));
}

function checkNoDuplicatePricingMaster(): SmokeResult {
  const commercialDir = path.join(ROOT, "src/modules/commercial");
  const files = walkTsFiles(commercialDir);
  const hasPricingTableCreate = files.some((file) => {
    const content = readFileSync(file, "utf8");
    return (
      content.includes("pgTable") &&
      (content.includes('"pricing_catalogue"') ||
        content.includes('"pricing_item"') ||
        content.includes('"pricing_method"'))
    );
  });
  return {
    name: "architecture:no-duplicate-pricing-master",
    ok: !hasPricingTableCreate,
    detail: hasPricingTableCreate
      ? "Commercial module must not define pricing_* tables."
      : undefined,
  };
}

function checkWeightsExplicit(): SmokeResult {
  const ok =
    BASE_PRICE_PRECEDENCE_WEIGHTS.CATALOGUE_EXACT > 0 &&
    BASE_PRICE_PRECEDENCE_WEIGHTS.DIMENSION_EXACT >
      BASE_PRICE_PRECEDENCE_WEIGHTS.DIMENSION_WILDCARD_WHEN_REQUESTED &&
    BASE_PRICE_RESOLUTION_CODES.PRICE_CONFLICT === "PRICE_CONFLICT";
  return {
    name: "architecture:explicit-precedence-weights",
    ok,
    detail: ok ? undefined : "Precedence weights / resolution codes missing.",
  };
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
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function tc01SingleCandidate(): SmokeResult {
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    [
      fixtureItem({ id: "only", unitPrice: "1000" }),
      fixtureItem({
        id: "draft",
        unitPrice: "1",
        status: PRICING_ITEM_STATUS_CODES.DRAFT,
      }),
    ],
    { currencyCode: "KES" },
    asAt
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
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
    result.outcome === "WINNER" &&
    result.resolutionCode === "PRICE_RESOLVED" &&
    result.winner.pricingItemId === "only" &&
    result.selectionMode === "SINGLE_CANDIDATE" &&
    result.explanation.winningPricingItemId === "only";
  return {
    name: "TC-01:single-candidate",
    ok,
    detail: ok ? undefined : `outcome=${result.outcome}`,
  };
}

function tc02SpecificBeatsGeneric(): SmokeResult {
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    [
      fixtureItem({ id: "generic", unitPrice: "1200" }),
      fixtureItem({
        id: "channel",
        unitPrice: "1000",
        salesChannel: "WEB",
      }),
    ],
    { currencyCode: "KES", salesChannel: "WEB" },
    asAt
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      salesChannel: "WEB",
    },
    effectiveAt: asAt,
    candidates,
  });
  const ok =
    result.outcome === "WINNER" &&
    result.winner.pricingItemId === "channel" &&
    result.selectionMode === "SPECIFICITY" &&
    result.explanation.suppressed.some((s) => s.pricingItemId === "generic");
  return {
    name: "TC-02:specific-beats-generic",
    ok,
    detail: ok
      ? undefined
      : `winner=${result.outcome === "WINNER" ? result.winner.pricingItemId : result.outcome}`,
  };
}

function tc03CataloguePrecedence(): SmokeResult {
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    [
      fixtureItem({
        id: "cat-match",
        pricingCatalogueId: "cat-retail",
        catalogueCode: "RETAIL",
        unitPrice: "900",
      }),
      fixtureItem({
        id: "other-cat",
        pricingCatalogueId: "cat-other",
        catalogueCode: "OTHER",
        unitPrice: "800",
      }),
    ],
    { currencyCode: "KES", pricingCatalogueId: "cat-retail" },
    asAt
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      pricingCatalogueId: "cat-retail",
    },
    effectiveAt: asAt,
    candidates,
  });
  const ok =
    candidates.length === 1 &&
    candidates[0]?.pricingItemId === "cat-match" &&
    result.outcome === "WINNER" &&
    result.winner.pricingItemId === "cat-match";
  return {
    name: "TC-03:catalogue-precedence",
    ok,
    detail: ok
      ? undefined
      : `candidates=${candidates.map((c) => c.pricingItemId).join(",")}`,
  };
}

function tc04EffectiveDate(): SmokeResult {
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
    past[0]?.pricingItemId === "past" &&
    current[0]?.pricingItemId === "current" &&
    future[0]?.pricingItemId === "future" &&
    !isEffectiveAtInWindow(
      new Date("2027-01-01T00:00:00.000Z"),
      null,
      new Date("2026-06-15T00:00:00.000Z")
    );
  return {
    name: "TC-04:effective-dating",
    ok,
    detail: ok ? undefined : "Effective dating windows incorrect.",
  };
}

function tc05Lifecycle(): SmokeResult {
  const candidates = filterApplicableCandidates(
    [
      fixtureItem({
        id: "draft",
        status: PRICING_ITEM_STATUS_CODES.DRAFT,
      }),
      fixtureItem({
        id: "expired",
        status: PRICING_ITEM_STATUS_CODES.EXPIRED,
      }),
      fixtureItem({
        id: "active",
        status: PRICING_ITEM_STATUS_CODES.ACTIVE,
        unitPrice: "1000",
      }),
    ],
    { currencyCode: "KES" },
    new Date("2026-06-01T00:00:00.000Z")
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    },
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
    candidates,
  });
  const ok =
    candidates.length === 1 &&
    candidates[0]?.pricingItemId === "active" &&
    result.outcome === "WINNER";
  return {
    name: "TC-05:lifecycle-eligibility",
    ok,
    detail: ok
      ? undefined
      : `candidates=${candidates.map((c) => c.pricingItemId).join(",")}`,
  };
}

function tc06ExactTie(): SmokeResult {
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    [
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
    ],
    { currencyCode: "KES" },
    asAt
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    },
    effectiveAt: asAt,
    candidates,
  });
  const scoreA = basePriceSpecificityScore(candidates[0]!, {
    currencyCode: "KES",
  });
  const scoreB = basePriceSpecificityScore(candidates[1]!, {
    currencyCode: "KES",
  });
  const ok =
    scoreA === scoreB &&
    result.outcome === "CONFLICT" &&
    result.resolutionCode === "PRICE_CONFLICT" &&
    result.tied.length === 2 &&
    result.explanation.conflictReason != null &&
    result.explanation.precedenceStage === "SPECIFICITY_TIE";
  return {
    name: "TC-06:exact-tie-price-conflict",
    ok,
    detail: ok
      ? undefined
      : `outcome=${result.outcome} scores=${scoreA}/${scoreB}`,
  };
}

function tc07Determinism(): SmokeResult {
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const input = {
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      salesChannel: "WEB",
    },
    effectiveAt: asAt,
    candidates: filterApplicableCandidates(
      [
        fixtureItem({ id: "generic", unitPrice: "1200" }),
        fixtureItem({
          id: "channel",
          unitPrice: "1000",
          salesChannel: "WEB",
        }),
      ],
      { currencyCode: "KES", salesChannel: "WEB" },
      asAt
    ),
  };
  const resolver = createIp05BasePricePrecedenceResolver();
  const a = resolver.resolveWinner(input);
  const b = resolver.resolveWinner(input);
  const ok =
    a.outcome === "WINNER" &&
    b.outcome === "WINNER" &&
    a.winner.pricingItemId === b.winner.pricingItemId &&
    a.explanation.winningScore === b.explanation.winningScore &&
    JSON.stringify(a.explanation.ranked) ===
      JSON.stringify(b.explanation.ranked);
  return {
    name: "TC-07:determinism",
    ok,
    detail: ok ? undefined : "Repeated resolution diverged.",
  };
}

function tc08TenantIsolation(): SmokeResult {
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
    adapterSrc.includes("searchPriceItems(context") &&
    serviceSrc.includes("createIp05BasePricePrecedenceResolver");
  return {
    name: "TC-08:tenant-isolation-and-ip05-wiring",
    ok,
    detail: ok
      ? undefined
      : "businessId guard and IP-05 wiring required on resolution path.",
  };
}

function tc09MissingPrice(): SmokeResult {
  const candidates = filterApplicableCandidates(
    [
      fixtureItem({
        id: "expired",
        status: PRICING_ITEM_STATUS_CODES.EXPIRED,
      }),
      fixtureItem({ id: "usd", currencyCode: "USD" }),
    ],
    { currencyCode: "KES" },
    new Date("2026-06-01T00:00:00.000Z")
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    },
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
    candidates,
  });
  const ok =
    candidates.length === 0 &&
    result.outcome === "MISSING" &&
    result.resolutionCode === "NO_ELIGIBLE_PRICE";
  return {
    name: "TC-09:no-eligible-price",
    ok,
    detail: ok ? undefined : `outcome=${result.outcome}`,
  };
}

function tc10Provenance(): SmokeResult {
  const asAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = filterApplicableCandidates(
    [
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
    ],
    { currencyCode: "KES", salesChannel: "POS" },
    asAt
  );
  const result = createIp05BasePricePrecedenceResolver().resolveWinner({
    request: {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      salesChannel: "POS",
    },
    effectiveAt: asAt,
    candidates,
  });
  const ok =
    result.outcome === "WINNER" &&
    result.winner.pricingItemId === "prov-1" &&
    result.winner.pricingCatalogueId === "cat-x" &&
    result.winner.pricingMethod === "FIXED" &&
    result.explanation.resolutionCode === "PRICE_RESOLVED" &&
    result.explanation.ranked[0]?.pricingItemId === "prov-1";
  return {
    name: "TC-10:provenance-explanation",
    ok,
    detail: ok ? undefined : "Provenance/explanation incomplete.",
  };
}

async function runExternalSmoke(
  scriptRelative: string,
  name: string
): Promise<SmokeResult> {
  const scriptPath = path.join(ROOT, scriptRelative);
  if (!existsSync(scriptPath)) {
    return { name, ok: false, detail: `Missing ${scriptRelative}` };
  }
  const { spawnSync } = await import("node:child_process");
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", scriptPath],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
    }
  );
  const ok = run.status === 0;
  return {
    name,
    ok,
    detail: ok
      ? undefined
      : (run.stdout || run.stderr || `exit=${run.status}`).slice(0, 400),
  };
}

function tc15CrmPath(): SmokeResult {
  const adapterPath = path.join(
    ROOT,
    "src/modules/crm/adapters/pricing-resolution-adapter.ts"
  );
  const src = readFileSync(adapterPath, "utf8");
  const ok =
    src.includes("createBasePriceResolutionService") &&
    src.includes("resolveBasePrice") &&
    !src.includes("interimSpecificityScore") &&
    !src.includes("searchPriceItems");
  return {
    name: "TC-15:crm-quotation-via-ip01-ip05",
    ok,
    detail: ok
      ? undefined
      : "CRM adapter must resolve via BasePriceResolutionService only.",
  };
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    checkNoDuplicatePricingMaster(),
    checkWeightsExplicit(),
    tc01SingleCandidate(),
    tc02SpecificBeatsGeneric(),
    tc03CataloguePrecedence(),
    tc04EffectiveDate(),
    tc05Lifecycle(),
    tc06ExactTie(),
    tc07Determinism(),
    tc08TenantIsolation(),
    tc09MissingPrice(),
    tc10Provenance(),
    tc15CrmPath(),
  ];

  results.push(
    await runExternalSmoke(
      "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
      "TC-11:ip01-regression"
    ),
    await runExternalSmoke(
      "scripts/bp005-ip02-commercial-composition-smoke-validation.ts",
      "TC-12:ip02-regression"
    ),
    await runExternalSmoke(
      "scripts/bp005-ip03-tax-resolution-smoke-validation.ts",
      "TC-13:ip03-regression"
    ),
    await runExternalSmoke(
      "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
      "TC-14:bp003-ip011-regression"
    )
  );

  const failed = results.filter((r) => !r.ok);
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(
      `[${mark}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }
  console.log(
    `\nIP-05 smoke: ${results.length - failed.length}/${results.length} PASS`
  );

  await closeDb().catch(() => undefined);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
