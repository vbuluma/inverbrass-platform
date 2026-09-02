/**
 * Purpose:
 * Smoke-validate BP-005 / IP-06 Commercial Resolution Snapshot & Transaction Contract.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts
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
  createCommercialCompositionService,
  createCommercialResolutionService,
  type CommercialResolutionRequest,
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
  const base: ResolvedBasePrice = {
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
  return base;
}

function serviceWithBase(base: ResolvedBasePrice) {
  return new CommercialResolutionService({
    resolveBasePrice: async () => base,
  } as never);
}

function taxRules(businessId: string, rate = 16) {
  return [
    {
      taxRuleId: "tax-vat",
      businessId,
      taxTypeCode: "VAT",
      taxTypeLabel: "VAT",
      ratePercent: rate,
      treatment: TAX_TREATMENT_CODES.EXCLUSIVE,
      status: TAX_RULE_STATUS_CODES.ACTIVE,
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      currencyCode: "KES",
    },
  ];
}

function commissionRules(businessId: string) {
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
      fixedAmount: "50",
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
    },
  ];
}

function discountRules(businessId: string) {
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
      fixedAmount: "25",
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      effectiveTo: null,
      stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
    },
  ];
}

function checkFiles(): SmokeResult[] {
  const required = [
    "src/modules/commercial/services/commercial-resolution-service.ts",
    "src/modules/commercial/services/commercial-snapshot-rules.ts",
    "scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts",
  ];
  return required.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkNoPersistenceTable(): SmokeResult {
  const schemaDir = path.join(ROOT, "src/db/schema");
  const files = readdirSync(schemaDir).filter((f) => f.endsWith(".ts"));
  const hasCommercialSnapshot = files.some((f) =>
    f.toLowerCase().includes("commercial") && f.toLowerCase().includes("snapshot")
  );
  const commercialDir = path.join(ROOT, "src/modules/commercial");
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith(".ts")) out.push(full);
    }
    return out;
  };
  const hasPgTable = walk(commercialDir).some((file) =>
    readFileSync(file, "utf8").includes("pgTable")
  );
  return {
    name: "architecture:value-object-no-commercial-snapshot-table",
    ok: !hasCommercialSnapshot && !hasPgTable,
    detail:
      hasCommercialSnapshot || hasPgTable
        ? "IP-06 must not introduce commercial snapshot / pricing tables."
        : undefined,
  };
}

async function tc01FullResolution(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase());
  const resolution = await service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    partyId: "party-1",
    salesChannel: "WEB",
    taxRules: taxRules("biz-a"),
    adjustmentRules: [
      ...commissionRules("biz-a"),
      ...discountRules("biz-a"),
    ],
  });
  const ok =
    resolution.status === "RESOLVED" &&
    resolution.payableNumber > 0 &&
    resolution.components.length >= 3 &&
    resolution.paymentCollected === null &&
    resolution.provenance.pipeline.includes("IP-06");
  return {
    name: "TC-01:full-commercial-resolution",
    ok,
    detail: ok ? undefined : `payable=${resolution.payable}`,
  };
}

async function tc02ComponentIntegrity(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase({ unitPrice: 1000 }));
  const resolution = await service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 1,
    taxRules: taxRules("biz-a", 16),
    adjustmentRules: [
      ...commissionRules("biz-a"),
      ...discountRules("biz-a"),
    ],
  });
  // Principal 1000 + tax 160 + commission 50 - discount 25 = 1185
  const expected = 1185;
  const ok =
    Math.abs(resolution.payableNumber - expected) < 0.0000001 &&
    resolution.composition.reconciled === true;
  return {
    name: "TC-02:component-integrity",
    ok,
    detail: ok
      ? undefined
      : `payable=${resolution.payableNumber} expected=${expected} components=${resolution.components
          .map((c) => `${c.componentType}:${c.amount}`)
          .join(",")}`,
  };
}

async function tc03Provenance(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase());
  const resolution = await service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    taxRules: taxRules("biz-a"),
  });
  const ok =
    resolution.basePrice.pricingItemId === "price-1" &&
    resolution.provenance.basePrice.precedenceOwner === "IP-05" &&
    resolution.provenance.taxRuleIds.includes("tax-vat");
  return {
    name: "TC-03:provenance",
    ok,
    detail: ok ? undefined : "Missing provenance fields.",
  };
}

async function tc04SnapshotStability(): Promise<SmokeResult> {
  let unitPrice = 1000;
  const service = new CommercialResolutionService({
    resolveBasePrice: async () => fixtureResolvedBase({ unitPrice }),
  } as never);

  const request: CommercialResolutionRequest = {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    taxRules: taxRules("biz-a"),
    adjustmentRules: commissionRules("biz-a"),
  };
  const first = await service.resolve(ctx("biz-a"), request);
  const snap = service.snapshot(first);
  const frozenPayable = snap.resolution.payable;

  unitPrice = 1200;
  const second = await service.resolve(ctx("biz-a"), request);

  assertCommercialSnapshotValid(snap);
  const ok =
    snap.resolution.payable === frozenPayable &&
    second.payable !== frozenPayable &&
    snap.immutable === true;
  return {
    name: "TC-04:snapshot-stability",
    ok,
    detail: ok
      ? undefined
      : `frozen=${frozenPayable} re-resolved=${second.payable}`,
  };
}

async function tc05ReResolution(): Promise<SmokeResult> {
  let unitPrice = 1000;
  const service = new CommercialResolutionService({
    resolveBasePrice: async () => fixtureResolvedBase({ unitPrice }),
  } as never);
  const request: CommercialResolutionRequest = {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    taxRules: taxRules("biz-a"),
  };
  const snap = service.snapshot(await service.resolve(ctx("biz-a"), request));
  unitPrice = 2000;
  const fresh = await service.reResolve(ctx("biz-a"), request);
  const ok =
    snap.resolution.basePrice.unitPrice === 1000 &&
    fresh.basePrice.unitPrice === 2000 &&
    snap.resolution.payable !== fresh.payable;
  return {
    name: "TC-05:explicit-re-resolution",
    ok,
    detail: ok ? undefined : "Re-resolve did not diverge from snapshot.",
  };
}

async function tc06Conflict(): Promise<SmokeResult> {
  const service = new CommercialResolutionService({
    resolveBasePrice: async () => {
      throw new CommercialError("BASE_PRICE_CONFLICT", undefined, 409);
    },
  } as never);
  try {
    await service.resolve(ctx("biz-a"), {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    });
    return { name: "TC-06:conflict-fail-closed", ok: false, detail: "Expected throw" };
  } catch (error) {
    const ok =
      error instanceof CommercialError && error.code === "BASE_PRICE_CONFLICT";
    return {
      name: "TC-06:conflict-fail-closed",
      ok,
      detail: ok ? undefined : String(error),
    };
  }
}

async function tc07MissingPrice(): Promise<SmokeResult> {
  const service = new CommercialResolutionService({
    resolveBasePrice: async () => {
      throw new CommercialError("MISSING_BASE_PRICE", undefined, 404);
    },
  } as never);
  try {
    await service.resolve(ctx("biz-a"), {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    });
    return { name: "TC-07:missing-price", ok: false, detail: "Expected throw" };
  } catch (error) {
    const ok =
      error instanceof CommercialError &&
      error.code === "BASE_PRICE_UNAVAILABLE";
    return {
      name: "TC-07:missing-price",
      ok,
      detail: ok ? undefined : String(error),
    };
  }
}

async function tc08TenantIsolation(): Promise<SmokeResult> {
  const service = serviceWithBase(fixtureResolvedBase());
  try {
    await service.resolve(ctx("biz-a"), {
      businessId: "biz-b",
      offeringId: "offering-1",
      currencyCode: "KES",
    });
    return { name: "TC-08:tenant-isolation", ok: false, detail: "Expected throw" };
  } catch (error) {
    const ok =
      error instanceof CommercialError && error.code === "INVALID_CONTEXT";
    return {
      name: "TC-08:tenant-isolation",
      ok,
      detail: ok ? undefined : String(error),
    };
  }
}

function tc09CrmPath(): SmokeResult {
  const src = readFileSync(
    path.join(ROOT, "src/modules/crm/adapters/pricing-resolution-adapter.ts"),
    "utf8"
  );
  const ok =
    src.includes("createCommercialResolutionService") &&
    src.includes("resolveCommercialSnapshot") &&
    src.includes("createBasePriceResolutionService") &&
    !src.includes("searchPriceItems");
  return {
    name: "TC-09:crm-via-ip01-ip05-ip06",
    ok,
    detail: ok ? undefined : "CRM adapter missing IP-06 path.",
  };
}

async function tc15MoneyPrecision(): Promise<SmokeResult> {
  const service = serviceWithBase(
    fixtureResolvedBase({ unitPrice: 99.99 })
  );
  const resolution = await service.resolve(ctx("biz-a"), {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 3,
    taxRules: [
      {
        ...taxRules("biz-a", 16)[0]!,
        ratePercent: 16,
      },
    ],
  });
  const snap = service.snapshot(resolution);
  assertCommercialSnapshotValid(snap);
  const recomputed = computeCommercialIntegrityHash(snap.resolution);
  const ok =
    snap.integrityHash === recomputed &&
    resolution.composition.reconciled === true;
  return {
    name: "TC-15:money-precision",
    ok,
    detail: ok ? undefined : `payable=${resolution.payable}`,
  };
}

function tc16UxArtifacts(): SmokeResult {
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
    (workspace.includes("finalizeCommercialSnapshotAction") ||
      workspace.includes("finalizeCommercialExpectedAction")) &&
    (workspace.includes("Payment collected") ||
      workspace.includes("Actual payment")) &&
    actions.includes("finalizeCommercialSnapshotAction") &&
    workspace.includes("IP-06") &&
    workspace.includes("snapshot");
  return {
    name: "TC-16:ux-review-snapshot",
    ok,
    detail: ok ? undefined : "Review/IP-06 UX wiring missing.",
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
  // Sanity: composition service import remains usable
  void createCommercialCompositionService;
  void createCommercialResolutionService;

  const results: SmokeResult[] = [
    ...checkFiles(),
    checkNoPersistenceTable(),
    await tc01FullResolution(),
    await tc02ComponentIntegrity(),
    await tc03Provenance(),
    await tc04SnapshotStability(),
    await tc05ReResolution(),
    await tc06Conflict(),
    await tc07MissingPrice(),
    await tc08TenantIsolation(),
    tc09CrmPath(),
    await tc15MoneyPrecision(),
    tc16UxArtifacts(),
  ];

  results.push(
    await runExternal(
      "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
      "TC-10:bp003-regression"
    ),
    await runExternal(
      "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
      "TC-11:ip01-regression"
    ),
    await runExternal(
      "scripts/bp005-ip02-commercial-composition-smoke-validation.ts",
      "TC-12:ip02-regression"
    ),
    await runExternal(
      "scripts/bp005-ip03-tax-resolution-smoke-validation.ts",
      "TC-13:ip03-regression"
    ),
    await runExternal(
      "scripts/bp005-ip05-pricing-precedence-smoke-validation.ts",
      "TC-14:ip05-regression"
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
    `\nIP-06 smoke: ${results.length - failed.length}/${results.length} PASS`
  );
  await closeDb().catch(() => undefined);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
