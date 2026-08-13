/**
 * Purpose:
 * Smoke-validate BP-005 / IP-02 Price Components & Charge Composition.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip02-commercial-composition-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  COMMERCIAL_COMPONENT_TYPE_CODES,
  CommercialError,
  createCommercialCompositionService,
  detectCircularDependencies,
  multiplyScaledByNumber,
  orderComponentsByDependencies,
  parseMoneyToScaled,
  scaledToString,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import type { CurrentBusinessContext } from "@/core/auth/types";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/modules/commercial/money/commercial-money.ts",
  "src/modules/commercial/services/commercial-component-rules.ts",
  "src/modules/commercial/services/commercial-composition-service.ts",
  "src/modules/commercial/services/base-price-resolution-service.ts",
  "scripts/bp005-ip02-commercial-composition-smoke-validation.ts",
  "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function ctx(businessId: string): CurrentBusinessContext {
  return {
    platformUserId: "user-1",
    businessId,
    businessMembershipId: "mem-1",
  };
}

function fixtureResolvedBase(
  overrides: Partial<ResolvedBasePrice> = {},
  provenanceOverrides: Partial<ResolvedBasePrice["provenance"]> = {}
): ResolvedBasePrice {
  const businessId = provenanceOverrides.businessId ?? "biz-a";
  const rest = { ...overrides };
  delete rest.provenance;
  return {
    unitPrice: 1000,
    currencyCode: "KES",
    pricingMethod: "FIXED",
    pricingMethodLabel: "Fixed",
    pricingCatalogueId: "cat-1",
    catalogueCode: "DEFAULT",
    catalogueName: "Default",
    pricingItemId: "price-1",
    offeringId: "offering-1",
    offeringCode: "OFF-1",
    offeringName: "Offering One",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    effectiveAt: "2026-06-01T00:00:00.000Z",
    minimumPrice: null,
    maximumPrice: null,
    customerSegment: null,
    salesChannel: null,
    region: null,
    resolvedAt: "2026-06-01T00:00:00.000Z",
    ...rest,
    provenance: {
      businessId,
      offeringId: "offering-1",
      effectiveAt: "2026-06-01T00:00:00.000Z",
      pricingCatalogueId: "cat-1",
      catalogueCode: "DEFAULT",
      catalogueName: "Default",
      pricingItemId: "price-1",
      pricingMethod: "FIXED",
      pricingMethodLabel: "Fixed",
      dimensions: {
        currencyCode: "KES",
        customerSegment: null,
        salesChannel: null,
        region: null,
        pricingCatalogueId: null,
        partyId: null,
        quantity: null,
      },
      candidateCount: 1,
      precedenceOwner: "IP-05",
      selectionMode: "SINGLE_CANDIDATE",
      unsupportedDimensionsNoted: [],
      ...provenanceOverrides,
    },
  };
}

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkNoDuplicatePricingMaster(): SmokeResult {
  const commercialDir = path.join(ROOT, "src/modules/commercial");
  const files = walkTs(commercialDir);
  const hasPgPricing = files.some((file) => {
    const content = readFileSync(file, "utf8");
    return (
      content.includes("pgTable") &&
      (content.includes('"pricing_catalogue"') ||
        content.includes('"pricing_item"') ||
        content.includes('"pricing_method"'))
    );
  });
  const schemaPricing = readdirSync(path.join(ROOT, "src/db/schema")).filter(
    (f) => f.startsWith("pricing-")
  );
  return {
    name: "architecture:no-duplicate-pricing-master",
    ok: !hasPgPricing && schemaPricing.length === 3,
    detail: `pricing schemas=${schemaPricing.join(",")}`,
  };
}

function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function checkTc01BaseComponent(): SmokeResult {
  const service = createCommercialCompositionService();
  const result = service.compose(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureResolvedBase(),
    quantity: 1,
  });
  const principal = result.components.find(
    (c) => c.componentTypeCode === COMMERCIAL_COMPONENT_TYPE_CODES.PRINCIPAL
  );
  const ok =
    !!principal &&
    principal.amountNumber === 1000 &&
    result.payableCandidateNumber === 1000 &&
    principal.provenance.source === "IP-01_RESOLVED_BASE_PRICE" &&
    principal.provenance.pricingItemId === "price-1";
  return {
    name: "TC-01:base-principal-component",
    ok,
    detail: ok ? undefined : JSON.stringify(principal),
  };
}

function checkTc02MultipleComponents(): SmokeResult {
  const service = createCommercialCompositionService();
  const result = service.compose(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureResolvedBase({ unitPrice: 850 }),
    additionalComponents: [
      {
        componentId: "commission-1",
        componentTypeCode: COMMERCIAL_COMPONENT_TYPE_CODES.COMMISSION,
        amount: 50,
        currencyCode: "KES",
        calculationBasis: "Configured commission rule",
        provenance: { ruleId: "rule-comm-1" },
      },
      {
        componentId: "tax-1",
        componentTypeCode: COMMERCIAL_COMPONENT_TYPE_CODES.TAX,
        amount: 100,
        currencyCode: "KES",
        calculationBasis: "Taxable basis × rate (supplied; IP-03 owns calc)",
        provenance: { ruleId: "rule-tax-1" },
      },
    ],
  });
  const codes = result.components.map((c) => c.componentTypeCode);
  const ok =
    codes.includes("PRINCIPAL") &&
    codes.includes("COMMISSION") &&
    codes.includes("TAX") &&
    result.components.length === 3 &&
    result.payableCandidateNumber === 1000 &&
    result.reconciled;
  return {
    name: "TC-02:multiple-components-identity",
    ok,
    detail: ok
      ? undefined
      : `codes=${codes.join(",")} payable=${result.payableCandidate}`,
  };
}

function checkTc03PositiveNegative(): SmokeResult {
  const service = createCommercialCompositionService();
  const result = service.compose(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureResolvedBase({ unitPrice: 1000 }),
    additionalComponents: [
      {
        componentId: "commission-1",
        componentTypeCode: "COMMISSION",
        amount: 100,
        currencyCode: "KES",
      },
      {
        componentId: "tax-1",
        componentTypeCode: "TAX",
        amount: 198,
        currencyCode: "KES",
      },
      {
        componentId: "discount-1",
        componentTypeCode: "DISCOUNT",
        amount: 50,
        currencyCode: "KES",
      },
    ],
  });
  const discount = result.components.find((c) => c.componentTypeCode === "DISCOUNT");
  const ok =
    discount?.sign === "SUBTRACT" &&
    discount.amountNumber === -50 &&
    result.payableCandidateNumber === 1248;
  return {
    name: "TC-03:positive-and-negative-components",
    ok,
    detail: ok
      ? undefined
      : `discount=${discount?.amount} payable=${result.payableCandidate}`,
  };
}

function checkTc04MonetaryPrecision(): SmokeResult {
  const unit = parseMoneyToScaled("10.125456", "KES");
  const product = multiplyScaledByNumber(unit, 3, "HALF_UP");
  const ok = scaledToString(product) === "30.376368";
  const service = createCommercialCompositionService();
  const result = service.compose(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureResolvedBase({ unitPrice: 10.125456 }),
    quantity: 3,
    presentationScale: 6,
  });
  return {
    name: "TC-04:monetary-precision",
    ok: ok && result.payableCandidate === "30.376368",
    detail: `product=${scaledToString(product)} payable=${result.payableCandidate}`,
  };
}

function checkTc05CurrencyIsolation(): SmokeResult {
  const service = createCommercialCompositionService();
  try {
    service.compose(ctx("biz-a"), {
      businessId: "biz-a",
      resolvedBasePrice: fixtureResolvedBase(),
      additionalComponents: [
        {
          componentId: "tax-usd",
          componentTypeCode: "TAX",
          amount: 10,
          currencyCode: "USD",
        },
      ],
    });
    return { name: "TC-05:currency-isolation", ok: false, detail: "Expected failure" };
  } catch (error) {
    const ok =
      error instanceof CommercialError && error.code === "CURRENCY_MISMATCH";
    return {
      name: "TC-05:currency-isolation",
      ok,
      detail: ok ? undefined : String(error),
    };
  }
}

function checkTc06BusinessIsolation(): SmokeResult {
  const service = createCommercialCompositionService();
  try {
    service.compose(ctx("biz-b"), {
      businessId: "biz-a",
      resolvedBasePrice: fixtureResolvedBase(),
    });
    return { name: "TC-06:business-isolation", ok: false, detail: "Expected failure" };
  } catch (error) {
    const mismatchContext =
      error instanceof CommercialError &&
      error.code === "BUSINESS_CONTEXT_MISMATCH";

    let provenanceGuard = false;
    try {
      service.compose(ctx("biz-a"), {
        businessId: "biz-a",
        resolvedBasePrice: fixtureResolvedBase({}, { businessId: "biz-b" }),
      });
    } catch (inner) {
      provenanceGuard =
        inner instanceof CommercialError &&
        inner.code === "BUSINESS_CONTEXT_MISMATCH";
    }

    return {
      name: "TC-06:business-isolation",
      ok: mismatchContext && provenanceGuard,
    };
  }
}

function checkTc07Determinism(): SmokeResult {
  const service = createCommercialCompositionService();
  const request = {
    businessId: "biz-a" as const,
    resolvedBasePrice: fixtureResolvedBase({ unitPrice: 850 }),
    additionalComponents: [
      {
        componentId: "commission-1",
        componentTypeCode: "COMMISSION" as const,
        amount: 50,
        currencyCode: "KES",
      },
      {
        componentId: "tax-1",
        componentTypeCode: "TAX" as const,
        amount: 100,
        currencyCode: "KES",
      },
    ],
  };
  const a = service.compose(ctx("biz-a"), request);
  const b = service.compose(ctx("biz-a"), request);
  const stripTime = (r: typeof a) => ({
    ...r,
    composedAt: "fixed",
  });
  const ok = JSON.stringify(stripTime(a)) === JSON.stringify(stripTime(b));
  return { name: "TC-07:determinism", ok };
}

function checkTc08MissingConfiguration(): SmokeResult {
  const service = createCommercialCompositionService();
  const cases: boolean[] = [];

  try {
    service.compose(ctx("biz-a"), {
      businessId: "biz-a",
      resolvedBasePrice: fixtureResolvedBase(),
      additionalComponents: [
        {
          componentId: "x",
          componentTypeCode: "UNKNOWN_TYPE",
          amount: 1,
          currencyCode: "KES",
        },
      ],
    });
    cases.push(false);
  } catch (error) {
    cases.push(
      error instanceof CommercialError && error.code === "UNKNOWN_COMPONENT_TYPE"
    );
  }

  try {
    service.compose(ctx("biz-a"), {
      businessId: "biz-a",
      resolvedBasePrice: fixtureResolvedBase(),
      quantity: 0,
    });
    cases.push(false);
  } catch (error) {
    cases.push(error instanceof CommercialError && error.code === "INVALID_INPUT");
  }

  const circular = detectCircularDependencies(
    ["a", "b"],
    [
      { fromComponentId: "a", toComponentId: "b" },
      { fromComponentId: "b", toComponentId: "a" },
    ]
  );

  return {
    name: "TC-08:missing-config-explicit-fail",
    ok: cases.every(Boolean) && circular,
  };
}

function checkTc09Provenance(): SmokeResult {
  const service = createCommercialCompositionService();
  const result = service.compose(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureResolvedBase(),
    additionalComponents: [
      {
        componentId: "tax-1",
        componentTypeCode: "TAX",
        amount: 16,
        currencyCode: "KES",
        calculationBasis: "basis × rate",
        provenance: { ruleId: "TAX-RULE-1", ruleVersion: "v1" },
      },
    ],
  });
  const principal = result.components.find((c) => c.componentTypeCode === "PRINCIPAL")!;
  const tax = result.components.find((c) => c.componentTypeCode === "TAX")!;
  const ok =
    principal.provenance.pricingItemId === "price-1" &&
    principal.provenance.pricingCatalogueId === "cat-1" &&
    principal.provenance.pricingMethod === "FIXED" &&
    tax.provenance.ruleId === "TAX-RULE-1" &&
    tax.calculationBasis === "basis × rate" &&
    result.basePriceProvenance.pricingItemId === "price-1";
  return { name: "TC-09:provenance", ok };
}

function checkCircularOrdering(): SmokeResult {
  try {
    orderComponentsByDependencies(
      ["a", "b", "c"],
      [
        { fromComponentId: "b", toComponentId: "a" },
        { fromComponentId: "c", toComponentId: "b" },
        { fromComponentId: "a", toComponentId: "c" },
      ]
    );
    return { name: "rules:circular-dependency-rejected", ok: false };
  } catch (error) {
    return {
      name: "rules:circular-dependency-rejected",
      ok:
        error instanceof CommercialError &&
        error.code === "CIRCULAR_COMPONENT_DEPENDENCY",
    };
  }
}

function checkDoesNotBypassIp01(): SmokeResult {
  const compositionSrc = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/commercial-composition-service.ts"
    ),
    "utf8"
  );
  const ok =
    compositionSrc.includes("createBasePriceResolutionService") &&
    compositionSrc.includes("resolveBasePrice") &&
    !compositionSrc.includes("searchPriceItems") &&
    !compositionSrc.includes("createPricingService");
  return {
    name: "architecture:ip02-consumes-ip01-not-bp003-directly",
    ok,
  };
}

async function checkTc10Regression(): Promise<SmokeResult[]> {
  const { spawnSync } = await import("node:child_process");
  const scripts = [
    "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
    "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
  ];
  return scripts.map((script) => {
    const result = spawnSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", script],
      {
        cwd: ROOT,
        encoding: "utf8",
        shell: true,
      }
    );
    return {
      name: `TC-10:regression:${path.basename(script)}`,
      ok: result.status === 0,
      detail:
        result.status === 0
          ? undefined
          : (result.stderr || result.stdout || "failed").slice(0, 400),
    };
  });
}

async function main() {
  console.log("\nBP-005 / IP-02 Commercial Composition Smoke Validation\n");

  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    checkNoDuplicatePricingMaster(),
    checkDoesNotBypassIp01(),
    checkCircularOrdering(),
    checkTc01BaseComponent(),
    checkTc02MultipleComponents(),
    checkTc03PositiveNegative(),
    checkTc04MonetaryPrecision(),
    checkTc05CurrencyIsolation(),
    checkTc06BusinessIsolation(),
    checkTc07Determinism(),
    checkTc08MissingConfiguration(),
    checkTc09Provenance(),
    ...(await checkTc10Regression()),
  ];

  let failed = 0;
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    if (!result.ok) failed += 1;
    console.log(
      `${mark}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }

  console.log(
    `\n${failed === 0 ? `All ${results.length} IP-02 smoke checks passed.` : `${failed}/${results.length} checks failed.`}\n`
  );
  process.exitCode = failed === 0 ? 0 : 1;
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await closeDb();
});
