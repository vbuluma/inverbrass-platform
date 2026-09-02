/**
 * Purpose:
 * Smoke-validate BP-005 / IP-09 Commercial Validation & Resilience.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip09-commercial-validation-smoke-validation.ts
 */

console.log("IP-09 smoke starting…");

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
  COMMERCIAL_ERROR_CODE_FAMILY,
  COMMERCIAL_ERROR_FAMILIES,
  COMMERCIAL_GOVERNANCE_PERMISSIONS,
  COMMERCIAL_RULE_TYPE_CODES,
  CommercialError,
  CommercialResolutionService,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  assertCommercialSnapshotValid,
  buildDeterminismFingerprint,
  createCommercialGovernanceService,
  createCommercialValidationService,
  createInMemoryCommercialGovernanceStore,
  toStructuredCommercialError,
  validateCommercialConfigurationPayload,
  validateResolutionIntegrity,
  validateResolutionRequestPre,
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
    "src/modules/commercial/services/commercial-validation-rules.ts",
    "src/modules/commercial/services/commercial-validation-service.ts",
    "src/modules/commercial/services/commercial-resolution-service.ts",
    "src/modules/commercial/components/commercial-resolution-workspace.tsx",
    "scripts/bp005-ip09-commercial-validation-smoke-validation.ts",
  ];
  return required.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkExportsAndNoMigration(): SmokeResult[] {
  const index = readFileSync(
    path.join(ROOT, "src/modules/commercial/index.ts"),
    "utf8"
  );
  const constants = readFileSync(
    path.join(ROOT, "src/modules/commercial/constants.ts"),
    "utf8"
  );
  const errors = readFileSync(
    path.join(ROOT, "src/modules/commercial/errors.ts"),
    "utf8"
  );
  const resolution = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/commercial-resolution-service.ts"
    ),
    "utf8"
  );
  const governance = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/commercial-governance-service.ts"
    ),
    "utf8"
  );
  return [
    {
      name: "export:validation-service",
      ok:
        index.includes("createCommercialValidationService") &&
        index.includes("toStructuredCommercialError") &&
        index.includes("COMMERCIAL_ERROR_FAMILIES"),
    },
    {
      name: "constants:ip09-families",
      ok:
        constants.includes("IP_09_VALIDATION") &&
        constants.includes("CFG_MISSING") &&
        constants.includes("allowSilentZeroFallback"),
    },
    {
      name: "errors:structured-catalogue",
      ok:
        errors.includes("COMMERCIAL_ERROR_CODE_FAMILY") &&
        errors.includes("REQUIRED_CONFIGURATION_MISSING") &&
        errors.includes("SILENT_FALLBACK_FORBIDDEN"),
    },
    {
      name: "wire:pre-post-validate",
      ok:
        resolution.includes("assertPreValidateResolve") &&
        resolution.includes("assertPostValidateResolution"),
    },
    {
      name: "wire:governance-save-validation",
      ok: governance.includes("assertConfigurationSave"),
    },
    {
      name: "architecture:no-ip09-migration",
      ok: !existsSync(
        path.join(ROOT, "drizzle/0056_bp005_ip009_commercial_validation.sql")
      ),
    },
  ];
}

