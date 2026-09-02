/**
 * Purpose:
 * Smoke-validate BP-009 / IP-03 evaluation outcome and procurement savings.
 * Exercises production services with an in-memory store. Not production runtime.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip03-evaluation-outcome-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  QUALIFICATION_STATUS_CODES,
  SOURCING_EVENT_STATUSES,
} from "@/modules/procurement";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import { createProcurementSourcingWorkflowAdapter } from "@/modules/procurement/adapters/procurement-sourcing-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import {
  computeCommercialOutcome,
  formatProcurementMoney,
  initialAndFinalFromVersions,
} from "@/modules/procurement/services/evaluation-outcome-rules";
import { activeQuoteVersions } from "@/modules/procurement/services/sourcing-response-rules";
import { defaultEvaluationPhases } from "@/modules/procurement/services/sourcing-rfx-rules";
import { SourcingService } from "@/modules/procurement/services/sourcing-service";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
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
  "drizzle/0081_bp009_ip003_sourcing_evaluation.sql",
  "drizzle/0082_bp009_ip003_rfx_controls.sql",
  "drizzle/0083_bp009_ip004_supplier_response.sql",
  "drizzle/0084_bp009_evaluation_workflow.sql",
  "drizzle/0085_bp009_ip005_evaluation_award.sql",
  "src/modules/procurement/services/evaluation-workflow-rules.ts",
  "src/modules/procurement/services/evaluation-scoring-rules.ts",
  "src/modules/procurement/services/sourcing-service.ts",
  "src/modules/procurement/services/sourcing-rfx-rules.ts",
  "src/modules/procurement/services/evaluation-outcome-rules.ts",
  "src/app/(authenticated)/(app)/procurement/sourcing/page.tsx",
  "src/app/(authenticated)/(app)/procurement/sourcing/evaluations/page.tsx",
  "src/app/(authenticated)/(app)/procurement/sourcing/awards/page.tsx",
  "src/app/(public)/sourcing/respond/[token]/page.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string, userId = "user-a"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function actor(
  userId: string,
  permissions: readonly string[] = ALL_PROCUREMENT_PERMISSIONS
): ProcurementActor {
  return { userId, permissions };
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
  businessId = "biz-a"
): ProcurementProfileRecord {
  return {
    id,
    businessId,
    partyId,
    profileNumber: `SPP-${id}`,
    statusCode: PROCUREMENT_STATUS_CODES.ACTIVE,
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
    createdBy: "user-a",
    updatedAt: new Date(),
    updatedBy: "user-a",
    deletedAt: null,
    version: 1,
  };
}

function supplierSnapshot(
  profileId: string,
  partyId: string,
  name: string,
  businessId = "biz-a"
): SuggestedSupplierSnapshot {
  return {
    profileId,
    partyId,
    party: party(partyId, name, businessId),
    profile: profile(profileId, partyId, businessId),
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
      createdBy: "user-a",
      updatedAt: new Date(),
      updatedBy: "user-a",
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

function futureClosesAt(days = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
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

async function outcomeForSupplier(
  store: InMemorySourcingStore,
  eventId: string,
  profileId: string,
  budgetedAmount: string
) {
  const versions = activeQuoteVersions(await store.store.listQuotes(eventId, profileId));
  const pair = initialAndFinalFromVersions(versions);
  if (!pair) {
    return null;
  }
  return computeCommercialOutcome({
    budgetedAmount,
    initialQuote: pair.initialQuote,
    finalQuote: pair.finalQuote,
    currencyCode: "KES",
  });
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
    })),
  });
  await service.lockEvaluationCriteria(context, buyer, eventId);
  await service.startEvaluation(context, buyer, eventId);
}

async function advanceToAwardReady(
  store: InMemorySourcingStore,
  service: SourcingService,
  context: CurrentBusinessContext,
  buyer: ProcurementActor,
  eventId: string
) {
  await advanceToEvaluating(store, service, context, buyer, eventId);
  await service.openBids(context, buyer, eventId);
  await service.recordDueDiligence(context, buyer, eventId, { required: false });
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const buyer = actor("user-a");
  const context = ctx("biz-a");

  const calc = computeCommercialOutcome({
    budgetedAmount: "10000000",
    initialQuote: "9500000",
    finalQuote: "9000000",
    currencyCode: "KES",
  });
  record(
    results,
    "calc:example",
    calc.budgetedSavings === "1000000.00" &&
      calc.negotiatedSavings === "500000.00" &&
      calc.awardedAmount === "9000000.00" &&
      calc.savingsPercentage === "10" &&
      calc.overBudget === false,
    `${calc.budgetedSavings} / ${calc.negotiatedSavings} / ${calc.savingsPercentage}%`
  );

  const none = computeCommercialOutcome({
    budgetedAmount: "10000000",
    initialQuote: "9000000",
    finalQuote: "9000000",
    currencyCode: "KES",
  });
  record(
    results,
    "calc:no-negotiation",
    none.budgetedSavings === "1000000.00" &&
      none.negotiatedSavings === "0.00" &&
      none.savingsPercentage === "10"
  );

  const over = computeCommercialOutcome({
    budgetedAmount: "10000000",
    initialQuote: "11000000",
    finalQuote: "10500000",
    currencyCode: "KES",
  });
  record(
    results,
    "calc:over-budget",
    over.budgetedSavings === "-500000.00" &&
      over.negotiatedSavings === "500000.00" &&
      over.savingsPercentage === "-5" &&
      over.overBudget === true
  );

  const { store, audit, service } = harness();
  store.seedApprovedRequest(approvedPr("pr-1", "PR-000001", "10000000"));
  store.seedSupplier(supplierSnapshot("sup-a", "pty-a", "ABC Technologies"));
  store.seedSupplier(supplierSnapshot("sup-b", "pty-b", "Supplier B"));
  store.seedSupplier(supplierSnapshot("sup-c", "pty-c", "Supplier C"));

  const event = await service.create(context, buyer, {
    title: "Laptop sourcing",
    purchaseRequestIds: ["pr-1"],
    closesAt: futureClosesAt(),
  });
  record(
    results,
    "create:budget-from-pr",
    event.budgetedAmount === "10000000.00" &&
      event.budgetedAmountLabel === "KES 10,000,000" &&
      event.purchaseRequestNumbers.includes("PR-000001")
  );

  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-a" });
  await service.submitQuote(context, buyer, event.id, {
    profileId: "sup-a",
    amount: "9500000",
  });
  const revised = await service.submitQuote(context, buyer, event.id, {
    profileId: "sup-a",
    amount: "9000000",
  });
  const abc = await outcomeForSupplier(store, event.id, "sup-a", "10000000.00");
  record(
    results,
    "quotes:initial-preserved",
    abc?.initialQuote === "9500000.00" && abc?.finalQuote === "9000000.00"
  );
  record(
    results,
    "quotes:example-outcome",
    abc?.budgetedSavings === "1000000.00" &&
      abc?.negotiatedSavings === "500000.00" &&
      abc?.savingsPercentage === "10"
  );

  const versions = await store.store.listQuotes(event.id, "sup-a");
  record(
    results,
    "quotes:version-history",
    versions.length === 2 && versions[0]?.amount === "9500000.00" && versions[1]?.amount === "9000000.00"
  );

  const { store: noneStore, service: noneService } = harness();
  noneStore.seedApprovedRequest(approvedPr("pr-n", "PR-000010", "10000000"));
  noneStore.seedSupplier(supplierSnapshot("sup-n", "pty-n", "No Negotiation Ltd"));
  const noneEvent = await noneService.create(context, buyer, {
    title: "No negotiation",
    purchaseRequestIds: ["pr-n"],
    closesAt: futureClosesAt(),
  });
  await noneService.inviteSupplier(context, buyer, noneEvent.id, { profileId: "sup-n" });
  await noneService.submitQuote(context, buyer, noneEvent.id, {
    profileId: "sup-n",
    amount: "9000000",
  });
  const noneOutcome = await outcomeForSupplier(noneStore, noneEvent.id, "sup-n", "10000000.00");
  record(
    results,
    "eval:no-negotiation",
    noneOutcome?.negotiatedSavings === "0.00" &&
      noneOutcome?.initialQuote === noneOutcome?.finalQuote &&
      noneOutcome?.budgetedSavings === "1000000.00"
  );

  const { store: overStore, service: overService } = harness();
  overStore.seedApprovedRequest(approvedPr("pr-o", "PR-000011", "10000000"));
  overStore.seedSupplier(supplierSnapshot("sup-o", "pty-o", "Over Budget Ltd"));
  const overEvent = await overService.create(context, buyer, {
    title: "Over budget",
    purchaseRequestIds: ["pr-o"],
    closesAt: futureClosesAt(),
  });
  await overService.inviteSupplier(context, buyer, overEvent.id, { profileId: "sup-o" });
  await overService.submitQuote(context, buyer, overEvent.id, {
    profileId: "sup-o",
    amount: "11000000",
  });
  await overService.submitQuote(context, buyer, overEvent.id, {
    profileId: "sup-o",
    amount: "10500000",
  });
  const overOutcome = await outcomeForSupplier(overStore, overEvent.id, "sup-o", "10000000.00");
  record(
    results,
    "eval:over-budget-visible",
    overOutcome?.overBudget === true &&
      overOutcome?.budgetedSavings === "-500000.00" &&
      overOutcome?.savingsPercentage === "-5"
  );
  const workspaceUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/evaluation-outcome-workspace.tsx"),
    "utf8"
  );
  record(results, "ui:over-budget-label", workspaceUi.includes("Over Budget"));

  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-b" });
  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-c" });
  await service.submitQuote(context, buyer, event.id, { profileId: "sup-b", amount: "9800000" });
  await service.submitQuote(context, buyer, event.id, { profileId: "sup-b", amount: "9200000" });
  await service.submitQuote(context, buyer, event.id, { profileId: "sup-c", amount: "10200000" });
  await service.submitQuote(context, buyer, event.id, {
    profileId: "sup-c",
    amount: "9700000",
  });

  const sealedView = await service.getEvaluation(context, buyer, event.id);
  record(results, "sealed:comparison-hidden-while-issued", sealedView.commercialSealed && sealedView.comparison.length === 0);

  const rowA = await outcomeForSupplier(store, event.id, "sup-a", "10000000.00");
  const rowB = await outcomeForSupplier(store, event.id, "sup-b", "10000000.00");
  const rowC = await outcomeForSupplier(store, event.id, "sup-c", "10000000.00");
  record(
    results,
    "eval:multi-supplier",
    rowA?.finalQuote === "9000000.00" &&
      rowB?.initialQuote === "9800000.00" &&
      rowB?.finalQuote === "9200000.00" &&
      rowB?.budgetedSavings === "800000.00" &&
      rowC?.savingsPercentage === "3"
  );

  await advanceToEvaluating(store, service, context, buyer, event.id);
  const started = await service.getEvaluation(context, buyer, event.id);
  record(
    results,
    "workflow:sealed-after-start",
    started.commercialSealed && started.comparison.length === 0
  );
  const opened = await service.openBids(context, buyer, event.id);
  record(
    results,
    "workflow:comparison-after-open",
    !opened.commercialSealed && opened.comparison.length === 3
  );
  await service.recordDueDiligence(context, buyer, event.id, { required: false });
  const readyToAward = await service.getEvaluation(context, buyer, event.id);
  const awarded = await service.awardSuppliers(context, buyer, readyToAward.id, {
    recommendation: "Award ABC on final quote.",
    awards: [{ profileId: "sup-a" }],
  });
  record(
    results,
    "award:amount-equals-final",
    awarded.awards[0]?.outcome.awardedAmount === "9000000.00" &&
      awarded.awards[0]?.outcome.finalQuote === "9000000.00" &&
      awarded.status === SOURCING_EVENT_STATUSES.AWARDED &&
      awarded.comparison.find((row) => row.profileId === "sup-a")?.awarded === true
  );

  const { store: splitStore, service: splitService } = harness();
  splitStore.seedApprovedRequest(approvedPr("pr-s", "PR-000020", "10000000"));
  splitStore.seedSupplier(supplierSnapshot("split-a", "pty-sa", "Split A"));
  splitStore.seedSupplier(supplierSnapshot("split-b", "pty-sb", "Split B"));
  const splitEvent = await splitService.create(context, buyer, {
    title: "Split award",
    purchaseRequestIds: ["pr-s"],
    closesAt: futureClosesAt(),
  });
  await splitService.inviteSupplier(context, buyer, splitEvent.id, { profileId: "split-a" });
  await splitService.inviteSupplier(context, buyer, splitEvent.id, { profileId: "split-b" });
  await splitService.submitQuote(context, buyer, splitEvent.id, {
    profileId: "split-a",
    amount: "6000000",
  });
  await splitService.submitQuote(context, buyer, splitEvent.id, {
    profileId: "split-a",
    amount: "5500000",
  });
  await splitService.submitQuote(context, buyer, splitEvent.id, {
    profileId: "split-b",
    amount: "4000000",
  });
  await splitService.submitQuote(context, buyer, splitEvent.id, {
    profileId: "split-b",
    amount: "3800000",
  });
  await advanceToAwardReady(splitStore, splitService, context, buyer, splitEvent.id);
  const splitAwarded = await splitService.awardSuppliers(context, buyer, splitEvent.id, {
    overrideReason: "Split award approved by committee.",
    awards: [
      { profileId: "split-a", allocatedBudgetAmount: "6000000" },
      { profileId: "split-b", allocatedBudgetAmount: "4000000" },
    ],
  });
  const splitA = splitAwarded.awards.find((row) => row.profileId === "split-a");
  const splitB = splitAwarded.awards.find((row) => row.profileId === "split-b");
  const allocatedSum =
    Number(splitA?.allocatedBudgetAmount ?? 0) + Number(splitB?.allocatedBudgetAmount ?? 0);
  record(
    results,
    "award:split-no-double-count",
    allocatedSum === 10000000 &&
      splitA?.outcome.awardedAmount === "5500000.00" &&
      splitA.outcome.budgetedSavings === "500000.00" &&
      splitB?.outcome.awardedAmount === "3800000.00" &&
      splitB.outcome.budgetedSavings === "200000.00" &&
      splitA.outcome.budgetedAmount !== "10000000.00"
  );
  const overAllocated = await expectError(
    async () => {
      const { store: badStore, service: badService } = harness();
      badStore.seedApprovedRequest(approvedPr("pr-bad", "PR-000021", "10000000"));
      badStore.seedSupplier(supplierSnapshot("bad-a", "pty-ba", "Bad A"));
      badStore.seedSupplier(supplierSnapshot("bad-b", "pty-bb", "Bad B"));
      const badEvent = await badService.create(context, buyer, {
        title: "Over allocated",
        purchaseRequestIds: ["pr-bad"],
        closesAt: futureClosesAt(),
      });
      await badService.inviteSupplier(context, buyer, badEvent.id, { profileId: "bad-a" });
      await badService.inviteSupplier(context, buyer, badEvent.id, { profileId: "bad-b" });
      await badService.submitQuote(context, buyer, badEvent.id, {
        profileId: "bad-a",
        amount: "6000000",
      });
      await badService.submitQuote(context, buyer, badEvent.id, {
        profileId: "bad-b",
        amount: "5000000",
      });
      await advanceToAwardReady(badStore, badService, context, buyer, badEvent.id);
      await badService.awardSuppliers(context, buyer, badEvent.id, {
        overrideReason: "Testing over-allocation guard.",
        awards: [
          { profileId: "bad-a", allocatedBudgetAmount: "6000000" },
          { profileId: "bad-b", allocatedBudgetAmount: "5000000" },
        ],
      });
    },
    PROCUREMENT_ERROR_CODES.AWARD_INVALID
  );
  record(results, "award:split-cannot-exceed-budget", overAllocated);

  const invitation = awarded.invitations.find((row) => row.profileId === "sup-a");
  const portal = await service.getPortalByToken(invitation!.accessToken);
  const portalText = JSON.stringify(portal);
  record(
    results,
    "security:supplier-own-quotes-only",
    portal.ownQuotes.length === 2 &&
      portal.currentAmount === "9000000.00" &&
      !portalText.includes("budget") &&
      !portalText.includes("savings") &&
      !portalText.includes("10000000") &&
      !portalText.includes("Supplier B") &&
      !portalText.includes("9800000")
  );

  const cross = await expectError(
    () => service.getEvaluation(ctx("biz-b"), buyer, event.id),
    PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND
  );
  record(results, "tenant:cross-business", cross);

  const unauthorized = await expectError(
    () =>
      noneService.awardSuppliers(
        context,
        actor("user-x", [PROCUREMENT_PERMISSIONS.SOURCING_READ]),
        noneEvent.id,
        { awards: [{ profileId: "sup-n" }] }
      ),
    PROCUREMENT_ERROR_CODES.UNAUTHORIZED
  );
  record(results, "authz:cannot-award", unauthorized);

  const unapproved = await expectError(
    async () => {
      store.seedApprovedRequest({
        ...approvedPr("pr-draft", "PR-000099", "1000"),
        status: "DRAFT",
      });
      await service.create(context, buyer, {
        title: "Draft PR",
        purchaseRequestIds: ["pr-draft"],
        closesAt: futureClosesAt(),
      });
    },
    PROCUREMENT_ERROR_CODES.REQUEST_NOT_APPROVED
  );
  record(results, "create:requires-approved-pr", unapproved);

  const { store: rfxStore, service: rfxService } = harness();
  rfxStore.seedApprovedRequest(approvedPr("pr-rfx", "PR-000030", "5000000"));
  rfxStore.seedSupplier(supplierSnapshot("sup-rfx", "pty-rfx", "RFX Supplier"));
  rfxStore.openingRules.push({
    dimension: "VALUE",
    matchValue: "1000000",
    requiredPolicy: "MAKER_CHECKER",
  });
  const rfxEvent = await rfxService.create(context, buyer, {
    title: "Governed opening",
    purchaseRequestIds: ["pr-rfx"],
    closesAt: futureClosesAt(),
    requestedOpeningPolicy: "STANDARD",
  });
  record(
    results,
    "rfx:maker-checker-enforced",
    rfxEvent.openingPolicy === "MAKER_CHECKER"
  );
  await rfxService.inviteSupplier(context, buyer, rfxEvent.id, { profileId: "sup-rfx" });
  const pastRfx = new Date();
  pastRfx.setDate(pastRfx.getDate() - 1);
  await rfxStore.store.updateClosesAt(context.businessId, rfxEvent.id, pastRfx, "user-a");
  const closedQuote = await expectError(
    () =>
      rfxService.submitQuote(context, buyer, rfxEvent.id, {
        profileId: "sup-rfx",
        amount: "1000",
      }),
    PROCUREMENT_ERROR_CODES.TENDER_CLOSED
  );
  record(results, "rfx:tender-closed-blocks-quote", closedQuote);
  await rfxService.closeTender(context, buyer, rfxEvent.id);
  await rfxService.setupEvaluationCommittee(context, buyer, rfxEvent.id, {
    members: [{ memberName: "Evaluator", roleLabel: "Chair" }],
  });
  await rfxService.configureEvaluationCriteria(context, buyer, rfxEvent.id, {
    evaluationMethod: "BEST_OVERALL",
    technicalWeight: "40",
    financialWeight: "60",
    financialBasis: "TCV",
    phases: defaultEvaluationPhases().map((phase, index) => ({
      ...phase,
      included: index === 0,
    })),
  });
  const criteriaLocked = await rfxService.getEvaluation(context, buyer, rfxEvent.id);
  record(
    results,
    "rfx:evaluation-phases-locked",
    criteriaLocked.evaluationMethod === "BEST_OVERALL" &&
      criteriaLocked.phases.some((row) => row.phaseCode === "DESKTOP" && row.included)
  );

  const { store: extendStore, audit: extendAudit, service: extendService } = harness();
  extendStore.seedApprovedRequest(approvedPr("pr-ext", "PR-000031", "2000000"));
  const extendEvent = await extendService.create(context, buyer, {
    title: "Extend tender",
    purchaseRequestIds: ["pr-ext"],
    closesAt: futureClosesAt(7),
  });
  const extended = await extendService.extendTender(context, buyer, extendEvent.id, {
    closesAt: futureClosesAt(21),
    reason: "More supplier time",
  });
  record(
    results,
    "rfx:extend-without-approval",
    new Date(extended.closesAt).getTime() > new Date(extendEvent.closesAt).getTime()
  );

  extendStore.control.extensionRequiresApproval = true;
  const deniedExtend = await expectError(
    () =>
      extendService.extendTender(
        context,
        actor("user-updater", [PROCUREMENT_PERMISSIONS.SOURCING_UPDATE]),
        extendEvent.id,
        { closesAt: futureClosesAt(30) }
      ),
    PROCUREMENT_ERROR_CODES.UNAUTHORIZED
  );
  record(results, "rfx:extend-requires-approver", deniedExtend);
  const approvedExtend = await extendService.extendTender(
    context,
    buyer,
    extendEvent.id,
    { closesAt: futureClosesAt(30) }
  );
  record(
    results,
    "rfx:extend-with-approval",
    new Date(approvedExtend.closesAt).getTime() > new Date(extended.closesAt).getTime()
  );

  record(
    results,
    "audit:extension",
    extendAudit.entries.some((entry) => entry.action === "PROCUREMENT_SOURCING_EXTENDED")
  );

  record(
    results,
    "audit:quote-and-award",
    audit.entries.some((entry) => entry.action === "PROCUREMENT_SOURCING_CREATED") &&
      audit.entries.some(
        (entry) =>
          entry.action === "PROCUREMENT_SOURCING_QUOTE_SUBMITTED" &&
          entry.references?.previousAmount === "9500000.00" &&
          entry.references?.newAmount === "9000000.00"
      ) &&
      audit.entries.some((entry) => entry.action === "PROCUREMENT_SOURCING_AWARDED")
  );

  const sql = readFileSync(path.join(ROOT, REQUIRED_FILES[0]!), "utf8");
  record(results, "schema:no-total-savings", !sql.includes("total_savings") && !sql.includes("totalSavings"));
  record(
    results,
    "schema:no-purchase-order",
    !sql.toLowerCase().includes("purchase_order") && !sql.includes("purchaseOrder")
  );

  const sourcingService = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/sourcing-service.ts"),
    "utf8"
  );
  record(
    results,
    "scope:no-po-or-downstream",
    !sourcingService.includes("purchaseOrder") &&
      !sourcingService.includes("purchase_order") &&
      !sourcingService.includes("@/modules/inventory") &&
      !sourcingService.includes("@/modules/payments")
  );

  const nav = readFileSync(path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"), "utf8");
  record(results, "nav:hub-first", nav.includes('id: "procurement"') && nav.includes('href: "/procurement/sourcing"'));
  record(
    results,
    "nav:no-top-level-rfx",
    !nav.includes('id: "rfx"') || nav.includes('id: "procurement-rfx"')
  );
  record(
    results,
    "nav:no-engine-labels",
    !nav.includes("RFX Engine") &&
      !nav.includes("Evaluation Engine") &&
      !nav.includes("Savings Engine") &&
      !nav.includes('label: "IP-03"')
  );

  const portalUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/sourcing-supplier-portal.tsx"),
    "utf8"
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  record(
    results,
    "portal:no-budget-ui",
    !portalUi.includes("Budgeted Amount") &&
      !portalUi.includes("Budgeted Savings") &&
      !portalUi.includes("Negotiated Savings") &&
      !portalUi.includes("Awarded Amount") &&
      !portalUi.includes("Savings %")
  );

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "scan:no-downstream-leakage", scan.downstream.length === 0, scan.downstream.join(","));

  for (const relative of REQUIRED_FILES) {
    record(results, `files:${relative}`, existsSync(path.join(ROOT, relative)));
  }

  record(
    results,
    "display:kes-format",
    formatProcurementMoney("10000000", "KES") === "KES 10,000,000"
  );

  void store;
  return results;
}

async function main() {
  console.log("\nBP-009 IP-03 EVALUATION OUTCOME SMOKE VALIDATION\n");
  const results = await runAcceptance();
  const failed = results.filter((row) => !row.ok);
  console.log(
    `\n${failed.length === 0 ? "PASS" : "FAIL"} — ${results.length - failed.length}/${results.length} checks`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
