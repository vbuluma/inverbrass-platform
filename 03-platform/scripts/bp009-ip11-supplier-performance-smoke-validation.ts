/**
 * Purpose:
 * Smoke-validate BP-009 / IP-11 Supplier Performance & Governance.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip11-supplier-performance-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { procurementPerformanceMeasures } from "@/db/seeds/procurement-catalogues";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
} from "@/modules/procurement";
import {
  GOVERNANCE_PROPOSAL_STATUSES,
  GOVERNANCE_PROPOSAL_TYPES,
  PERFORMANCE_MEASURE_CODES,
  PERFORMANCE_SOURCE_TYPES,
} from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { createInMemoryPerformanceStore } from "@/modules/procurement/services/performance-memory-store";
import { PerformanceService } from "@/modules/procurement/services/performance-service";
import { InMemoryProcurementStore } from "@/modules/procurement/services/procurement-memory-store";
import { ProcurementFoundationService } from "@/modules/procurement/services/procurement-foundation-service";
import { evaluateSupplierEligibility } from "@/modules/procurement/services/supplier-eligibility-service";
import type { ProcurementActor } from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");
type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0091_bp009_ip011_supplier_performance.sql",
  "drizzle/0092_bp009_ip011_evaluations_ip012_analytics.sql",
  "src/db/schema/procurement-performance.ts",
  "src/modules/procurement/services/performance-service.ts",
  "src/modules/procurement/services/performance-evaluation-rules.ts",
  "src/modules/procurement/repositories/performance-repository.ts",
  "src/modules/procurement/components/supplier-scorecard-panel.tsx",
  "src/modules/procurement/components/supplier-performance-review-panel.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string, userId = "buyer-1"): CurrentBusinessContext {
  return { businessId, platformUserId: userId, businessMembershipId: `mem-${businessId}` };
}

function actor(userId = "buyer-1"): ProcurementActor {
  return { userId, permissions: ALL_PROCUREMENT_PERMISSIONS };
}

function harness() {
  const foundationStore = new InMemoryProcurementStore();
  foundationStore.seedParty({
    id: "party-a",
    businessId: "biz-a",
    displayName: "Perf Supplier",
    partyNumber: "PTY-1",
    partyTypeCode: "ORGANIZATION",
    hasActiveSupplierRole: true,
  });
  const performanceMemory = createInMemoryPerformanceStore();
  const audit = new RecordingProcurementAudit();
  const foundation = new ProcurementFoundationService({
    parties: foundationStore.partyPort,
    documents: foundationStore.documentPort,
    catalogues: foundationStore.catalogues,
    profiles: foundationStore.profilesPort,
    qualifications: foundationStore.qualificationsPort,
    numbering: foundationStore.numbering,
    audit,
  });
  const performance = new PerformanceService({
    store: performanceMemory.store,
    controls: performanceMemory.controls,
    profiles: foundationStore.profilesPort,
    audit,
  });
  return { foundationStore, foundation, performance, performanceMemory, audit };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

async function main() {
  console.log("BP-009 IP-11 Supplier Performance & Governance — smoke validation\n");
  const results: Result[] = [];
  const context = ctx("biz-a");
  const clerk = actor();

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  const h = harness();
  h.performanceMemory.controlByBusiness.set("biz-a", {
    businessId: "biz-a",
    defaultPeriodDays: 90,
    preferredScoreThreshold: "10",
    preferredRequiresApproval: true,
    blockBlacklistedTransactions: true,
    supplierSelfEvalRequired: false,
    includeSupplierSelfEvalInAverage: false,
  });
  const created = await h.foundation.createProfile(context, clerk, {
    partyId: "party-a",
    categoryCodes: ["IT_HARDWARE"],
    capabilityCodes: ["SUPPLY"],
    assignSupplierRole: true,
  });
  const profileId = created.id;

  await h.performance.recordEvent({
    businessId: "biz-a",
    profileId,
    measureCode: PERFORMANCE_MEASURE_CODES.DELIVERY_ON_TIME,
    sourceType: PERFORMANCE_SOURCE_TYPES.RECEIPT,
    sourceId: "rcpt-1",
    sourceKey: "rcpt:1:on-time",
  });
  await h.performance.recordEvent({
    businessId: "biz-a",
    profileId,
    measureCode: PERFORMANCE_MEASURE_CODES.INVOICE_VARIANCE,
    sourceType: PERFORMANCE_SOURCE_TYPES.INVOICE,
    sourceId: "inv-1",
    sourceKey: "inv:1:variance",
  });
  const measures = (await h.performanceMemory.store.listMeasures("biz-a")).filter(
    (row) => row.isActive
  );
  const ratingPayload = measures.map((row) => ({ measureCode: row.code, score: 85 }));
  await h.performance.submitInternalEvaluation(context, clerk, profileId, {
    ratings: ratingPayload,
    evaluatorLabel: "Evaluator A",
  });
  await h.performance.submitInternalEvaluation(context, actor("buyer-2"), profileId, {
    ratings: measures.map((row) => ({ measureCode: row.code, score: 75 })),
    evaluatorLabel: "Evaluator B",
  });
  await h.performance.submitSupplierSelfEvaluation(context, clerk, profileId, {
    ratings: measures.map((row) => ({ measureCode: row.code, score: 90 })),
    evaluatorLabel: "Supplier self-eval",
  });
  const scorecard = await h.performance.refreshScorecard(context, clerk, profileId);
  record(
    results,
    "AC-001:scorecard-from-events",
    scorecard.measures.some((row) => row.eventCount > 0) && Number(scorecard.compositeScore) >= 0
  );
  record(
    results,
    "AC-011:multi-rater-average",
    (scorecard.evaluationSummary?.internalEvaluatorCount ?? 0) >= 2 &&
      scorecard.evaluationSummary?.supplierEvaluationSubmitted === true &&
      scorecard.evaluationSummary?.supplierIncludedInAverage === false
  );
  record(
    results,
    "AC-002:measure-catalogue",
    (await h.performanceMemory.store.listMeasures("biz-a")).length >=
      procurementPerformanceMeasures.length
  );

  h.performanceMemory.controlByBusiness.set("biz-a", {
    businessId: "biz-a",
    defaultPeriodDays: 90,
    preferredScoreThreshold: "10",
    preferredRequiresApproval: true,
    blockBlacklistedTransactions: true,
    supplierSelfEvalRequired: true,
    includeSupplierSelfEvalInAverage: false,
  });
  const preferredProposal = await h.performance.proposeGovernance(context, clerk, profileId, {
    proposalType: GOVERNANCE_PROPOSAL_TYPES.GRANT_PREFERRED,
    reason: "Strong delivery performance.",
  });
  const approvedPreferred = await h.performance.approveGovernance(
    context,
    clerk,
    preferredProposal.id
  );
  const preferredProfile = await h.foundation.getSupplier(context, clerk, profileId);
  record(
    results,
    "AC-002:preferred-threshold-approval",
    approvedPreferred.status === GOVERNANCE_PROPOSAL_STATUSES.APPROVED &&
      preferredProfile.isPreferred
  );

  const awardSource = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/sourcing-service.ts"),
    "utf8"
  );
  record(
    results,
    "AC-003:no-auto-award",
    awardSource.includes("awardSuppliers") && !awardSource.includes("isPreferred && award")
  );

  const blacklistProposal = await h.performance.proposeGovernance(context, clerk, profileId, {
    proposalType: GOVERNANCE_PROPOSAL_TYPES.BLACKLIST,
    reason: "Repeated invoice variances.",
    authority: "Procurement Director",
    evidenceDocumentId: "doc-evidence-1",
    reviewDate: "2027-01-01",
  });
  const approvedBlacklist = await h.performance.approveGovernance(
    context,
    clerk,
    blacklistProposal.id
  );
  const blacklisted = await h.foundation.getSupplier(context, clerk, profileId);
  const auditBlacklist = h.audit.entries.some(
    (row) => row.action === PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_BLACKLISTED
  );
  record(
    results,
    "AC-004:blacklist-evidence-audit",
    approvedBlacklist.proposalType === GOVERNANCE_PROPOSAL_TYPES.BLACKLIST &&
      blacklisted.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED &&
      auditBlacklist
  );

  const eligibility = evaluateSupplierEligibility({
    party: {
      id: "party-a",
      businessId: "biz-a",
      displayName: "Perf Supplier",
      partyNumber: "PTY-1",
      partyTypeCode: "ORGANIZATION",
      hasActiveSupplierRole: true,
    },
    profile: await h.foundationStore.profilesPort.findById("biz-a", profileId),
    latestQualification: null,
  });
  record(results, "AC-005:blacklist-blocks-new-procurement", !eligibility.eligible);

  const historicalReadable = await h.foundation.getSupplier(context, clerk, profileId);
  record(results, "AC-006:historical-profile-readable", historicalReadable.id === profileId);

  const reactivateProposal = await h.performance.proposeGovernance(context, clerk, profileId, {
    proposalType: GOVERNANCE_PROPOSAL_TYPES.REACTIVATE,
    reason: "Issue resolved pending review.",
  });
  await h.performance.approveGovernance(context, clerk, reactivateProposal.id);
  const suspendProposal = await h.performance.proposeGovernance(context, clerk, profileId, {
    proposalType: GOVERNANCE_PROPOSAL_TYPES.SUSPEND,
    reason: "Quality review.",
    authority: "QA Lead",
    evidenceDocumentId: "doc-evidence-2",
    reviewDate: "2027-06-01",
  });
  await h.performance.approveGovernance(context, clerk, suspendProposal.id);
  const suspended = await h.foundation.getSupplier(context, clerk, profileId);
  record(
    results,
    "AC-007:suspension-distinct",
    suspended.statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED
  );

  record(results, "AC-008:profile-on-bp002-party", created.partyId === "party-a");

  record(
    results,
    "AC-009:audit-events",
    h.audit.entries.some((row) => row.action === PROCUREMENT_AUDIT_ACTIONS.SCORECARD_COMPUTED)
  );

  const crossBlocked = await expectError(
    () =>
      h.performance.proposeGovernance(ctx("biz-other"), clerk, profileId, {
        proposalType: GOVERNANCE_PROPOSAL_TYPES.REACTIVATE,
        reason: "Cross-business attempt.",
      }),
    PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND
  );
  record(results, "AC-010:cross-business-blocked", crossBlocked);

  const perfSource = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/performance-service.ts"),
    "utf8"
  ).toLowerCase();
  record(
    results,
    "boundary:no-credit-bureau",
    !perfSource.includes("creditbureau") && !perfSource.includes("paymentdefaultscore")
  );

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "architecture-scan-clean", scan.supplierMaster.length === 0);

  const passed = results.filter((row) => row.ok).length;
  console.log(`\n${passed}/${results.length} checks passed.`);
  if (results.some((row) => !row.ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
