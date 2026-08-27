/**
 * Purpose:
 * Smoke-validate BP-005 / IP-03 Tax Rules & Calculation.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip03-tax-resolution-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { closeDb } from "@/db/client";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CommercialError,
  EXAMPLE_TAX_TYPE_CODES,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  calculateTaxAmount,
  createTaxAwareCommercialCompositionService,
  createTaxResolutionService,
  scaledToString,
  type ResolvedBasePrice,
  type TaxRuleConfiguration,
} from "@/modules/commercial";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/modules/commercial/services/tax-calculation-rules.ts",
  "src/modules/commercial/services/tax-applicability-rules.ts",
  "src/modules/commercial/services/tax-resolution-service.ts",
  "src/modules/commercial/services/tax-composition-bridge.ts",
  "scripts/bp005-ip03-tax-resolution-smoke-validation.ts",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function ctx(businessId: string): CurrentBusinessContext {
  return {
    platformUserId: "user-1",
    businessId,
    businessMembershipId: "mem-1",
  };
}

function rule(
  overrides: Partial<TaxRuleConfiguration> & Pick<TaxRuleConfiguration, "taxRuleId">
): TaxRuleConfiguration {
  return {
    businessId: "biz-a",
    taxTypeCode: EXAMPLE_TAX_TYPE_CODES.VAT,
    taxTypeLabel: "VAT",
    ratePercent: 16,
    treatment: TAX_TREATMENT_CODES.EXCLUSIVE,
    status: TAX_RULE_STATUS_CODES.ACTIVE,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    currencyCode: "KES",
    ...overrides,
  };
}

function fixtureBase(
  overrides: Partial<ResolvedBasePrice> = {}
): ResolvedBasePrice {
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
    provenance: {
      businessId: "biz-a",
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
    },
    ...overrides,
  };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((f) => ({
    name: `file:${f}`,
    ok: existsSync(path.join(ROOT, f)),
  }));
}

function checkNoTaxTablesInvented(): SmokeResult {
  const commercialHasPgTax = walkTs(
    path.join(ROOT, "src/modules/commercial")
  ).some((file) => {
    const c = readFileSync(file, "utf8");
    return c.includes("pgTable") && /tax_/i.test(c);
  });
  // Pre-existing platform `tax_type` reference table may exist (codes only, no rates).
  // IP-03 must not invent tax_rule / tax_rate masters in commercial module.
  return {
    name: "architecture:no-speculative-tax-tables",
    ok: !commercialHasPgTax,
  };
}

function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkTs(full));
    else if (e.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function checkDoesNotBypassPricing(): SmokeResult {
  const src = readFileSync(
    path.join(ROOT, "src/modules/commercial/services/tax-resolution-service.ts"),
    "utf8"
  );
  const bridge = readFileSync(
    path.join(ROOT, "src/modules/commercial/services/tax-composition-bridge.ts"),
    "utf8"
  );
  const ok =
    !src.includes("searchPriceItems") &&
    !src.includes("createPricingService") &&
    bridge.includes("createCommercialCompositionService") &&
    bridge.includes("createTaxResolutionService");
  return { name: "architecture:no-bp003-bypass", ok };
}

function tc01TaxApplies(): SmokeResult {
  const calc = calculateTaxAmount({
    treatment: TAX_TREATMENT_CODES.EXCLUSIVE,
    ratePercent: 16,
    baseAmount: 1000,
    currencyCode: "KES",
  });
  const ok =
    scaledToString(calc.taxAmount).startsWith("160.") ||
    scaledToString(calc.taxAmount) === "160.000000";
  return {
    name: "TC-01:tax-applies",
    ok: ok && Number(scaledToString(calc.taxAmount)) === 160,
    detail: scaledToString(calc.taxAmount),
  };
}

function tc02Exclusive(): SmokeResult {
  const service = createTaxAwareCommercialCompositionService();
  const result = service.composeWithTax(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureBase(),
    taxRules: [rule({ taxRuleId: "vat-ex" })],
  });
  const ok =
    result.tax.totalTaxAmountNumber === 160 &&
    result.composition.payableCandidateNumber === 1160;
  return {
    name: "TC-02:tax-exclusive",
    ok,
    detail: `tax=${result.tax.totalTaxAmount} payable=${result.composition.payableCandidate}`,
  };
}

function tc03Inclusive(): SmokeResult {
  const service = createTaxAwareCommercialCompositionService();
  const result = service.composeWithTax(ctx("biz-a"), {
    businessId: "biz-a",
    resolvedBasePrice: fixtureBase({ unitPrice: 1160 }),
    taxRules: [
      rule({
        taxRuleId: "vat-inc",
        treatment: TAX_TREATMENT_CODES.INCLUSIVE,
      }),
    ],
  });
  const principal = result.composition.components.find(
    (c) => c.componentTypeCode === "PRINCIPAL"
  );
  const ok =
    result.tax.totalTaxAmountNumber === 160 &&
    principal?.amountNumber === 1000 &&
    result.composition.payableCandidateNumber === 1160 &&
    result.tax.netPrincipalAmount === "1000.00";
  return {
    name: "TC-03:tax-inclusive",
    ok,
    detail: `tax=${result.tax.totalTaxAmount} principal=${principal?.amount} payable=${result.composition.payableCandidate}`,
  };
}

function tc04ZeroRated(): SmokeResult {
  const tax = createTaxResolutionService().resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    baseAmount: 1000,
    taxRules: [
      rule({
        taxRuleId: "zr",
        taxTypeCode: EXAMPLE_TAX_TYPE_CODES.ZERO_RATED,
        taxTypeLabel: "Zero Rated",
        ratePercent: 0,
        treatment: TAX_TREATMENT_CODES.ZERO_RATED,
      }),
    ],
  });
  const ok =
    tax.totalTaxAmountNumber === 0 &&
    tax.taxComponents.length === 1 &&
    tax.taxComponents[0]?.treatment === "ZERO_RATED" &&
    tax.taxComponents[0]?.taxRuleId === "zr";
  return { name: "TC-04:zero-rated", ok };
}

function tc05Exempt(): SmokeResult {
  const tax = createTaxResolutionService().resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    baseAmount: 1000,
    taxRules: [
      rule({
        taxRuleId: "ex",
        taxTypeCode: EXAMPLE_TAX_TYPE_CODES.EXEMPT,
        taxTypeLabel: "Exempt",
        ratePercent: 0,
        treatment: TAX_TREATMENT_CODES.EXEMPT,
      }),
    ],
  });
  const ok =
    tax.totalTaxAmountNumber === 0 &&
    tax.taxComponents[0]?.treatment === "EXEMPT" &&
    tax.taxComponents[0]?.taxRuleId === "ex" &&
    tax.compositionContributions[0]?.provenance?.ruleId === "ex";
  return { name: "TC-05:exempt", ok };
}

function tc06EffectiveDating(): SmokeResult {
  const service = createTaxResolutionService();
  const rules = [
    rule({
      taxRuleId: "past",
      ratePercent: 14,
      effectiveFrom: "2024-01-01T00:00:00.000Z",
      effectiveTo: "2024-12-31T23:59:59.999Z",
    }),
    rule({
      taxRuleId: "current",
      ratePercent: 16,
      effectiveFrom: "2025-01-01T00:00:00.000Z",
      effectiveTo: "2026-12-31T23:59:59.999Z",
    }),
    rule({
      taxRuleId: "future",
      ratePercent: 18,
      effectiveFrom: "2027-01-01T00:00:00.000Z",
      effectiveTo: null,
    }),
  ];

  const past = service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    baseAmount: 1000,
    effectiveAt: "2024-06-01T00:00:00.000Z",
    taxRules: rules,
  });
  const current = service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    baseAmount: 1000,
    effectiveAt: "2026-06-01T00:00:00.000Z",
    taxRules: rules,
  });
  const future = service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    baseAmount: 1000,
    effectiveAt: "2027-06-01T00:00:00.000Z",
    taxRules: rules,
  });

  const ok =
    past.taxComponents[0]?.taxRuleId === "past" &&
    past.totalTaxAmountNumber === 140 &&
    current.taxComponents[0]?.taxRuleId === "current" &&
    current.totalTaxAmountNumber === 160 &&
    future.taxComponents[0]?.taxRuleId === "future" &&
    future.totalTaxAmountNumber === 180;

  return {
    name: "TC-06:effective-dating",
    ok,
    detail: `past=${past.taxComponents[0]?.taxRuleId} current=${current.taxComponents[0]?.taxRuleId} future=${future.taxComponents[0]?.taxRuleId}`,
  };
}

function tc07Conflict(): SmokeResult {
  try {
    createTaxResolutionService().resolve(ctx("biz-a"), {
      businessId: "biz-a",
      currencyCode: "KES",
      baseAmount: 1000,
      taxRules: [
        rule({ taxRuleId: "a", ratePercent: 16 }),
        rule({ taxRuleId: "b", ratePercent: 18 }),
      ],
    });
    return { name: "TC-07:conflict", ok: false, detail: "Expected conflict" };
  } catch (error) {
    return {
      name: "TC-07:conflict",
      ok:
        error instanceof CommercialError &&
        error.code === "TAX_CONFIGURATION_CONFLICT",
    };
  }
}

function tc08Missing(): SmokeResult {
  try {
    createTaxResolutionService().resolve(ctx("biz-a"), {
      businessId: "biz-a",
      currencyCode: "KES",
      baseAmount: 1000,
      taxRules: [],
    });
    return { name: "TC-08:missing", ok: false };
  } catch (error) {
    return {
      name: "TC-08:missing",
      ok:
        error instanceof CommercialError &&
        error.code === "TAX_CONFIGURATION_MISSING",
    };
  }
}

function tc09Isolation(): SmokeResult {
  try {
    createTaxResolutionService().resolve(ctx("biz-b"), {
      businessId: "biz-b",
      currencyCode: "KES",
      baseAmount: 1000,
      taxRules: [rule({ taxRuleId: "a-only", businessId: "biz-a" })],
    });
    return { name: "TC-09:business-isolation", ok: false };
  } catch (error) {
    const missing =
      error instanceof CommercialError &&
      error.code === "TAX_CONFIGURATION_MISSING";

    let contextGuard = false;
    try {
      createTaxResolutionService().resolve(ctx("biz-b"), {
        businessId: "biz-a",
        currencyCode: "KES",
        baseAmount: 1000,
        taxRules: [rule({ taxRuleId: "x" })],
      });
    } catch (inner) {
      contextGuard =
        inner instanceof CommercialError &&
        inner.code === "BUSINESS_CONTEXT_MISMATCH";
    }

    return {
      name: "TC-09:business-isolation",
      ok: missing && contextGuard,
    };
  }
}

function tc10Multiple(): SmokeResult {
  const tax = createTaxResolutionService().resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    baseAmount: 1000,
    taxRules: [
      rule({ taxRuleId: "vat", ratePercent: 16 }),
      rule({
        taxRuleId: "levy",
        taxTypeCode: EXAMPLE_TAX_TYPE_CODES.LEVY,
        taxTypeLabel: "Levy",
        ratePercent: 2,
      }),
    ],
  });
  const ok =
    tax.taxComponents.length === 2 &&
    tax.totalTaxAmountNumber === 180 &&
    tax.compositionContributions.length === 2;
  return {
    name: "TC-10:multiple-tax-components",
    ok,
    detail: `count=${tax.taxComponents.length} total=${tax.totalTaxAmount}`,
  };
}

function tc11Precision(): SmokeResult {
  const calc = calculateTaxAmount({
    treatment: TAX_TREATMENT_CODES.EXCLUSIVE,
    ratePercent: 16,
    baseAmount: "10.125456",
    currencyCode: "KES",
  });
  // 10.125456 * 0.16 = 1.62007296 → HALF_UP at scale 6 = 1.620073
  const taxStr = scaledToString(calc.taxAmount);
  const ok = taxStr === "1.620073";
  return { name: "TC-11:monetary-precision", ok, detail: taxStr };
}

function runSmoke(script: string): SmokeResult {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", script],
    { cwd: ROOT, encoding: "utf8", shell: true }
  );
  return {
    name: `regression:${path.basename(script)}`,
    ok: result.status === 0,
    detail:
      result.status === 0
        ? undefined
        : (result.stderr || result.stdout || "failed").slice(0, 300),
  };
}

async function main() {
  console.log("\nBP-005 / IP-03 Tax Resolution Smoke Validation\n");

  const results: SmokeResult[] = [
    ...checkFiles(),
    checkNoTaxTablesInvented(),
    checkDoesNotBypassPricing(),
    tc01TaxApplies(),
    tc02Exclusive(),
    tc03Inclusive(),
    tc04ZeroRated(),
    tc05Exempt(),
    tc06EffectiveDating(),
    tc07Conflict(),
    tc08Missing(),
    tc09Isolation(),
    tc10Multiple(),
    tc11Precision(),
    runSmoke("scripts/bp005-ip02-commercial-composition-smoke-validation.ts"),
    runSmoke("scripts/bp005-ip01-base-price-resolution-smoke-validation.ts"),
    runSmoke("scripts/bp003-ip011-offering-pricing-smoke-validation.ts"),
  ];

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    if (!r.ok) failed += 1;
    console.log(`${mark}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  console.log(
    `\n${failed === 0 ? `All ${results.length} IP-03 smoke checks passed.` : `${failed}/${results.length} checks failed.`}\n`
  );
  process.exitCode = failed === 0 ? 0 : 1;
  await closeDb();
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
  await closeDb();
});
