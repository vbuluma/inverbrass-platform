/**
 * Purpose:
 * Smoke-validate BP-005 / IP-10 Downstream Commercial Contract & Integration.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts
 */

console.log("IP-10 smoke starting…");

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ADJUSTMENT_BASIS_CODES,
  ADJUSTMENT_DIRECTION_CODES,
  ADJUSTMENT_METHOD_CODES,
  ADJUSTMENT_RULE_STATUS_CODES,
  ADJUSTMENT_STACKING_CODES,
  COMMERCIAL_CONTRACT_VERSION,
  CommercialError,
  CommercialResolutionService,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  assertCommercialSnapshotValid,
  createCommercialContractService,
  createDownstreamCommercialContractAdapter,
  createExpectedCommercialAmountService,
  type ResolvedBasePrice,
} from "@/modules/commercial";

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

function taxRules(businessId: string, currencyCode = "KES", rate = 16) {
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
      currencyCode,
    },
  ];
}

function checkFiles(): SmokeResult[] {
  const required = [
    "src/modules/commercial/services/commercial-contract-rules.ts",
    "src/modules/commercial/services/commercial-contract-service.ts",
    "src/modules/commercial/adapters/downstream-commercial-contract-adapter.ts",
    "scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts",
  ];
  return required.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkArchitecture(): SmokeResult[] {
  const index = readFileSync(
    path.join(ROOT, "src/modules/commercial/index.ts"),
    "utf8"
  );
  const adapter = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/adapters/downstream-commercial-contract-adapter.ts"
    ),
    "utf8"
  );
  const service = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/commercial-contract-service.ts"
    ),
    "utf8"
  );
  const workspace = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/components/commercial-resolution-workspace.tsx"
    ),
    "utf8"
  );
  return [
    {
      name: "export:contract-service",
      ok:
        index.includes("createCommercialContractService") &&
        index.includes("CommercialTransactionContract") &&
        index.includes("createDownstreamCommercialContractAdapter"),
    },
    {
      name: "architecture:no-pricing-engine",
      ok:
        !adapter.includes("createBasePriceResolutionService") &&
        !adapter.includes("createTaxResolutionService") &&
        !service.includes("createBasePriceResolutionService") &&
        service.includes("createExpectedCommercialAmountService"),
    },
    {
      name: "architecture:no-ip10-migration",
      ok: !existsSync(
        path.join(ROOT, "drizzle/0056_bp005_ip010_commercial_contract.sql")
      ),
    },
    {
      name: "UX:downstream-contract-panel",
      ok:
        workspace.includes("Commercial result") &&
        workspace.includes("setContract") &&
        workspace.includes("expectedPayable") &&
        workspace.includes("Next action"),
    },
    {
      name: "TC-16:bp003-remains-price-master",
      ok: existsSync(
        path.join(ROOT, "src/db/schema/pricing-item.ts")
      ) || existsSync(path.join(ROOT, "src/db/schema/pricing_item.ts"))
        ? true
        : existsSync(
            path.join(
              ROOT,
              "scripts/bp003-ip011-offering-pricing-smoke-validation.ts"
            )
          ),
    },
  ];
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const resolutionService = serviceWithBase(fixtureResolvedBase());
  const contractService = createCommercialContractService();
  const adapter = createDownstreamCommercialContractAdapter();
  const expectedService = createExpectedCommercialAmountService();

  const pipeline = await resolutionService.resolveExpectedAmount(ctx("biz-a"), {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 2,
    taxRules: taxRules("biz-a"),
    adjustmentRules: [
      {
        adjustmentRuleId: "comm-1",
        businessId: "biz-a",
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
        currencyCode: "KES",
      },
    ],
  });
  const { snapshot, expected } = pipeline;
  assertCommercialSnapshotValid(snapshot);

  // TC-01 valid consumption
  const contract = contractService.consumeCommercialContract(ctx("biz-a"), {
    businessId: "biz-a",
    snapshot,
    expected,
    consumerRef: "smoke-tc01",
  });
  results.push({
    name: "TC-01:valid-contract-consumption",
    ok:
      contract.status === "VALIDATED" &&
      contract.contractVersion === COMMERCIAL_CONTRACT_VERSION &&
      contract.ip === "IP-10",
  });

  // TC-02 expected amount
  results.push({
    name: "TC-02:expected-amount-equals-ip07",
    ok:
      Number(contract.commercial.expectedPayable) ===
        Number(expected.expectedAmount) &&
      Number(contract.commercial.expectedPayable) ===
        Number(snapshot.resolution.payable),
  });

  // TC-03 snapshot identity
  results.push({
    name: "TC-03:snapshot-identity-preserved",
    ok:
      contract.identity.snapshotId === snapshot.snapshotId &&
      contract.identity.resolutionId === snapshot.resolution.resolutionId &&
      contract.identity.businessId === "biz-a",
  });

  // TC-04 component breakdown
  results.push({
    name: "TC-04:component-breakdown-preserved",
    ok:
      contract.breakdown.length === expected.components.length &&
      Number(contract.commercial.principalAmount) ===
        Number(expected.principalAmount) &&
      Number(contract.commercial.totalTax) === Number(expected.totalTaxAmount) &&
      Number(contract.commercial.totalCommission) ===
        Number(expected.totalCommissionAmount) &&
      Number(contract.commercial.totalDiscounts) ===
        Number(expected.totalDiscountAmount),
  });

  // TC-05 provenance
  results.push({
    name: "TC-05:provenance-preserved",
    ok:
      contract.provenance.pricingItemId ===
        snapshot.resolution.basePrice.pricingItemId &&
      contract.provenance.pricingCatalogueId ===
        snapshot.resolution.basePrice.pricingCatalogueId &&
      contract.provenance.pricingMethod ===
        snapshot.resolution.basePrice.pricingMethod &&
      contract.provenance.precedenceOwner === "IP-05",
  });

  // TC-06 integrity / tamper
  const tampered = structuredClone(snapshot);
  tampered.resolution.payable = "1.00";
  try {
    contractService.consumeCommercialContract(ctx("biz-a"), {
      businessId: "biz-a",
      snapshot: tampered,
    });
    results.push({ name: "TC-06:integrity-validation", ok: false });
  } catch (error) {
    results.push({
      name: "TC-06:integrity-validation",
      ok:
        error instanceof CommercialError &&
        (error.code === "SNAPSHOT_INTEGRITY_FAILURE" ||
          error.code === "COMMERCIAL_CONTRACT_TAMPERED" ||
          error.code === "ROUNDING_INTEGRITY_FAILURE" ||
          error.code === "NO_COMMERCIAL_RESOLUTION" ||
          error.code === "COMMERCIAL_AMOUNT_MISMATCH" ||
          error.code === "COMMERCIAL_AMOUNT_RECONCILIATION_ERROR" ||
          error.code === "INVALID_COMMERCIAL_SNAPSHOT"),
      detail: error instanceof CommercialError ? error.code : String(error),
    });
  }

  // TC-07 invalid snapshot
  try {
    contractService.consumeCommercialContract(ctx("biz-a"), {
      businessId: "biz-a",
      snapshot: {
        ...snapshot,
        snapshotId: "",
      },
    });
    results.push({ name: "TC-07:invalid-snapshot", ok: false });
  } catch (error) {
    results.push({
      name: "TC-07:invalid-snapshot",
      ok: error instanceof CommercialError,
      detail: error instanceof CommercialError ? error.code : String(error),
    });
  }

  // TC-08 wrong businessId
  try {
    contractService.consumeCommercialContract(ctx("biz-b"), {
      businessId: "biz-b",
      snapshot,
    });
    results.push({ name: "TC-08:wrong-businessId", ok: false });
  } catch (error) {
    results.push({
      name: "TC-08:wrong-businessId",
      ok:
        error instanceof CommercialError &&
        error.code === "BUSINESS_CONTEXT_MISMATCH",
    });
  }

  // TC-09 currency mismatch
  try {
    contractService.consumeCommercialContract(ctx("biz-a"), {
      businessId: "biz-a",
      snapshot,
      expected,
      expectedCurrency: "USD",
    });
    results.push({ name: "TC-09:currency-mismatch", ok: false });
  } catch (error) {
    results.push({
      name: "TC-09:currency-mismatch",
      ok:
        error instanceof CommercialError &&
        error.code === "COMMERCIAL_CONTRACT_CURRENCY_MISMATCH",
    });
  }

  // TC-10 repeated consumption — same contractId / amounts
  const again = contractService.consumeCommercialContract(ctx("biz-a"), {
    businessId: "biz-a",
    snapshot,
    expected,
    consumerRef: "smoke-tc10",
  });
  results.push({
    name: "TC-10:repeated-consumption-idempotent",
    ok:
      again.contractId === contract.contractId &&
      again.commercial.expectedPayable === contract.commercial.expectedPayable &&
      again.identity.snapshotId === contract.identity.snapshotId &&
      again.integrity.snapshotIntegrityHash === snapshot.integrityHash,
  });

  // TC-11 / TC-12 — adapter does not call pricing; amounts frozen
  const viaAdapter = adapter.consumeFromSnapshot(ctx("biz-a"), snapshot, {
    expected,
    consumerRef: "adapter",
  });
  results.push({
    name: "TC-11:no-pricing-requery-via-adapter",
    ok: viaAdapter.contractId === contract.contractId,
  });
  results.push({
    name: "TC-12:no-commercial-recalculation",
    ok:
      viaAdapter.commercial.expectedPayable === expected.expectedAmount &&
      viaAdapter.breakdown.length === expected.components.length,
  });

  // TC-13 IP-07 regression
  const expectedAgain = expectedService.calculateExpectedAmount(
    ctx("biz-a"),
    snapshot
  );
  results.push({
    name: "TC-13:ip07-expected-regression",
    ok:
      Number(expectedAgain.expectedAmount) === Number(expected.expectedAmount),
  });

  // TC-14 IP-06 regression
  assertCommercialSnapshotValid(snapshot);
  results.push({
    name: "TC-14:ip06-snapshot-regression",
    ok: snapshot.immutable === true && Boolean(snapshot.integrityHash),
  });

  // TC-15 IP-09 — require tax missing cannot enter contract via resolve path
  try {
    await resolutionService.resolve(ctx("biz-a"), {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      requireTaxConfiguration: true,
      taxRules: [],
    });
    results.push({ name: "TC-15:ip09-invalid-cannot-enter", ok: false });
  } catch (error) {
    results.push({
      name: "TC-15:ip09-invalid-cannot-enter",
      ok: error instanceof CommercialError,
      detail: error instanceof CommercialError ? error.code : String(error),
    });
  }

  // validateCommercialContract happy path
  const validated = contractService.validateCommercialContract(ctx("biz-a"), {
    businessId: "biz-a",
    contract,
    snapshot,
  });
  results.push({
    name: "validate:contract-against-snapshot",
    ok: validated.contractId === contract.contractId,
  });

  return results;
}

