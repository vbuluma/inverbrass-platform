/**
 * Purpose:
 * Smoke-validate BP-005 / IP-08 Commercial Governance.
 *
 * Usage:
 *   npx tsx scripts/bp005-ip08-commercial-governance-smoke-validation.ts
 */

console.log("IP-08 smoke starting…");

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_TAG = "0055_bp005_ip008_commercial_governance";

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkFiles(): SmokeResult[] {
  const required = [
    `drizzle/${MIGRATION_TAG}.sql`,
    "src/db/schema/commercial-governance-policy.ts",
    "src/db/schema/commercial-rule-version.ts",
    "src/db/schema/commercial-governance-event.ts",
    "src/db/schema/commercial-override-request.ts",
    "src/modules/commercial/services/commercial-governance-service.ts",
    "src/modules/commercial/services/commercial-governance-rules.ts",
    "src/modules/commercial/components/commercial-governance-workspace.tsx",
    "src/app/(authenticated)/(app)/commercial/governance/page.tsx",
    "scripts/bp005-ip08-commercial-governance-smoke-validation.ts",
  ];
  return required.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
  }));
}

function checkJournal(): SmokeResult {
  const journal = readFileSync(
    path.join(ROOT, "drizzle/meta/_journal.json"),
    "utf8"
  );
  return {
    name: "migration:journal-entry",
    ok: journal.includes(MIGRATION_TAG),
  };
}

function checkSchemaBarrel(): SmokeResult {
  const barrel = readFileSync(
    path.join(ROOT, "src/db/schema/index.ts"),
    "utf8"
  );
  return {
    name: "schema:barrel-exports",
    ok:
      barrel.includes("commercialGovernancePolicy") &&
      barrel.includes("commercialRuleVersion"),
  };
}

function checkNoPricingMaster(): SmokeResult {
  const sql = readFileSync(
    path.join(ROOT, `drizzle/${MIGRATION_TAG}.sql`),
    "utf8"
  );
  return {
    name: "architecture:no-pricing-master",
    ok:
      sql.includes("commercial_governance_policy") &&
      sql.includes("commercial_rule_version") &&
      !sql.includes('CREATE TABLE IF NOT EXISTS "pricing_item"'),
  };
}

function checkUxNav(): SmokeResult {
  const nav = readFileSync(
    path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"),
    "utf8"
  );
  const workspace = readFileSync(
    path.join(
      ROOT,
      "src/modules/commercial/components/commercial-governance-workspace.tsx"
    ),
    "utf8"
  );
  return {
    name: "UX:governance-workspace",
    ok:
      nav.includes("/commercial/governance") &&
      workspace.includes("Commercial governance") &&
      workspace.includes("Governance history"),
  };
}

