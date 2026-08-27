/**
 * Purpose:
 * Smoke-validate BP-005 / IP-07 Expected Commercial Amount.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { closeDb } from "@/db/client";
import {
  ADJUSTMENT_BASIS_CODES,
  ADJUSTMENT_DIRECTION_CODES,
  ADJUSTMENT_METHOD_CODES,
  ADJUSTMENT_RULE_STATUS_CODES,
  ADJUSTMENT_STACKING_CODES,
  CommercialError,
  CommercialResolutionService,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  assertCommercialSnapshotValid,
  computeCommercialIntegrityHash,
  createExpectedCommercialAmountService,
  type CommercialSnapshot,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import type { CurrentBusinessContext } from "@/core/auth/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const ctx = (businessId: string): CurrentBusinessContext =>
  ({
    businessId,
    userId: "user-1",
    membershipId: "mem-1",
  }) as unknown as CurrentBusinessContext;

function fixtureResolvedBase(
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
    salesChannel: "WEB",
    region: null,
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
        salesChannel: "WEB",
        region: null,
        pricingCatalogueId: null,
        partyId: "party-1",
        quantity: 1,
      },
      candidateCount: 1,
      precedenceOwner: "IP-05",
      selectionMode: "SINGLE_CANDIDATE",
      unsupportedDimensionsNoted: [],
    },
    resolvedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function serviceWithBase(base: ResolvedBasePrice) {
  return new CommercialResolutionService({
    resolveBasePrice: async () => base,
  } as never);
}

function taxRules(
  businessId: string,
  rate = 18,
  treatment: (typeof TAX_TREATMENT_CODES)[keyof typeof TAX_TREATMENT_CODES] =
    TAX_TREATMENT_CODES.EXCLUSIVE
) {
  return [
    {
      taxRuleId: "tax-vat",
      businessId,
      taxTypeCode: "VAT",
      taxTypeLabel: "VAT",
      ratePercent: rate,
      treatment,
      status: TAX_RULE_STATUS_CODES.ACTIVE,
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      currencyCode: "KES",
    },
  ];
}

function commissionRules(businessId: string, amount = "100") {
  return [
    {
      adjustmentRuleId: "comm-1",
      businessId,
      adjustmentCode: "COMM",
      adjustmentLabel: "Commission",
      method: ADJUSTMENT_METHOD_CODES.FIXED_AMOUNT,
      direction: ADJUSTMENT_DIRECTION_CODES.SURCHARGE,
      basis: ADJUSTMENT_BASIS_CODES.PRINCIPAL,
      status: ADJUSTMENT_RULE_STATUS_CODES.ACTIVE,
      percentage: null,
      fixedAmount: amount,
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
    },
  ];
}

function discountRules(businessId: string, amount = "50") {
  return [
    {
      adjustmentRuleId: "disc-1",
      businessId,
      adjustmentCode: "DISC",
      adjustmentLabel: "Promo",
      method: ADJUSTMENT_METHOD_CODES.FIXED_AMOUNT,
      direction: ADJUSTMENT_DIRECTION_CODES.DISCOUNT,
      basis: ADJUSTMENT_BASIS_CODES.PRINCIPAL,
      status: ADJUSTMENT_RULE_STATUS_CODES.ACTIVE,
      percentage: null,
      fixedAmount: amount,
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
    },
  ];
}

function feeRules(businessId: string, amount = "25") {
  return [
    {
      adjustmentRuleId: "fee-1",
      businessId,
      adjustmentCode: "FEE",
      adjustmentLabel: "Service fee",
      method: ADJUSTMENT_METHOD_CODES.FIXED_AMOUNT,
      direction: ADJUSTMENT_DIRECTION_CODES.SURCHARGE,
      basis: ADJUSTMENT_BASIS_CODES.PRINCIPAL,
      status: ADJUSTMENT_RULE_STATUS_CODES.ACTIVE,
      percentage: null,
      fixedAmount: amount,
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
    },
  ];
}

async function snapshotFor(
  service: CommercialResolutionService,
  businessId: string,
  request: Parameters<CommercialResolutionService["resolve"]>[1]
): Promise<CommercialSnapshot> {
  const resolution = await service.resolve(ctx(businessId), request);
  return service.snapshot(resolution);
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0000001;
}

function checkFiles(): SmokeResult[] {
  const required = [
    "src/modules/commercial/services/expected-commercial-amount-service.ts",
    "src/modules/commercial/services/expected-commercial-amount-rules.ts",
    "scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts",
  ];
  return required.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkNoPersistenceTable(): SmokeResult {
  const schemaDir = path.join(ROOT, "src/db/schema");
  const files = readdirSync(schemaDir).filter((f) => f.endsWith(".ts"));
  const hasExpectedTable = files.some(
    (f) =>
      f.toLowerCase().includes("expected") &&
      f.toLowerCase().includes("commercial")
  );
  const commercialDir = path.join(ROOT, "src/modules/commercial");
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
        out.push(full);
    }
    return out;
  };
  const hasPgTable = walk(commercialDir).some((file) =>
    readFileSync(file, "utf8").includes("pgTable")
  );
  return {
    name: "architecture:no-expected-amount-persistence",
    ok: !hasExpectedTable && !hasPgTable,
    detail:
      hasExpectedTable || hasPgTable
        ? "IP-07 must not introduce expected-amount / commercial persistence tables."
        : undefined,
  };
}

async function tc01PrincipalOnly(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
  });
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    nearlyEqual(expected.principalAmountNumber, 1000) &&
    nearlyEqual(expected.expectedAmountNumber, 1000) &&
    nearlyEqual(expected.totalTaxAmountNumber, 0) &&
    expected.actualAmountCollected === null;
  return {
    name: "TC-01:principal-only",
    ok,
    detail: ok
      ? undefined
      : `expected=${expected.expectedAmount} principal=${expected.principalAmount}`,
  };
}

async function tc02PrincipalPlusTax(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    taxRules: taxRules("biz-a", 18),
  });
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    nearlyEqual(expected.principalAmountNumber, 1000) &&
    nearlyEqual(expected.totalTaxAmountNumber, 180) &&
    nearlyEqual(expected.expectedAmountNumber, 1180);
  return {
    name: "TC-02:principal-plus-tax",
    ok,
    detail: ok
      ? undefined
      : `expected=${expected.expectedAmount} tax=${expected.totalTaxAmount}`,
  };
}

async function tc03PrincipalCommissionTax(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    taxRules: taxRules("biz-a", 18),
    adjustmentRules: commissionRules("biz-a", "100"),
  });
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    nearlyEqual(expected.principalAmountNumber, 1000) &&
    nearlyEqual(expected.totalCommissionAmountNumber, 100) &&
    nearlyEqual(expected.totalTaxAmountNumber, 180) &&
    nearlyEqual(expected.expectedAmountNumber, 1280);
  return {
    name: "TC-03:principal-commission-tax",
    ok,
    detail: ok
      ? undefined
      : `expected=${expected.expectedAmount} commission=${expected.totalCommissionAmount} tax=${expected.totalTaxAmount}`,
  };
}

async function tc04Discount(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    taxRules: taxRules("biz-a", 18),
    adjustmentRules: discountRules("biz-a", "50"),
  });
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    nearlyEqual(expected.principalAmountNumber, 1000) &&
    nearlyEqual(expected.totalTaxAmountNumber, 180) &&
    nearlyEqual(expected.totalDiscountAmountNumber, 50) &&
    nearlyEqual(expected.expectedAmountNumber, 1130);
  return {
    name: "TC-04:discount",
    ok,
    detail: ok
      ? undefined
      : `expected=${expected.expectedAmount} discount=${expected.totalDiscountAmount}`,
  };
}

async function tc05MultipleComponents(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    taxRules: taxRules("biz-a", 18),
    adjustmentRules: [
      ...commissionRules("biz-a", "100"),
      ...feeRules("biz-a", "25"),
      ...discountRules("biz-a", "50"),
    ],
  });
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  // 1000 + 100 + 25 + 180 - 50 = 1255
  const ok =
    nearlyEqual(expected.expectedAmountNumber, 1255) &&
    nearlyEqual(expected.payableAmountNumber, 1255) &&
    nearlyEqual(expected.totalComponentAmountNumber, 125) &&
    nearlyEqual(expected.totalDiscountAmountNumber, 50) &&
    nearlyEqual(expected.totalTaxAmountNumber, 180) &&
    nearlyEqual(expected.totalCommissionAmountNumber, 100);
  return {
    name: "TC-05:multiple-components",
    ok,
    detail: ok
      ? undefined
      : `expected=${expected.expectedAmount} components=${expected.totalComponentAmount}`,
  };
}

async function tc06InclusiveTax(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1160 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    taxRules: taxRules("biz-a", 16, TAX_TREATMENT_CODES.INCLUSIVE),
  });
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    nearlyEqual(expected.expectedAmountNumber, snap.resolution.payableNumber) &&
    nearlyEqual(
      Number(expected.expectedAmount),
      Number(snap.resolution.payable)
    ) &&
    expected.provenance.commercialPipeline.includes("IP-06") &&
    snap.resolution.tax != null &&
    nearlyEqual(
      expected.totalTaxAmountNumber,
      snap.resolution.tax.totalTaxAmountNumber
    );
  return {
    name: "TC-06:inclusive-tax-consumed",
    ok,
    detail: ok
      ? undefined
      : `expected=${expected.expectedAmount} payable=${snap.resolution.payable} tax=${expected.totalTaxAmount}`,
  };
}

async function tc07InvalidSnapshot(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase());
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    taxRules: taxRules("biz-a", 18),
  });
  const mutated: CommercialSnapshot = {
    ...snap,
    resolution: {
      ...snap.resolution,
      payable: "999999.00",
      payableNumber: 999999,
    },
  };
  try {
    createExpectedCommercialAmountService().calculateExpectedAmount(
      ctx("biz-a"),
      mutated
    );
    return {
      name: "TC-07:invalid-snapshot",
      ok: false,
      detail: "Expected throw for invalid snapshot",
    };
  } catch (error) {
    const ok =
      error instanceof CommercialError &&
      (error.code === "INVALID_COMMERCIAL_SNAPSHOT" ||
        error.code === "SNAPSHOT_INTEGRITY_FAILURE" ||
        error.code === "COMMERCIAL_AMOUNT_RECONCILIATION_ERROR");
    return {
      name: "TC-07:invalid-snapshot",
      ok,
      detail: ok ? undefined : String(error),
    };
  }
}

async function tc08BusinessIsolation(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase());
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
  });
  try {
    service.calculateExpectedAmount(ctx("biz-b"), snap);
    return {
      name: "TC-08:business-isolation",
      ok: false,
      detail: "Expected throw for cross-business context",
    };
  } catch (error) {
    const ok =
      error instanceof CommercialError && error.code === "INVALID_CONTEXT";
    return {
      name: "TC-08:business-isolation",
      ok,
      detail: ok ? undefined : String(error),
    };
  }
}

async function tc09Determinism(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    taxRules: taxRules("biz-a", 18),
    adjustmentRules: [
      ...commissionRules("biz-a", "100"),
      ...discountRules("biz-a", "50"),
    ],
  });
  const first = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const second = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    first.expectedAmount === second.expectedAmount &&
    first.currency === second.currency &&
    first.principalAmount === second.principalAmount &&
    first.totalTaxAmount === second.totalTaxAmount &&
    first.totalDiscountAmount === second.totalDiscountAmount &&
    first.totalCommissionAmount === second.totalCommissionAmount &&
    first.snapshotId === second.snapshotId &&
    first.provenance.integrityHash === second.provenance.integrityHash &&
    JSON.stringify(first.components.map((c) => [c.componentId, c.amount])) ===
      JSON.stringify(second.components.map((c) => [c.componentId, c.amount]));
  return {
    name: "TC-09:determinism",
    ok,
    detail: ok ? undefined : "Repeated calculation diverged.",
  };
}

async function tc10Provenance(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase());
  const snap = await snapshotFor(service, "biz-a", {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    taxRules: taxRules("biz-a", 18),
  });
  assertCommercialSnapshotValid(snap);
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const ok =
    expected.snapshotId === snap.snapshotId &&
    expected.businessId === snap.businessId &&
    expected.currency === snap.resolution.currencyCode &&
    expected.resolutionId === snap.resolution.resolutionId &&
    expected.provenance.integrityHash === snap.integrityHash &&
    expected.provenance.pipeline.endsWith("IP-07") &&
    expected.provenance.basePrice.pricingItemId === "price-1" &&
    expected.actualAmountCollected === null &&
    expected.variance === null &&
    expected.paymentAllocation === null;
  return {
    name: "TC-10:provenance",
    ok,
    detail: ok ? undefined : "Provenance / boundary fields incomplete.",
  };
}

function tcUxArtifacts(): SmokeResult {
  const workspace = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/components/commercial-resolution-workspace.tsx"
    ),
    "utf8"
  );
  const actions = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/actions/commercial-resolution-actions.ts"
    ),
    "utf8"
  );
  const ok =
    workspace.includes("finalizeCommercialExpectedAction") &&
    workspace.includes("Expected commercial amount") &&
    workspace.includes("Not available yet") &&
    workspace.includes("Actual payment") &&
    workspace.includes("Variance") &&
    actions.includes("calculateExpectedCommercialAmountAction") &&
    actions.includes("finalizeCommercialExpectedAction");
  return {
    name: "UX:review-expected-amount",
    ok,
    detail: ok ? undefined : "IP-07 UX wiring missing.",
  };
}

function tcNoPaymentSplit(): SmokeResult {
  const serviceSrc = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/expected-commercial-amount-service.ts"
    ),
    "utf8"
  );
  const ok =
    serviceSrc.includes("paymentAllocation: null") &&
    !serviceSrc.includes("mpesaAllocation") &&
    !serviceSrc.includes("cashAllocation");
  return {
    name: "architecture:no-payment-split",
    ok,
    detail: ok ? undefined : "Payment split logic must not exist in IP-07.",
  };
}

async function runExternal(
  scriptRelative: string,
  name: string
): Promise<SmokeResult> {
  const scriptPath = path.join(ROOT, scriptRelative);
  if (!existsSync(scriptPath)) {
    return { name, ok: false, detail: `Missing ${scriptRelative}` };
  }
  const run = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return {
    name,
    ok: run.status === 0,
    detail:
      run.status === 0
        ? undefined
        : (run.stdout || run.stderr || `exit=${run.status}`).slice(0, 400),
  };
}

async function main() {
  void computeCommercialIntegrityHash;
  void createExpectedCommercialAmountService;

  const results: SmokeResult[] = [
    ...checkFiles(),
    checkNoPersistenceTable(),
    tcNoPaymentSplit(),
    tcUxArtifacts(),
    await tc01PrincipalOnly(),
    await tc02PrincipalPlusTax(),
    await tc03PrincipalCommissionTax(),
    await tc04Discount(),
    await tc05MultipleComponents(),
    await tc06InclusiveTax(),
    await tc07InvalidSnapshot(),
    await tc08BusinessIsolation(),
    await tc09Determinism(),
    await tc10Provenance(),
  ];

  results.push(
    await runExternal(
      "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
      "TC-11a:bp003-ip011-regression"
    ),
    await runExternal(
      "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
      "TC-11b:ip01-regression"
    ),
    await runExternal(
      "scripts/bp005-ip02-commercial-composition-smoke-validation.ts",
      "TC-11c:ip02-regression"
    ),
    await runExternal(
      "scripts/bp005-ip03-tax-resolution-smoke-validation.ts",
      "TC-11d:ip03-regression"
    ),
    await runExternal(
      "scripts/bp005-ip04-discount-adjustment-smoke-validation.ts",
      "TC-11e:ip04-regression"
    ),
    await runExternal(
      "scripts/bp005-ip05-pricing-precedence-smoke-validation.ts",
      "TC-11f:ip05-regression"
    ),
    await runExternal(
      "scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts",
      "TC-11g:ip06-regression"
    )
  );

  const failed = results.filter((r) => !r.ok);
  for (const result of results) {
    console.log(
      `[${result.ok ? "PASS" : "FAIL"}] ${result.name}${
        result.detail ? ` — ${result.detail}` : ""
      }`
    );
  }
  console.log(
    `\nIP-07 smoke: ${results.length - failed.length}/${results.length} PASS`
  );
  await closeDb().catch(() => undefined);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
