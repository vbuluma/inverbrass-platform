/**
 * Purpose:
 * Smoke-validate BP-009 / IP-05 Evaluation, Award & Sourcing Decision.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip05-evaluation-award-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  QUALIFICATION_STATUS_CODES,
  SOURCING_EVENT_STATUSES,
} from "@/modules/procurement";
import { createProcurementSourcingWorkflowAdapter } from "@/modules/procurement/adapters/procurement-sourcing-workflow-adapter";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import {
  buildSupplierEvaluationRows,
  requiresAwardOverride,
} from "@/modules/procurement/services/evaluation-scoring-rules";
import { isCommercialSealedToBuyer } from "@/modules/procurement/services/evaluation-workflow-rules";
import { defaultEvaluationPhases } from "@/modules/procurement/services/sourcing-rfx-rules";
import { SourcingService } from "@/modules/procurement/services/sourcing-service";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
import { InMemoryPurchaseOrderStore } from "@/modules/procurement/services/purchase-order-memory-store";
import { InMemoryPurchaseRequestStore } from "@/modules/procurement/services/purchase-request-memory-store";
import { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  ApprovedRequestBudget,
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0085_bp009_ip005_evaluation_award.sql",
  "src/modules/procurement/services/evaluation-scoring-rules.ts",
  "src/modules/procurement/components/evaluation-outcome-workspace.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string, userId = "buyer-1"): CurrentBusinessContext {
  return { businessId, platformUserId: userId, businessMembershipId: `mem-${businessId}` };
}

function actor(userId = "buyer-1", permissions = ALL_PROCUREMENT_PERMISSIONS): ProcurementActor {
  return { userId, permissions };
}

function futureClosesAt(days = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function party(id: string, name: string, businessId = "biz-a"): ProcurementPartyRef {
  return {
    id,
    businessId,
    displayName: name,
    partyNumber: `PTY-${id}`,
    partyTypeCode: "ORGANIZATION",
    hasActiveSupplierRole: true,
  };
}

function profile(
  id: string,
  partyId: string,
  businessId = "biz-a",
  statusCode: string = PROCUREMENT_STATUS_CODES.ACTIVE
): ProcurementProfileRecord {
  return {
    id,
    businessId,
    partyId,
    profileNumber: `SPP-${id}`,
    statusCode,
    qualificationStatusCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
    isPreferred: false,
    isApproved: true,
    defaultDeliveryTerms: null,
    defaultPaymentTerms: null,
    expectedLeadTimeDays: null,
    statusReason: null,
    statusEffectiveDate: "2026-01-01",
    statusReviewDate: null,
    statusAuthority: null,
    createdAt: new Date(),
    createdBy: "buyer-1",
    updatedAt: new Date(),
    updatedBy: "buyer-1",
    deletedAt: null,
    version: 1,
  };
}

function supplierSnapshot(
  profileId: string,
  partyId: string,
  name: string,
  businessId = "biz-a",
  statusCode: string = PROCUREMENT_STATUS_CODES.ACTIVE
): SuggestedSupplierSnapshot {
  return {
    profileId,
    partyId,
    party: party(partyId, name, businessId),
    profile: profile(profileId, partyId, businessId, statusCode),
    latestQualification: {
      id: `qual-${profileId}`,
      businessId,
      profileId,
      qualificationTypeCode: "GENERAL",
      outcomeCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
      effectiveDate: "2026-01-01",
      expiryDate: "2027-01-01",
      reviewDate: null,
      reviewerUserId: null,
      notes: null,
      createdAt: new Date(),
      createdBy: "buyer-1",
      updatedAt: new Date(),
      updatedBy: "buyer-1",
      deletedAt: null,
      version: 1,
      evidenceDocumentIds: [],
    },
  };
}

function approvedPr(
  id: string,
  requestNumber: string,
  estimatedValue: string,
  businessId = "biz-a"
): ApprovedRequestBudget & { businessId: string } {
  return {
    id,
    businessId,
    requestNumber,
    status: "APPROVED",
    estimatedValue,
    currencyCode: "KES",
  };
}

function harness() {
  const store = new InMemorySourcingStore();
  const audit = new RecordingProcurementAudit();
  const service = new SourcingService({
    store: store.store,
    numbering: store.numbering,
    audit,
    approvedRequests: store.approvedBudget,
    suggestedSupplier: store.suggestedSupplier,
    workflow: createProcurementSourcingWorkflowAdapter(store.store),
    notifications: createInProcessNotificationAdapter(),
  });
  return { store, audit, service };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

async function advanceToEvaluating(
  store: InMemorySourcingStore,
  service: SourcingService,
  context: CurrentBusinessContext,
  buyer: ProcurementActor,
  eventId: string
) {
  const past = new Date();
  past.setDate(past.getDate() - 1);
  await store.store.updateClosesAt(context.businessId, eventId, past, buyer.userId);
  await service.closeTender(context, buyer, eventId);
  await service.setupEvaluationCommittee(context, buyer, eventId, {
    members: [{ memberName: "Lead Evaluator", roleLabel: "Chair" }],
  });
  await service.configureEvaluationCriteria(context, buyer, eventId, {
    evaluationMethod: "LOWEST_COMPLIANT",
    phases: defaultEvaluationPhases().map((phase, index) => ({
      ...phase,
      included: index === 0,
      passmark: "0",
    })),
  });
  await service.lockEvaluationCriteria(context, buyer, eventId);
  await service.startEvaluation(context, buyer, eventId);
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const buyer = actor("buyer-1");
  const context = ctx("biz-a");

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  const workspaceUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/evaluation-outcome-workspace.tsx"),
    "utf8"
  );
  record(results, "ui:open-bids-section", workspaceUi.includes("Open bids"));
  record(results, "ui:phase-scores", workspaceUi.includes("Technical phase scores"));
  record(results, "ui:override-reason", workspaceUi.includes("Override reason"));
  record(results, "ui:approve-award-action", workspaceUi.includes("Approve award"));
  record(results, "ui:award-approval-pending", workspaceUi.includes("Award approval required"));
  record(results, "ui:bids-received-count", workspaceUi.includes("Bids received:"));

  record(
    results,
    "rules:sealed-until-opened",
    isCommercialSealedToBuyer(SOURCING_EVENT_STATUSES.EVALUATING, null) &&
      !isCommercialSealedToBuyer(SOURCING_EVENT_STATUSES.EVALUATING, new Date())
  );

  const rows = buildSupplierEvaluationRows({
    evaluationMethod: "LOWEST_COMPLIANT",
    financialBasis: "YEAR_1",
    technicalWeight: "0",
    financialWeight: "100",
    phases: [{ phaseCode: "DESKTOP", included: true, weight: "100", passmark: "50", required: true }],
    quotes: [
      { profileId: "a", amount: "9000000", year1Amount: null, tcvAmount: null, tcoAmount: null },
      { profileId: "b", amount: "8000000", year1Amount: null, tcvAmount: null, tcoAmount: null },
    ],
    phaseScores: [
      { profileId: "a", phaseCode: "DESKTOP", score: "80" },
      { profileId: "b", phaseCode: "DESKTOP", score: "70" },
    ],
  });
  const recommended = rows.find((row) => row.recommended);
  record(
    results,
    "scoring:lowest-compliant-rank",
    recommended?.profileId === "b" && recommended.rank === 1
  );
  record(
    results,
    "scoring:override-required",
    requiresAwardOverride(["b"], ["a"]) && !requiresAwardOverride(["b"], ["b"])
  );

  const { store, service, audit } = harness();
  store.seedApprovedRequest(approvedPr("pr-1", "PR-000100", "10000000"));
  store.seedSupplier(supplierSnapshot("sup-low", "pty-low", "Low Bid"));
  store.seedSupplier(supplierSnapshot("sup-high", "pty-high", "High Bid"));
  const event = await service.create(context, buyer, {
    title: "IP-05 opening",
    purchaseRequestIds: ["pr-1"],
    closesAt: futureClosesAt(),
  });
  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-low" });
  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-high" });
  await service.submitQuote(context, buyer, event.id, { profileId: "sup-low", amount: "9200000" });
  await service.submitQuote(context, buyer, event.id, { profileId: "sup-high", amount: "9800000" });
  await advanceToEvaluating(store, service, context, buyer, event.id);

  const sealed = await service.getEvaluation(context, buyer, event.id);
  record(
    results,
    "opening:sealed-after-start",
    sealed.commercialSealed && sealed.canOpenBids && !sealed.canAward
  );

  const blockedAward = await expectError(
    () =>
      service.awardSuppliers(context, buyer, event.id, {
        awards: [{ profileId: "sup-low" }],
      }),
    PROCUREMENT_ERROR_CODES.BIDS_NOT_OPENED
  );
  record(results, "opening:award-blocked", blockedAward);

  const opened = await service.openBids(context, buyer, event.id);
  record(
    results,
    "opening:standard-unseals",
    opened.bidsOpenedAt !== null &&
      !opened.commercialSealed &&
      opened.comparison.length === 2 &&
      opened.recommendedProfileIds.includes("sup-low")
  );
  record(
    results,
    "audit:bids-opened",
    audit.entries.some((row) => row.action === "PROCUREMENT_SOURCING_BIDS_OPENED")
  );

  await service.recordPhaseScores(context, buyer, event.id, {
    profileId: "sup-low",
    scores: [{ phaseCode: "DESKTOP", score: "90" }],
  });
  await service.recordPhaseScores(context, buyer, event.id, {
    profileId: "sup-high",
    scores: [{ phaseCode: "DESKTOP", score: "85" }],
  });
  const scored = await service.getEvaluation(context, buyer, event.id);
  const lowRow = scored.comparison.find((row) => row.profileId === "sup-low");
  record(
    results,
    "scoring:comparison-columns",
    lowRow?.technicalScore !== null && lowRow?.rank === 1 && lowRow?.recommended === true
  );

  await service.recordDueDiligence(context, buyer, event.id, { required: false });
  const overrideBlocked = await expectError(
    () =>
      service.awardSuppliers(context, buyer, event.id, {
        awards: [{ profileId: "sup-high" }],
      }),
    PROCUREMENT_ERROR_CODES.AWARD_OVERRIDE_REQUIRED
  );
  record(results, "award:override-required", overrideBlocked);

  const awarded = await service.awardSuppliers(context, buyer, event.id, {
    recommendation: "Award lowest compliant supplier.",
    overrideReason: "Committee confirmed alternate supplier.",
    awards: [{ profileId: "sup-high" }],
  });
  const awards = await store.store.listAwards(event.id);
  const awardLines = await store.store.listAwardLines(awards[0]!.id);
  record(
    results,
    "award:winning-quote-linked",
    awarded.status === SOURCING_EVENT_STATUSES.AWARDED &&
      awards[0]?.winningQuoteId !== null &&
      awards[0]?.overrideReason !== null
  );
  record(
    results,
    "award:lines-persisted",
    awardLines.length === 1 && awardLines[0]?.winningQuoteId === awards[0]?.winningQuoteId
  );

  const { store: blStore, service: blService } = harness();
  blStore.seedApprovedRequest(approvedPr("pr-bl", "PR-000101", "5000000"));
  blStore.seedSupplier(supplierSnapshot("sup-bl", "pty-bl", "Blacklisted"));
  const blEvent = await blService.create(context, buyer, {
    title: "Blacklist block",
    purchaseRequestIds: ["pr-bl"],
    closesAt: futureClosesAt(),
  });
  await blService.inviteSupplier(context, buyer, blEvent.id, { profileId: "sup-bl" });
  await blService.submitQuote(context, buyer, blEvent.id, { profileId: "sup-bl", amount: "4000000" });
  const blSnapshot = blStore.suppliers.get("sup-bl");
  if (blSnapshot) {
    blStore.suppliers.set("sup-bl", {
      ...blSnapshot,
      profile: { ...blSnapshot.profile, statusCode: PROCUREMENT_STATUS_CODES.BLACKLISTED },
    });
  }
  await advanceToEvaluating(blStore, blService, context, buyer, blEvent.id);
  await blService.openBids(context, buyer, blEvent.id);
  await blService.recordDueDiligence(context, buyer, blEvent.id, { required: false });
  const blacklistBlocked = await expectError(
    () =>
      blService.awardSuppliers(context, buyer, blEvent.id, {
        awards: [{ profileId: "sup-bl" }],
      }),
    PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE
  );
  record(results, "award:blacklist-blocked", blacklistBlocked);

  const { store: mcStore, service: mcService } = harness();
  mcStore.seedApprovedRequest(approvedPr("pr-mc", "PR-000102", "5000000"));
  mcStore.seedSupplier(supplierSnapshot("sup-mc", "pty-mc", "MC Supplier"));
  const mcEvent = await mcService.create(context, buyer, {
    title: "Maker checker",
    purchaseRequestIds: ["pr-mc"],
    closesAt: futureClosesAt(),
    requestedOpeningPolicy: "MAKER_CHECKER",
  });
  await mcService.inviteSupplier(context, buyer, mcEvent.id, { profileId: "sup-mc" });
  await mcService.submitQuote(context, buyer, mcEvent.id, { profileId: "sup-mc", amount: "4500000" });
  await advanceToEvaluating(mcStore, mcService, context, buyer, mcEvent.id);
  const selfApproveBlocked = await expectError(
    () => mcService.openBids(context, buyer, mcEvent.id, { openingApprovedBy: "buyer-1" }),
    PROCUREMENT_ERROR_CODES.SELF_APPROVAL
  );
  record(results, "opening:maker-checker-self-blocked", selfApproveBlocked);
  const mcOpened = await mcService.openBids(context, buyer, mcEvent.id, {
    openingApprovedBy: "checker-1",
  });
  record(results, "opening:maker-checker-success", mcOpened.bidsOpenedAt !== null);

  const { store: sealStore, service: sealService } = harness();
  sealStore.control.bidSubmissionCountVisible = true;
  sealStore.seedApprovedRequest(approvedPr("pr-seal", "PR-000103", "5000000"));
  sealStore.seedSupplier(supplierSnapshot("sup-s1", "pty-s1", "Sealed One"));
  sealStore.seedSupplier(supplierSnapshot("sup-s2", "pty-s2", "Sealed Two"));
  const sealEvent = await sealService.create(context, buyer, {
    title: "Count-only sealed",
    purchaseRequestIds: ["pr-seal"],
    closesAt: futureClosesAt(),
  });
  await sealService.inviteSupplier(context, buyer, sealEvent.id, { profileId: "sup-s1" });
  await sealService.inviteSupplier(context, buyer, sealEvent.id, { profileId: "sup-s2" });
  await sealService.submitQuote(context, buyer, sealEvent.id, { profileId: "sup-s1", amount: "4000000" });
  await sealService.submitQuote(context, buyer, sealEvent.id, { profileId: "sup-s2", amount: "4200000" });
  await advanceToEvaluating(sealStore, sealService, context, buyer, sealEvent.id);
  const sealedView = await sealService.getEvaluation(context, buyer, sealEvent.id);
  record(
    results,
    "sealed:count-only-hides-suppliers",
    sealedView.commercialSealed &&
      sealedView.bidsReceivedCount === 2 &&
      sealedView.bidSubmissionCountVisible &&
      sealedView.invitations.length === 0 &&
      sealedView.comparison.length === 0
  );

  const { store: apprStore, service: apprService, audit: apprAudit } = harness();
  apprStore.control.awardRequiresApproval = true;
  apprStore.seedApprovedRequest(approvedPr("pr-appr", "PR-000104", "5000000"));
  apprStore.seedSupplier(supplierSnapshot("sup-appr", "pty-appr", "Approval Supplier"));
  const apprEvent = await apprService.create(context, buyer, {
    title: "Award approval",
    purchaseRequestIds: ["pr-appr"],
    closesAt: futureClosesAt(),
  });
  await apprService.inviteSupplier(context, buyer, apprEvent.id, { profileId: "sup-appr" });
  await apprService.submitQuote(context, buyer, apprEvent.id, { profileId: "sup-appr", amount: "4500000" });
  await advanceToEvaluating(apprStore, apprService, context, buyer, apprEvent.id);
  await apprService.openBids(context, buyer, apprEvent.id);
  await apprService.recordDueDiligence(context, buyer, apprEvent.id, { required: false });
  const pendingAward = await apprService.awardSuppliers(context, buyer, apprEvent.id, {
    recommendation: "Recommend award pending approval.",
    awards: [{ profileId: "sup-appr" }],
  });
  record(
    results,
    "approval:pending-status",
    pendingAward.status === SOURCING_EVENT_STATUSES.EVALUATING &&
      pendingAward.awardApprovalStatus === "PENDING" &&
      pendingAward.canApproveAward &&
      !pendingAward.canAward
  );
  const poStore = new InMemoryPurchaseOrderStore();
  poStore.seedControl("biz-a", {
    requiresApproval: false,
    skipRfxEnabled: true,
    skipRfxMaxAmount: "50000000",
  });
  const prStore = new InMemoryPurchaseRequestStore();
  const poService = new PurchaseOrderService({
    store: poStore.store,
    sourcing: apprStore.store,
    requests: prStore.requestsPort,
    numbering: poStore.numbering,
    audit: apprAudit,
    workflow: createProcurementPoWorkflowAdapter(poStore.controls),
    controls: poStore.controls,
    suggestedSupplier: apprStore.suggestedSupplier,
    notifications: createInProcessNotificationAdapter(),
  });
  const apprAwards = await apprStore.store.listAwards(apprEvent.id);
  const poBlocked = await expectError(
    () => poService.generateFromAward(context, buyer, { awardId: apprAwards[0]!.id }),
    PROCUREMENT_ERROR_CODES.AWARD_NOT_APPROVED
  );
  record(results, "approval:po-blocked", poBlocked);
  const approved = await apprService.approveAward(context, actor("approver-2"), apprEvent.id, {
    approvedBy: "approver-2",
  });
  record(
    results,
    "approval:status-awarded",
    approved.status === SOURCING_EVENT_STATUSES.AWARDED &&
      approved.awardApprovalStatus === "APPROVED"
  );
  record(
    results,
    "approval:audit-recorded",
    apprAudit.entries.some((row) => row.action === "PROCUREMENT_SOURCING_AWARD_APPROVED")
  );
  const poGenerated = await poService.generateFromAward(context, buyer, {
    awardId: apprAwards[0]!.id,
  });
  record(results, "approval:po-after-approve", poGenerated.sourceType === "AWARD");

  const tampered = sealStore.events.get(sealEvent.id)!;
  sealStore.events.set(sealEvent.id, { ...tampered, criteriaLockedAt: null });
  const criteriaBlocked = await expectError(
    () => sealService.openBids(context, buyer, sealEvent.id),
    PROCUREMENT_ERROR_CODES.CRITERIA_NOT_LOCKED
  );
  record(results, "criteria:open-bids-requires-lock", criteriaBlocked);

  return results;
}

async function main() {
  console.log("BP-009 IP-05 Evaluation, Award & Sourcing Decision — smoke validation\n");
  const results = await runAcceptance();
  const passed = results.filter((row) => row.ok).length;
  const failed = results.filter((row) => !row.ok);
  console.log(`\n${passed}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.error("Failed:", failed.map((row) => row.name).join(", "));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