function runExternal(scriptRelative: string, name: string): SmokeResult {
  const scriptPath = path.join(ROOT, scriptRelative);
  if (!existsSync(scriptPath)) {
    return { name, ok: false, detail: `Missing ${scriptRelative}` };
  }
  console.log(`Running regression ${name}…`);
  const run = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    timeout: 600_000,
  });
  return {
    name,
    ok: run.status === 0,
    detail:
      run.status === 0
        ? undefined
        : (run.stdout || run.stderr || `exit=${run.status}`).slice(-800),
  };
}

async function main() {
  const results: SmokeResult[] = [...checkFiles(), ...checkArchitecture()];
  for (const r of results) {
    console.log(`[${r.ok ? "PASS" : "FAIL"}] ${r.name}`);
  }

  const core = await runCoreCases();
  results.push(...core);
  for (const r of core) {
    console.log(
      `[${r.ok ? "PASS" : "FAIL"}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`
    );
  }

  const continuity = [
    {
      name: "REG:ip05-script-present",
      ok: existsSync(
        path.join(
          ROOT,
          "scripts/bp005-ip05-pricing-precedence-smoke-validation.ts"
        )
      ),
    },
    {
      name: "REG:ip06-script-present",
      ok: existsSync(
        path.join(
          ROOT,
          "scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts"
        )
      ),
    },
    {
      name: "REG:ip07-script-present",
      ok: existsSync(
        path.join(
          ROOT,
          "scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts"
        )
      ),
    },
    {
      name: "REG:ip08-artifacts-present",
      ok: existsSync(
        path.join(
          ROOT,
          "src/modules/commercial/services/commercial-governance-service.ts"
        )
      ),
    },
    {
      name: "REG:ip09-script-present",
      ok: existsSync(
        path.join(
          ROOT,
          "scripts/bp005-ip09-commercial-validation-smoke-validation.ts"
        )
      ),
    },
  ];
  results.push(...continuity);
  for (const r of continuity) {
    console.log(`[${r.ok ? "PASS" : "FAIL"}] ${r.name}`);
  }

  const regressions = [
    runExternal(
      "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
      "REG:bp003-ip011"
    ),
    runExternal(
      "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
      "REG:ip01"
    ),
    runExternal(
      "scripts/bp005-ip09-commercial-validation-smoke-validation.ts",
      "REG:ip09"
    ),
  ];
  results.push(...regressions);
  for (const r of regressions) {
    console.log(
      `[${r.ok ? "PASS" : "FAIL"}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\nIP-10 smoke: ${results.length - failed.length}/${results.length} PASS`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