async function runCoreCases(): Promise<SmokeResult[]> {
  console.log("Loading commercial governance modules…");
  const {
    CommercialError,
    COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES,
    COMMERCIAL_GOVERNANCE_PERMISSIONS,
    COMMERCIAL_RULE_TYPE_CODES,
    createCommercialGovernanceService,
    createInMemoryCommercialGovernanceStore,
    detectMaterialChange,
  } = await import("@/modules/commercial");

  const ctx = (businessId: string) =>
    ({ businessId, platformUserId: "u1" }) as never;
  const actor = (userId: string, permissions: string[]) => ({
    userId,
    permissions,
  });

  const MAKER_PERMS = [
    COMMERCIAL_GOVERNANCE_PERMISSIONS.CREATE,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.EDIT,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.SUBMIT,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.READ,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.OVERRIDE_REQUEST,
  ];
  const CHECKER_PERMS = [
    COMMERCIAL_GOVERNANCE_PERMISSIONS.READ,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.APPROVE,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.REJECT,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.ACTIVATE,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.SUSPEND,
    COMMERCIAL_GOVERNANCE_PERMISSIONS.OVERRIDE_APPROVE,
  ];

  const store = createInMemoryCommercialGovernanceStore();
  const service = createCommercialGovernanceService(store, {
    disableAudit: true,
  });
  const maker = actor("maker-1", MAKER_PERMS);
  const checker = actor("checker-1", CHECKER_PERMS);
  const biz = ctx("biz-a");
  const results: SmokeResult[] = [];

  const draft = service.createDraft(biz, maker, {
    ruleKey: "TAX-VAT",
    ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
    label: "VAT 16%",
    payload: { ratePercent: 16 },
    currencyCode: "KES",
  });
  results.push({
    name: "TC-01:draft-creation",
    ok: draft.lifecycleStatus === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.DRAFT,
  });

  const submitted = service.submitForApproval(biz, maker, draft.ruleVersionId);
  results.push({
    name: "TC-02:submit-for-approval",
    ok:
      submitted.rule.lifecycleStatus ===
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.PENDING_APPROVAL,
  });

  const approved = service.approve(biz, checker, draft.ruleVersionId);
  results.push({
    name: "TC-03:approval",
    ok:
      approved.lifecycleStatus ===
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED,
  });

  const draft2 = service.createDraft(biz, maker, {
    ruleKey: "TAX-VAT-B",
    ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
    label: "VAT B",
    payload: { ratePercent: 8 },
  });
  service.submitForApproval(biz, maker, draft2.ruleVersionId);
  try {
    service.approve(
      biz,
      actor("maker-1", [
        ...MAKER_PERMS,
        COMMERCIAL_GOVERNANCE_PERMISSIONS.APPROVE,
      ]),
      draft2.ruleVersionId
    );
    results.push({ name: "TC-04:self-approval-rejection", ok: false });
  } catch (error) {
    results.push({
      name: "TC-04:self-approval-rejection",
      ok:
        error instanceof CommercialError &&
        error.code === "GOVERNANCE_SOD_VIOLATION",
    });
  }

  const draft3 = service.createDraft(biz, maker, {
    ruleKey: "TAX-VAT-C",
    ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
    label: "VAT C",
    payload: { ratePercent: 5 },
  });
  service.submitForApproval(biz, maker, draft3.ruleVersionId);
  const rejected = service.reject(
    biz,
    checker,
    draft3.ruleVersionId,
    "Rate too low"
  );
  results.push({
    name: "TC-05:rejection",
    ok:
      rejected.lifecycleStatus ===
        COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.REJECTED &&
      rejected.rejectionReason === "Rate too low",
  });

  try {
    service.activate(biz, checker, draft3.ruleVersionId);
    results.push({ name: "TC-06:invalid-lifecycle-transition", ok: false });
  } catch (error) {
    results.push({
      name: "TC-06:invalid-lifecycle-transition",
      ok: error instanceof CommercialError,
    });
  }

  const activated = service.activate(biz, checker, draft.ruleVersionId);
  results.push({
    name: "TC-07:activation",
    ok:
      activated.lifecycleStatus ===
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE,
  });

  const future = service.createDraft(biz, maker, {
    ruleKey: "TAX-FUTURE",
    ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
    label: "Future VAT",
    payload: { ratePercent: 18 },
    effectiveFrom: "2099-01-01T00:00:00.000Z",
  });
  service.submitForApproval(biz, maker, future.ruleVersionId);
  service.approve(biz, checker, future.ruleVersionId);
  try {
    service.activate(
      biz,
      checker,
      future.ruleVersionId,
      new Date("2026-08-12")
    );
    results.push({ name: "TC-08:future-effective-date", ok: false });
  } catch (error) {
    results.push({
      name: "TC-08:future-effective-date",
      ok:
        error instanceof CommercialError &&
        error.code === "EFFECTIVE_DATE_NOT_REACHED",
    });
  }

  const suspended = service.suspend(
    biz,
    checker,
    activated.ruleVersionId,
    "Temporary hold"
  );
  results.push({
    name: "TC-09:suspension",
    ok:
      suspended.lifecycleStatus ===
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.SUSPENDED,
  });

  results.push({
    name: "TC-10:material-change",
    ok: detectMaterialChange(
      {
        label: "A",
        description: null,
        payload: { ratePercent: 16 },
        currencyCode: "KES",
        effectiveFrom: null,
        effectiveTo: null,
      },
      { payload: { ratePercent: 18 } }
    ).isMaterial,
  });

  results.push({
    name: "TC-11:non-material-change",
    ok: !detectMaterialChange(
      {
        label: "A",
        description: "old",
        payload: { ratePercent: 16 },
        currencyCode: "KES",
        effectiveFrom: null,
        effectiveTo: null,
      },
      { description: "new" }
    ).isMaterial,
  });

  // Re-activate a fresh approved rule to test mutation block on ACTIVE
  const forMutation = service.createDraft(biz, maker, {
    ruleKey: "TAX-MUT",
    ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
    label: "Mut",
    payload: { ratePercent: 12 },
  });
  service.submitForApproval(biz, maker, forMutation.ruleVersionId);
  service.approve(biz, checker, forMutation.ruleVersionId);
  const activeForMutation = service.activate(
    biz,
    checker,
    forMutation.ruleVersionId
  );
  try {
    service.updateDraft(biz, maker, {
      ruleVersionId: activeForMutation.ruleVersionId,
      payload: { ratePercent: 20 },
    });
    results.push({ name: "TC-10b:active-mutation-blocked", ok: false });
  } catch (error) {
    results.push({
      name: "TC-10b:active-mutation-blocked",
      ok:
        error instanceof CommercialError &&
        (error.code === "MATERIAL_CHANGE_REQUIRES_APPROVAL" ||
          error.code === "INVALID_LIFECYCLE_TRANSITION"),
    });
  }

  try {
    service.approve(biz, actor("stranger", []), draft2.ruleVersionId);
    results.push({ name: "TC-12:unauthorized-action", ok: false });
  } catch (error) {
    results.push({
      name: "TC-12:unauthorized-action",
      ok:
        error instanceof CommercialError &&
        error.code === "GOVERNANCE_UNAUTHORIZED",
    });
  }

  try {
    service.getRuleHistory(ctx("biz-b"), draft.ruleVersionId);
    results.push({ name: "TC-13:tenant-isolation", ok: false });
  } catch (error) {
    results.push({
      name: "TC-13:tenant-isolation",
      ok:
        error instanceof CommercialError &&
        error.code === "GOVERNANCE_RULE_NOT_FOUND",
    });
  }

  try {
    service.requestOverride(biz, maker, {
      ruleVersionId: activated.ruleVersionId,
      reason: "Need exception",
      originalValue: { ratePercent: 16 },
      overriddenValue: { ratePercent: 0 },
    });
    results.push({ name: "TC-14:override-blocked", ok: false });
  } catch (error) {
    results.push({
      name: "TC-14:override-blocked",
      ok:
        error instanceof CommercialError &&
        error.code === "OVERRIDE_NOT_PERMITTED",
    });
  }

  service.upsertPolicy(
    biz,
    actor("admin", [COMMERCIAL_GOVERNANCE_PERMISSIONS.EDIT]),
    { allowOverride: true, overrideRequiresApproval: true }
  );
  const override = service.requestOverride(biz, maker, {
    ruleVersionId: activated.ruleVersionId,
    reason: "Authorized commercial exception",
    originalValue: { ratePercent: 16 },
    overriddenValue: { ratePercent: 10 },
  });
  const approvedOverride = service.approveOverride(
    biz,
    checker,
    override.overrideId
  );
  results.push({
    name: "TC-14b:authorized-override",
    ok: approvedOverride.status === "APPROVED",
  });

  const v2 = service.createNewVersionDraft(
    biz,
    maker,
    activated.ruleVersionId,
    { payload: { ratePercent: 20 }, label: "VAT 20%" }
  );
  const v1 = store.getRule("biz-a", activated.ruleVersionId)!;
  results.push({
    name: "TC-15:historical-version-integrity",
    ok:
      v2.versionNumber >= 2 &&
      v1.payload.ratePercent === 16 &&
      v2.payload.ratePercent === 20,
  });

  const events = store.listEvents("biz-a", activated.ruleVersionId);
  results.push({
    name: "TC-16:audit-history",
    ok: events.length >= 2,
  });

  console.log("Loading IP-06/IP-07 compatibility modules…");
  const {
    CommercialResolutionService,
    createExpectedCommercialAmountService,
  } = await import("@/modules/commercial");

  const resolutionService = new CommercialResolutionService({
    resolveBasePrice: async () => ({
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
          partyId: null,
          quantity: 1,
        },
        candidateCount: 1,
        precedenceOwner: "IP-05",
        selectionMode: "SINGLE_CANDIDATE",
        unsupportedDimensionsNoted: [],
      },
      resolvedAt: "2026-06-01T00:00:00.000Z",
    }),
  } as never);

  const resolution = await resolutionService.resolve(biz, {
    businessId: "biz-a",
    offeringId: "offering-1",
    currencyCode: "KES",
  });
  const snapshot = resolutionService.snapshot(resolution);
  const frozen = snapshot.resolution.payable;
  const decision = service.validateSnapshotGovernance(biz, checker, snapshot);
  results.push({
    name: "TC-17:ip06-snapshot-immutable",
    ok:
      decision.decision === "ALLOWED" &&
      snapshot.resolution.payable === frozen &&
      snapshot.immutable === true,
  });

  const expected =
    createExpectedCommercialAmountService().calculateExpectedAmount(
      biz,
      snapshot
    );
  results.push({
    name: "TC-18:ip07-expected-from-snapshot",
    ok:
      Math.abs(
        expected.expectedAmountNumber - snapshot.resolution.payableNumber
      ) < 0.0000001 && expected.snapshotId === snapshot.snapshotId,
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
    timeout: 420_000,
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
    checkJournal(),
    checkSchemaBarrel(),
    checkNoPricingMaster(),
    checkUxNav(),
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
      "TC-19a:bp003-ip011-regression"
    ),
    runExternal(
      "scripts/bp005-ip01-base-price-resolution-smoke-validation.ts",
      "TC-19b:ip01-regression"
    ),
    runExternal(
      "scripts/bp005-ip02-commercial-composition-smoke-validation.ts",
      "TC-19c:ip02-regression"
    ),
    runExternal(
      "scripts/bp005-ip05-pricing-precedence-smoke-validation.ts",
      "TC-19d:ip05-regression"
    ),
    runExternal(
      "scripts/bp005-ip03-tax-resolution-smoke-validation.ts",
      "TC-20a:ip03-regression"
    ),
    runExternal(
      "scripts/bp005-ip04-discount-adjustment-smoke-validation.ts",
      "TC-20b:ip04-regression"
    ),
    runExternal(
      "scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts",
      "TC-21a:ip06-regression"
    ),
    runExternal(
      "scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts",
      "TC-21b:ip07-regression"
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
    `\nIP-08 smoke: ${results.length - failed.length}/${results.length} PASS`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
