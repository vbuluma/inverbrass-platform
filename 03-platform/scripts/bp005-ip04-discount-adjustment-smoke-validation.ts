/**
 * Purpose:
 * Smoke-validate BP-005 / IP-04 Discounts & Commercial Adjustments.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip04-discount-adjustment-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { closeDb } from "@/db/client";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ADJUSTMENT_BASIS_CODES,
  ADJUSTMENT_DIRECTION_CODES,
  ADJUSTMENT_METHOD_CODES,
  ADJUSTMENT_RULE_STATUS_CODES,
  ADJUSTMENT_STACKING_CODES,
  CommercialError,
  EXAMPLE_TAX_TYPE_CODES,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  calculateAdjustmentAmount,
  createAdjustmentAwareCommercialCompositionService,
  createCommercialAdjustmentService,
  scaledToString,
  type CommercialAdjustmentRuleConfiguration,
  type ResolvedBasePrice,
  type TaxRuleConfiguration,
} from "@/modules/commercial";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

function ctx(businessId: string): CurrentBusinessContext {
  return {
    platformUserId: "user-1",
    businessId,
    businessMembershipId: "mem-1",
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

function adj(
  overrides: Partial<CommercialAdjustmentRuleConfiguration> &
    Pick<CommercialAdjustmentRuleConfiguration, "adjustmentRuleId">
): CommercialAdjustmentRuleConfiguration {
  return {
    businessId: "biz-a",
    adjustmentCode: "STD_DISC",
    adjustmentLabel: "Standard Discount",
    method: ADJUSTMENT_METHOD_CODES.PERCENTAGE,
    direction: ADJUSTMENT_DIRECTION_CODES.DISCOUNT,
    basis: ADJUSTMENT_BASIS_CODES.PRINCIPAL,
    percentage: 10,
    status: ADJUSTMENT_RULE_STATUS_CODES.ACTIVE,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    currencyCode: "KES",
    stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
    ...overrides,
  };
}

function vatRule(): TaxRuleConfiguration {
  return {
    taxRuleId: "vat-16",
    businessId: "biz-a",
    taxTypeCode: EXAMPLE_TAX_TYPE_CODES.VAT,
    taxTypeLabel: "VAT",
    ratePercent: 16,
    treatment: TAX_TREATMENT_CODES.EXCLUSIVE,
    status: TAX_RULE_STATUS_CODES.ACTIVE,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    currencyCode: "KES",
  };
}

function checkFiles(): SmokeResult[] {
  const files = [
    "src/modules/commercial/services/discount-calculation-rules.ts",
    "src/modules/commercial/services/discount-applicability-rules.ts",
    "src/modules/commercial/services/commercial-adjustment-service.ts",
    "src/modules/commercial/services/commercial-adjustment-bridge.ts",
    "scripts/bp005-ip04-discount-adjustment-smoke-validation.ts",
  ];
  return files.map((f) => ({
    name: `file:${f}`,
    ok: existsSync(path.join(ROOT, f)),
  }));
}

function checkNoBypass(): SmokeResult {
  const src = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/commercial-adjustment-service.ts"
    ),
    "utf8"
  );
  return {
    name: "architecture:no-bp003-bypass",
    ok: !src.includes("searchPriceItems") && !src.includes("createPricingService"),
  };
}

function tc01Percent(): SmokeResult {
  const calc = calculateAdjustmentAmount({
    method: "PERCENTAGE",
    direction: "DISCOUNT",
    basis: "PRINCIPAL",
    principalAmount: 1000,
    percentage: 10,
    currencyCode: "KES",
  });
  return {
    name: "TC-01:percentage-discount",
    ok: Number(scaledToString(calc.adjustmentMagnitude)) === 100,
    detail: scaledToString(calc.adjustmentMagnitude),
  };
}

function tc02Fixed(): SmokeResult {
  const r = createCommercialAdjustmentService().resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    principalAmount: 1000,
    adjustmentRules: [
      adj({
        adjustmentRuleId: "fix",
        method: "FIXED_AMOUNT",
        percentage: null,
        fixedAmount: 75,
      }),
    ],
  });
  return {
    name: "TC-02:fixed-discount",
    ok: r.totalDiscountAmountNumber === 75,
    detail: r.totalDiscountAmount,
  };
}

function tc03Surcharge(): SmokeResult {
  const r = createCommercialAdjustmentService().resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    principalAmount: 1000,
    adjustmentRules: [
      adj({
        adjustmentRuleId: "surch",
        adjustmentCode: "FUEL",
        direction: "SURCHARGE",
        method: "FIXED_AMOUNT",
        percentage: null,
        fixedAmount: 50,
      }),
    ],
  });
  return {
    name: "TC-03:positive-surcharge",
    ok:
      r.totalSurchargeAmountNumber === 50 &&
      r.adjustments[0]?.componentTypeCode === "SURCHARGE",
  };
}

function tc04UnsupportedBasis(): SmokeResult {
  try {
    calculateAdjustmentAmount({
      method: "PERCENTAGE",
      direction: "DISCOUNT",
      basis: "PRE_TAX" as "PRINCIPAL",
      principalAmount: 1000,
      percentage: 10,
      currencyCode: "KES",
    });
    return { name: "TC-04:unsupported-basis", ok: false };
  } catch (e) {
    return {
      name: "TC-04:unsupported-basis",
      ok:
        e instanceof CommercialError &&
        e.code === "UNSUPPORTED_ADJUSTMENT_BASIS",
    };
  }
}

function tc05ExpiredSafe(): SmokeResult {
  try {
    createCommercialAdjustmentService().resolve(ctx("biz-a"), {
      businessId: "biz-a",
      currencyCode: "KES",
      principalAmount: 1000,
      effectiveAt: "2026-06-01T00:00:00.000Z",
      requireAdjustmentConfiguration: true,
      adjustmentRules: [
        adj({
          adjustmentRuleId: "old",
          status: "EXPIRED",
          effectiveFrom: "2024-01-01T00:00:00.000Z",
          effectiveTo: "2024-12-31T23:59:59.999Z",
        }),
      ],
    });
    return { name: "TC-05:expired-rejected", ok: false };
  } catch (e) {
    return {
      name: "TC-05:expired-rejected",
      ok:
        e instanceof CommercialError &&
        e.code === "ADJUSTMENT_CONFIGURATION_MISSING",
    };
  }
}

function tc06Dating(): SmokeResult {
  const service = createCommercialAdjustmentService();
  const rules = [
    adj({
      adjustmentRuleId: "past",
      percentage: 5,
      effectiveFrom: "2024-01-01T00:00:00.000Z",
      effectiveTo: "2024-12-31T23:59:59.999Z",
    }),
    adj({
      adjustmentRuleId: "current",
      percentage: 10,
      effectiveFrom: "2025-01-01T00:00:00.000Z",
      effectiveTo: "2026-12-31T23:59:59.999Z",
    }),
  ];
  const past = service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    principalAmount: 1000,
    effectiveAt: "2024-06-01T00:00:00.000Z",
    adjustmentRules: rules,
  });
  const current = service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    principalAmount: 1000,
    effectiveAt: "2026-06-01T00:00:00.000Z",
    adjustmentRules: rules,
  });
  return {
    name: "TC-06:effective-dating",
    ok:
      past.adjustments[0]?.adjustmentRuleId === "past" &&
      past.totalDiscountAmountNumber === 50 &&
      current.adjustments[0]?.adjustmentRuleId === "current" &&
      current.totalDiscountAmountNumber === 100,
  };
}

function tc07Isolation(): SmokeResult {
  try {
    createCommercialAdjustmentService().resolve(ctx("biz-b"), {
      businessId: "biz-b",
      currencyCode: "KES",
      principalAmount: 1000,
      requireAdjustmentConfiguration: true,
      adjustmentRules: [adj({ adjustmentRuleId: "a", businessId: "biz-a" })],
    });
    return { name: "TC-07:business-isolation", ok: false };
  } catch (e) {
    return {
      name: "TC-07:business-isolation",
      ok:
        e instanceof CommercialError &&
        e.code === "ADJUSTMENT_CONFIGURATION_MISSING",
    };
  }
}

function tc08Precision(): SmokeResult {
  const calc = calculateAdjustmentAmount({
    method: "PERCENTAGE",
    direction: "DISCOUNT",
    basis: "PRINCIPAL",
    principalAmount: "10.125456",
    percentage: 10,
    currencyCode: "KES",
  });
  return {
    name: "TC-08:exact-monetary",
    ok: scaledToString(calc.adjustmentMagnitude) === "1.012546",
    detail: scaledToString(calc.adjustmentMagnitude),
  };
}

function tc09MultipleCompatible(): SmokeResult {
  const r = createCommercialAdjustmentService().resolve(ctx("biz-a"), {
    businessId: "biz-a",
    currencyCode: "KES",
    principalAmount: 1000,
    adjustmentRules: [
      adj({ adjustmentRuleId: "d1", adjustmentCode: "A", percentage: 10 }),
      adj({
        adjustmentRuleId: "s1",
        adjustmentCode: "B",
        direction: "SURCHARGE",
        method: "FIXED_AMOUNT",
        percentage: null,
        fixedAmount: 25,
      }),
    ],
  });
  return {
    name: "TC-09:compatible-multiple",
    ok:
      r.adjustments.length === 2 &&
      r.totalDiscountAmountNumber === 100 &&
      r.totalSurchargeAmountNumber === 25,
  };
}

function tc10Conflict(): SmokeResult {
  try {
    createCommercialAdjustmentService().resolve(ctx("biz-a"), {
      businessId: "biz-a",
      currencyCode: "KES",
      principalAmount: 1000,
      adjustmentRules: [
        adj({
          adjustmentRuleId: "e1",
          stacking: "EXCLUSIVE",
          percentage: 10,
        }),
        adj({
          adjustmentRuleId: "e2",
          stacking: "EXCLUSIVE",
          percentage: 15,
        }),
      ],
    });
    return { name: "TC-10:conflict", ok: false };
  } catch (e) {
    return {
      name: "TC-10:conflict",
      ok:
        e instanceof CommercialError &&
        e.code === "ADJUSTMENT_CONFIGURATION_CONFLICT",
    };
  }
}

function tc11TaxIntact(): SmokeResult {
  const result = createAdjustmentAwareCommercialCompositionService().composeWithTaxAndAdjustments(
    ctx("biz-a"),
    {
      businessId: "biz-a",
      resolvedBasePrice: fixtureBase(),
      taxRules: [vatRule()],
      adjustmentRules: [adj({ adjustmentRuleId: "d10", percentage: 10 })],
    }
  );
  // Principal 1000, tax 160, discount 100 → payable 1060
  return {
    name: "TC-11:ip03-tax-intact",
    ok:
      result.tax.totalTaxAmountNumber === 160 &&
      result.adjustments.totalDiscountAmountNumber === 100 &&
      result.composition.payableCandidateNumber === 1060,
    detail: `tax=${result.tax.totalTaxAmount} disc=${result.adjustments.totalDiscountAmount} payable=${result.composition.payableCandidate}`,
  };
}

function tc12Provenance(): SmokeResult {
  const result = createAdjustmentAwareCommercialCompositionService().composeWithTaxAndAdjustments(
    ctx("biz-a"),
    {
      businessId: "biz-a",
      resolvedBasePrice: fixtureBase(),
      taxRules: [vatRule()],
      adjustmentRules: [adj({ adjustmentRuleId: "d10" })],
    }
  );
  const principal = result.composition.components.find(
    (c) => c.componentTypeCode === "PRINCIPAL"
  );
  const discount = result.composition.components.find(
    (c) => c.componentTypeCode === "DISCOUNT"
  );
  return {
    name: "TC-12:ip01-provenance",
    ok:
      principal?.provenance.pricingItemId === "price-1" &&
      discount?.provenance.source === "IP-04_ADJUSTMENT_RESOLUTION" &&
      discount?.provenance.ruleId === "d10",
  };
}

function tc13E2E(): SmokeResult {
  const result = createAdjustmentAwareCommercialCompositionService().composeWithTaxAndAdjustments(
    ctx("biz-a"),
    {
      businessId: "biz-a",
      resolvedBasePrice: fixtureBase({ unitPrice: 1000 }),
      taxRules: [vatRule()],
      adjustmentRules: [
        adj({ adjustmentRuleId: "d10", percentage: 10 }),
        adj({
          adjustmentRuleId: "s25",
          adjustmentCode: "SVC",
          direction: "SURCHARGE",
          method: "FIXED_AMOUNT",
          percentage: null,
          fixedAmount: 25,
        }),
      ],
    }
  );
  // 1000 + 160 - 100 + 25 = 1085
  const codes = result.composition.components.map((c) => c.componentTypeCode);
  return {
    name: "TC-13:end-to-end",
    ok:
      codes.includes("PRINCIPAL") &&
      codes.includes("TAX") &&
      codes.includes("DISCOUNT") &&
      codes.includes("SURCHARGE") &&
      result.composition.payableCandidateNumber === 1085 &&
      result.composition.reconciled,
    detail: `payable=${result.composition.payableCandidate} codes=${codes.join(",")}`,
  };
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
  console.log("\nBP-005 / IP-04 Discount & Adjustment Smoke Validation\n");

  const results: SmokeResult[] = [
    ...checkFiles(),
    checkNoBypass(),
    tc01Percent(),
    tc02Fixed(),
    tc03Surcharge(),
    tc04UnsupportedBasis(),
    tc05ExpiredSafe(),
    tc06Dating(),
    tc07Isolation(),
    tc08Precision(),
    tc09MultipleCompatible(),
    tc10Conflict(),
    tc11TaxIntact(),
    tc12Provenance(),
    tc13E2E(),
    runSmoke("scripts/bp005-ip03-tax-resolution-smoke-validation.ts"),
    runSmoke("scripts/bp005-ip02-commercial-composition-smoke-validation.ts"),
    runSmoke("scripts/bp005-ip01-base-price-resolution-smoke-validation.ts"),
    runSmoke("scripts/bp003-ip011-offering-pricing-smoke-validation.ts"),
  ];

  // remove broken tc05Expired if accidentally left - we only call tc05ExpiredSafe

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    if (!r.ok) failed += 1;
    console.log(`${mark}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  console.log(
    `\n${failed === 0 ? `All ${results.length} IP-04 smoke checks passed.` : `${failed}/${results.length} checks failed.`}\n`
  );
  process.exitCode = failed === 0 ? 0 : 1;
  await closeDb();
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
  await closeDb();
});