function checkUxStructuredErrors(): SmokeResult {
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
  const errors = readFileSync(
    path.join(ROOT, "src/modules/commercial/errors.ts"),
    "utf8"
  );
  const rules = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/services/commercial-validation-rules.ts"
    ),
    "utf8"
  );
  return {
    name: "UX:structured-error-feedback",
    ok:
      workspace.includes("actionableHint") &&
      actions.includes("toStructuredCommercialError") &&
      actions.includes("payableProduced") &&
      (errors.includes("no payable was produced") ||
        rules.includes("No payable was produced.")),
  };
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const validation = createCommercialValidationService();

  // AC-001 / BRU-001 — required tax config missing → CFG_MISSING, no payable
  const missingTax = validateResolutionRequestPre(
    {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      requireTaxConfiguration: true,
      taxRules: [],
    },
    "biz-a"
  );
  results.push({
    name: "AC-001:missing-required-tax-cfg",
    ok:
      !missingTax.ok &&
      missingTax.issues.some(
        (i) =>
          i.family === COMMERCIAL_ERROR_FAMILIES.CFG_MISSING ||
          i.code === "REQUIRED_CONFIGURATION_MISSING" ||
          i.code === "TAX_CONFIGURATION_MISSING"
      ),
  });

  try {
    await serviceWithBase(fixtureResolvedBase()).resolve(ctx("biz-a"), {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      requireTaxConfiguration: true,
      taxRules: [],
    });
    results.push({ name: "AC-001b:resolve-fail-closed-no-payable", ok: false });
  } catch (error) {
    results.push({
      name: "AC-001b:resolve-fail-closed-no-payable",
      ok:
        error instanceof CommercialError &&
        (error.code === "REQUIRED_CONFIGURATION_MISSING" ||
          error.code === "TAX_CONFIGURATION_MISSING" ||
          error.code === "COMMERCIAL_VALIDATION_FAILED") &&
        COMMERCIAL_ERROR_CODE_FAMILY[error.code] === "CFG_MISSING",
      detail: error instanceof CommercialError ? error.code : String(error),
    });
  }

  // AC-002 — currency mismatch fail closed
  const currencyReport = validateResolutionRequestPre(
    {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      taxRules: taxRules("biz-a", "USD"),
    },
    "biz-a"
  );
  results.push({
    name: "AC-002:currency-mismatch",
    ok:
      !currencyReport.ok &&
      currencyReport.issues.some(
        (i) => i.family === COMMERCIAL_ERROR_FAMILIES.CURRENCY
      ),
  });

  // Mixed currency policy without FX → fail closed
  const mixed = validateResolutionRequestPre(
    {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      policy: { allowMixedCurrency: true },
    },
    "biz-a"
  );
  results.push({
    name: "BRU-002:mixed-currency-forbidden",
    ok: !mixed.ok && mixed.issues.some((i) => i.code === "CURRENCY_MISMATCH"),
  });

  // Silent zero fallback forbidden
  const silent = validateResolutionRequestPre(
    {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      policy: { allowSilentZeroFallback: true },
    },
    "biz-a"
  );
  results.push({
    name: "BRU-001:silent-fallback-forbidden",
    ok:
      !silent.ok &&
      silent.issues.some((i) => i.code === "SILENT_FALLBACK_FORBIDDEN"),
  });

  // AC-003 — integrity failure fail closed
  const okResolution = await serviceWithBase(fixtureResolvedBase()).resolve(
    ctx("biz-a"),
    {
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
      quantity: 1,
      taxRules: taxRules("biz-a"),
    }
  );
  const tampered = structuredClone(okResolution);
  tampered.payable = "999999.000000";
  const integrity = validateResolutionIntegrity(tampered);
  results.push({
    name: "AC-003:integrity-failure",
    ok:
      !integrity.ok &&
      integrity.issues.some(
        (i) =>
          i.family === COMMERCIAL_ERROR_FAMILIES.INTEGRITY ||
          i.code === "ROUNDING_INTEGRITY_FAILURE"
      ),
  });

  // Circular dependency at configuration save
  const circular = validateCommercialConfigurationPayload({
    ruleKey: "COMP-CIRC",
    ruleType: COMMERCIAL_RULE_TYPE_CODES.COMMERCIAL_POLICY,
    label: "Circular",
    payload: {
      componentIds: ["a", "b"],
      dependencyEdges: [
        { fromComponentId: "a", toComponentId: "b" },
        { fromComponentId: "b", toComponentId: "a" },
      ],
    },
  });
  results.push({
    name: "CFG_INVALID:circular-dependency",
    ok:
      !circular.ok &&
      circular.issues.some((i) => i.code === "CIRCULAR_COMPONENT_DEPENDENCY"),
  });

  // BRU-005 — governance createDraft validates payload
  const store = createInMemoryCommercialGovernanceStore();
  const gov = createCommercialGovernanceService(store, { disableAudit: true });
  const maker = {
    userId: "maker-1",
    permissions: [
      COMMERCIAL_GOVERNANCE_PERMISSIONS.CREATE,
      COMMERCIAL_GOVERNANCE_PERMISSIONS.EDIT,
      COMMERCIAL_GOVERNANCE_PERMISSIONS.READ,
    ],
  };
  try {
    gov.createDraft(ctx("biz-a"), maker, {
      ruleKey: "BAD-TAX",
      ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
      label: "Bad rate",
      payload: { ratePercent: -5 },
      currencyCode: "KES",
    });
    results.push({ name: "BRU-005:config-save-validation", ok: false });
  } catch (error) {
    results.push({
      name: "BRU-005:config-save-validation",
      ok: error instanceof CommercialError && error.code === "INVALID_TAX_RATE",
      detail: error instanceof CommercialError ? error.code : String(error),
    });
  }

  // AC-005 — structured machine-readable error
  const structured = toStructuredCommercialError(
    new CommercialError(
      "REQUIRED_CONFIGURATION_MISSING",
      "Missing required commercial configuration.",
      400,
      "taxRules"
    ),
    {
      stage: "PRE_CONFIGURATION",
      businessId: "biz-a",
      offeringId: "offering-1",
      currencyCode: "KES",
    }
  );
  results.push({
    name: "AC-005:structured-error-payload",
    ok:
      structured.code === "REQUIRED_CONFIGURATION_MISSING" &&
      structured.family === "CFG_MISSING" &&
      structured.payableProduced === false &&
      structured.retryable === false &&
      structured.ip === "IP-09" &&
      Boolean(structured.actionableHint) &&
      structured.businessId === "biz-a",
  });

  // AC-004 — determinism: identical inputs → identical fingerprint / payable
  const service = serviceWithBase(fixtureResolvedBase());
  const request = {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
    quantity: 2,
    taxRules: taxRules("biz-a"),
    adjustmentRules: [
      {
        adjustmentRuleId: "disc-1",
        businessId: "biz-a",
        adjustmentCode: "DISC",
        adjustmentLabel: "Discount",
        method: ADJUSTMENT_METHOD_CODES.PERCENTAGE,
        direction: ADJUSTMENT_DIRECTION_CODES.DISCOUNT,
        basis: ADJUSTMENT_BASIS_CODES.PRINCIPAL,
        status: ADJUSTMENT_RULE_STATUS_CODES.ACTIVE,
        percentage: 10,
        fixedAmount: null,
        effectiveFrom: "2000-01-01T00:00:00.000Z",
        effectiveTo: null,
        stacking: ADJUSTMENT_STACKING_CODES.ADDITIVE,
        currencyCode: "KES",
      },
    ],
  };
  const first = await service.resolve(ctx("biz-a"), request);
  const second = await service.resolve(ctx("biz-a"), request);
  const fp1 = buildDeterminismFingerprint(first);
  const fp2 = buildDeterminismFingerprint(second);
  try {
    validation.assertDeterministic(fp1, fp2);
    results.push({
      name: "AC-004:determinism",
      ok: first.payable === second.payable && fp1 === fp2,
      detail: `fp=${fp1} payable=${first.payable}`,
    });
  } catch (error) {
    results.push({
      name: "AC-004:determinism",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // Happy path still produces reconciled payable + snapshot
  const snap = service.snapshot(first);
  assertCommercialSnapshotValid(snap);
  const post = validation.postValidateResolution(first);
  results.push({
    name: "happy-path:post-validate-ok",
    ok: post.ok === true && Boolean(post.determinismFingerprint),
  });

  // IP-06/07 immutability preserved — re-resolve does not mutate snapshot
  const expected = service.calculateExpectedAmount(ctx("biz-a"), snap);
  const snap2 = service.snapshot(first);
  results.push({
    name: "immutability:ip06-ip07",
    ok:
      snap.integrityHash === snap2.integrityHash &&
      Number(expected.expectedAmount) === Number(snap.resolution.payable) &&
      Number(expected.payableAmount) === Number(snap.resolution.payable),
    detail: `expected=${expected.expectedAmount} payable=${snap.resolution.payable}`,
  });

  // Family map coverage for key codes
  results.push({
    name: "catalogue:error-families",
    ok:
      COMMERCIAL_ERROR_CODE_FAMILY.MISSING_BASE_PRICE === "CFG_MISSING" &&
      COMMERCIAL_ERROR_CODE_FAMILY.CURRENCY_MISMATCH === "CURRENCY" &&
      COMMERCIAL_ERROR_CODE_FAMILY.CIRCULAR_COMPONENT_DEPENDENCY ===
        "CFG_INVALID" &&
      COMMERCIAL_ERROR_CODE_FAMILY.ROUNDING_INTEGRITY_FAILURE === "INTEGRITY",
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
        : (run.stdout || run.stderr || `exit=${run.status}`).slice(0, 400),
  };
}

async function main() {
  const results: SmokeResult[] = [
    ...checkFiles(),
    ...checkExportsAndNoMigration(),
    checkUxStructuredErrors(),
  ];

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

  const regressions = [
    runExternal(
      "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
      "REG:bp003-ip011"
    ),
    // IP-01 has no nested spawn tree — safe, fast regression signal.
    runExternal(
      "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
      "REG:ip01"
    ),
  ];

  // Continuity for IP-05…IP-08 (full nested suites remain owned by those IPs' smokes).
  // In-process happy-path + BRU-005 already exercise IP-06/IP-07/IP-08 wiring under IP-09 gates.
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
      ok:
        existsSync(
          path.join(
            ROOT,
            "src/modules/commercial/components/commercial-governance-workspace.tsx"
          )
        ) &&
        existsSync(
          path.join(
            ROOT,
            "src/modules/commercial/services/commercial-governance-service.ts"
          )
        ),
    },
  ];
  results.push(...continuity);
  for (const r of continuity) {
    console.log(`[${r.ok ? "PASS" : "FAIL"}] ${r.name}`);
  }
  results.push(...regressions);
  for (const r of regressions) {
    console.log(
      `[${r.ok ? "PASS" : "FAIL"}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\nIP-09 smoke: ${results.length - failed.length}/${results.length} PASS`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
