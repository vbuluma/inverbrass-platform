/**
 * Purpose:
 * Smoke-validate BP-009 / IP-06 Purchase Order Management.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip06-purchase-order-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  PURCHASE_REQUEST_STATUSES,
  QUALIFICATION_STATUS_CODES,
} from "@/modules/procurement";
import {
  PO_STATUSES,
  PURCHASE_REQUEST_ORIGIN_TYPES,
} from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { InMemoryPurchaseOrderStore } from "@/modules/procurement/services/purchase-order-memory-store";
import { InMemoryPurchaseRequestStore } from "@/modules/procurement/services/purchase-request-memory-store";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
import { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  PurchaseRequestInsert,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0086_bp009_ip006_award_lines_purchase_orders.sql",
  "src/db/schema/procurement-purchase-order.ts",
  "src/modules/procurement/services/purchase-order-service.ts",
  "src/modules/procurement/repositories/purchase-order-repository.ts",
  "src/app/(authenticated)/(app)/procurement/orders/page.tsx",
  "src/app/(public)/procurement/po/respond/[token]/page.tsx",
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

function harness(requiresApproval = true) {
  const poStore = new InMemoryPurchaseOrderStore();
  poStore.seedControl("biz-a", { requiresApproval, skipRfxEnabled: true, skipRfxMaxAmount: "50000000" });
  const prStore = new InMemoryPurchaseRequestStore();
  const sourcingStore = new InMemorySourcingStore();
  const audit = new RecordingProcurementAudit();
  const service = new PurchaseOrderService({
    store: poStore.store,
    sourcing: sourcingStore.store,
    requests: prStore.requestsPort,
    numbering: poStore.numbering,
    audit,
    workflow: createProcurementPoWorkflowAdapter(poStore.controls),
    controls: poStore.controls,
    suggestedSupplier: prStore.suggestedSupplier,
    notifications: createInProcessNotificationAdapter(),
  });
  return { poStore, prStore, sourcingStore, audit, service };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

async function seedAwardWithLines(
  sourcingStore: InMemorySourcingStore,
  prStore: InMemoryPurchaseRequestStore,
  profileId = "sup-1"
) {
  prStore.suppliers.set(profileId, supplierSnapshot(profileId, "pty-1", "Acme Supplies"));
  const eventId = randomUUID();
  const awardId = randomUUID();
  const quoteId = randomUUID();
  const awardLineId = randomUUID();
  sourcingStore.events.set(eventId, {
    id: eventId,
    businessId: "biz-a",
    eventNumber: "RFX-000001",
    rfxType: "RFQ",
    title: "Laptops",
    status: "AWARDED",
    currencyCode: "KES",
    recommendation: null,
    closesAt: new Date("2026-12-31"),
    originalClosesAt: new Date("2026-12-31"),
    riskLevel: "LOW",
    categoryCode: null,
    openingPolicy: "STANDARD",
    openingPolicySource: "DEFAULT",
    evaluationMethod: "LOWEST_COMPLIANT",
    technicalWeight: "0",
    financialWeight: "100",
    financialBasis: "YEAR_1",
    evaluationStage: "AWARDED",
    committeeConstitutedAt: null,
    committeeConstitutedBy: null,
    criteriaLockedAt: null,
    criteriaLockedBy: null,
    criteriaSnapshotHash: null,
    criteriaSnapshotJson: null,
    awardApprovalStatus: null,
    awardSubmittedAt: null,
    awardSubmittedBy: null,
    awardApprovedAt: null,
    awardApprovedBy: null,
    closedAt: new Date(),
    evaluationStartedAt: new Date(),
    dueDiligenceRequired: false,
    dueDiligenceLocationVerified: true,
    dueDiligenceStaffVerified: true,
    dueDiligenceLegalVerified: true,
    dueDiligenceOtherNotes: null,
    dueDiligenceRecordedAt: new Date(),
    bidsOpenedAt: new Date(),
    bidsOpenedBy: "buyer-1",
    bidsOpeningApprovedBy: null,
    recommendedProfileIds: profileId,
    awardOverrideReason: null,
    createdBy: "buyer-1",
    deletedAt: null,
  });
  sourcingStore.awards.push({
    id: awardId,
    eventId,
    profileId,
    awardedAmount: "1000000",
    allocatedBudgetAmount: "1000000",
    winningQuoteId: quoteId,
    overrideReason: null,
  });
  sourcingStore.awardLines.push({
    id: awardLineId,
    businessId: "biz-a",
    awardId,
    winningQuoteId: quoteId,
    winningQuoteLineId: randomUUID(),
    sequence: 1,
    description: "Laptop bundle",
    quantity: "10",
    uom: "EA",
    unitPrice: "100000",
    taxRate: "0",
    lineTotal: "1000000",
    currencyCode: "KES",
  });
  sourcingStore.quotes.push({
    id: quoteId,
    businessId: "biz-a",
    eventId,
    profileId,
    version: 1,
    amount: "1000000",
    currencyCode: "KES",
    status: "SUBMITTED",
    comments: null,
    deliveryLeadDays: 14,
    warrantyNotes: "12 months",
    year1Amount: "1000000",
    tcvAmount: "1200000",
    tcoAmount: "1300000",
    capturedOnBehalf: false,
    idempotencyKey: null,
    submittedAt: new Date(),
    submittedBy: null,
  });
  sourcingStore.paymentTerms.set(quoteId, [
    {
      sequence: 1,
      milestoneName: "On delivery",
      percentage: "100",
      amount: "1000000",
      triggerEvent: "Delivery",
      duePeriodDays: 30,
      comments: null,
    },
  ]);
  return { eventId, awardId, quoteId, profileId };
}

async function seedApprovedPr(
  prStore: InMemoryPurchaseRequestStore,
  overrides: Partial<PurchaseRequestInsert> = {}
) {
  const id = overrides.id ?? randomUUID();
  const profileId = "sup-1";
  prStore.suppliers.set(profileId, supplierSnapshot(profileId, "pty-1", "Acme Supplies"));
  await prStore.requestsPort.insert({
    id,
    businessId: "biz-a",
    requestNumber: "PR-000200",
    status: PURCHASE_REQUEST_STATUSES.APPROVED,
    originType: PURCHASE_REQUEST_ORIGIN_TYPES.AD_HOC,
    originReference: null,
    requesterUserId: "buyer-1",
    businessUnitCode: null,
    procurementType: "GOODS",
    justification: "Need laptops",
    requiredDate: "2026-06-01",
    deliveryLocation: "HQ",
    estimatedValue: "500000",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-1",
    budgetLine: null,
    budgetPeriod: null,
    budgetApprovedAmount: "1000000",
    budgetAvailableAmount: "800000",
    budgetCheckStatus: "WITHIN_BUDGET",
    budgetApprovalReference: null,
    budgetApprovalDate: null,
    budgetApprover: null,
    suggestedProfileId: profileId,
    submittedAt: new Date(),
    submittedBy: "buyer-1",
    approvedAt: new Date(),
    approvedBy: "approver-1",
    rejectedAt: null,
    rejectedBy: null,
    returnedAt: null,
    returnedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    decisionReason: null,
    idempotencyKey: null,
    createdBy: "buyer-1",
    updatedBy: "buyer-1",
    version: 1,
    ...overrides,
  });
  await prStore.requestsPort.replaceLines("biz-a", id, [
    {
      description: "Office chairs",
      quantity: "5",
      uom: "EA",
      estimatedValue: "100000",
    },
  ]);
  return { id, profileId };
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const buyer = actor("buyer-1");
  const approver = actor("approver-2");
  const context = ctx("biz-a");

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "architecture:no-supplier-master", scan.supplierMaster.length === 0);
  record(results, "architecture:no-client-businessId", scan.clientBusinessId.length === 0);

  const { sourcingStore, prStore, service, audit } = harness(true);
  const { awardId } = await seedAwardWithLines(sourcingStore, prStore);
  const fromAward = await service.generateFromAward(context, buyer, { awardId });
  record(
    results,
    "AC-001:po-from-award-with-lines",
    fromAward.sourceType === "AWARD" &&
      fromAward.awardId === awardId &&
      (fromAward.currentVersion?.lines.length ?? 0) === 1 &&
      fromAward.winningQuoteId !== null
  );
  record(
    results,
    "AC-001:payment-terms-copied",
    (fromAward.currentVersion?.paymentTerms.length ?? 0) === 1
  );
  record(
    results,
    "AC-001:year1-tcv-tco",
    fromAward.year1Amount === "1000000" &&
      fromAward.tcvAmount === "1200000" &&
      fromAward.tcoAmount === "1300000"
  );

  const duplicate = await expectError(
    () => service.generateFromAward(context, buyer, { awardId }),
    PROCUREMENT_ERROR_CODES.PO_ALREADY_EXISTS
  );
  record(results, "AC-001:no-duplicate-po", duplicate);

  const { id: prId } = await seedApprovedPr(prStore);
  const fromPr = await service.generateFromPurchaseRequest(context, buyer, {
    purchaseRequestId: prId,
  });
  record(
    results,
    "AC-002:po-from-approved-pr",
    fromPr.sourceType === "PURCHASE_REQUEST" && fromPr.purchaseRequestId === prId
  );

  {
    const blockedHarness = harness(true);
    blockedHarness.poStore.seedControl("biz-a", { skipRfxEnabled: false });
    const { id: blockedPrId } = await seedApprovedPr(blockedHarness.prStore);
    const skipBlocked = await expectError(
      () =>
        blockedHarness.service.generateFromPurchaseRequest(context, buyer, {
          purchaseRequestId: blockedPrId,
        }),
      PROCUREMENT_ERROR_CODES.SKIP_RFX_NOT_ALLOWED
    );
    record(results, "AC-002:skip-rfx-policy", skipBlocked);
  }

  const reorderHarness = harness(true);
  const { id: reorderPrId } = await seedApprovedPr(reorderHarness.prStore, {
    originType: PURCHASE_REQUEST_ORIGIN_TYPES.INVENTORY_REORDER,
    originReference: "reorder-1",
  });
  const reorderBlocked = await expectError(
    () =>
      reorderHarness.service.generateFromPurchaseRequest(context, buyer, {
        purchaseRequestId: reorderPrId,
      }),
    PROCUREMENT_ERROR_CODES.INVALID_ORIGIN
  );
  record(results, "AC-003:reorder-blocked", reorderBlocked);

  const lifecycle = harness(true);
  const { awardId: lifecycleAwardId } = await seedAwardWithLines(
    lifecycle.sourcingStore,
    lifecycle.prStore,
    "sup-life"
  );
  lifecycle.prStore.suppliers.set(
    "sup-life",
    supplierSnapshot("sup-life", "pty-life", "Lifecycle Supplier")
  );
  const po = await lifecycle.service.generateFromAward(context, buyer, { awardId: lifecycleAwardId });
  await lifecycle.service.submit(context, buyer, po.id);
  const pending = await lifecycle.service.get(context, buyer, po.id);
  record(results, "AC-004:approval-required", pending.status === PO_STATUSES.PENDING_APPROVAL);
  await lifecycle.service.approve(context, approver, po.id);
  const approved = await lifecycle.service.get(context, buyer, po.id);
  record(results, "AC-004:approved", approved.status === PO_STATUSES.APPROVED);
  const issueKey = "issue-key-1";
  await lifecycle.service.issue(context, buyer, po.id, { idempotencyKey: issueKey });
  const issued = await lifecycle.service.get(context, buyer, po.id);
  record(results, "AC-008:issued-audited", lifecycle.audit.entries.some((e) => e.action.includes("PO_ISSUED")));
  const reissue = await lifecycle.service.issue(context, buyer, po.id, { idempotencyKey: issueKey });
  record(results, "AC-009:idempotent-issue", reissue.status === PO_STATUSES.ISSUED);

  const tokenRow = [...lifecycle.poStore.tokens.values()].find((row) => row.purchaseOrderId === po.id);
  if (!tokenRow) {
    record(results, "AC-005:supplier-token", false, "missing token");
  } else {
    const portal = await lifecycle.service.getByToken(tokenRow.accessToken);
    record(results, "AC-005:portal-load", portal.poNumber === issued.poNumber);
    await lifecycle.service.acceptByToken(tokenRow.accessToken);
    const accepted = await lifecycle.service.get(context, buyer, po.id);
    record(results, "AC-005:supplier-accept", accepted.status === PO_STATUSES.ACCEPTED);
  }

  const rejectHarness = harness(false);
  const { awardId: rejectAwardId } = await seedAwardWithLines(
    rejectHarness.sourcingStore,
    rejectHarness.prStore,
    "sup-reject"
  );
  rejectHarness.prStore.suppliers.set(
    "sup-reject",
    supplierSnapshot("sup-reject", "pty-reject", "Reject Supplier")
  );
  const rejectPo = await rejectHarness.service.generateFromAward(context, buyer, {
    awardId: rejectAwardId,
  });
  await rejectHarness.service.submit(context, buyer, rejectPo.id);
  await rejectHarness.service.issue(context, buyer, rejectPo.id, {});
  const rejectToken = [...rejectHarness.poStore.tokens.values()].find(
    (row) => row.purchaseOrderId === rejectPo.id
  );
  if (rejectToken) {
    await rejectHarness.service.rejectByToken(rejectToken.accessToken, {
      reason: "Cannot meet delivery date",
    });
    const rejected = await rejectHarness.service.get(context, buyer, rejectPo.id);
    record(results, "AC-005:supplier-reject", rejected.status === PO_STATUSES.REJECTED);
  } else {
    record(results, "AC-005:supplier-reject", false);
  }

  const amendHarness = harness(false);
  const { awardId: amendAwardId } = await seedAwardWithLines(
    amendHarness.sourcingStore,
    amendHarness.prStore,
    "sup-amend"
  );
  amendHarness.prStore.suppliers.set(
    "sup-amend",
    supplierSnapshot("sup-amend", "pty-amend", "Amend Supplier")
  );
  amendHarness.poStore.seedControl("biz-a", {
    requiresApproval: false,
    materialAmendmentThreshold: "1",
  });
  const amendPo = await amendHarness.service.generateFromAward(context, buyer, {
    awardId: amendAwardId,
  });
  await amendHarness.service.submit(context, buyer, amendPo.id);
  await amendHarness.service.issue(context, buyer, amendPo.id, {});
  const line = amendPo.currentVersion?.lines[0];
  await amendHarness.service.amend(context, buyer, amendPo.id, {
    lines: [
      {
        description: line?.description ?? "Laptop bundle",
        quantity: "12",
        unitPrice: line?.unitPrice ?? "100000",
        taxRate: "0",
      },
    ],
  });
  const amended = await amendHarness.service.get(context, buyer, amendPo.id);
  record(
    results,
    "AC-006:amendment-version",
    amended.versions.length === 2 && amended.status === PO_STATUSES.DRAFT
  );

  const blacklistHarness = harness(true);
  blacklistHarness.prStore.suppliers.set(
    "sup-bad",
    supplierSnapshot(
      "sup-bad",
      "pty-bad",
      "Bad Supplier",
      "biz-a",
      PROCUREMENT_STATUS_CODES.BLACKLISTED
    )
  );
  const badAwardId = randomUUID();
  const badEventId = randomUUID();
  blacklistHarness.sourcingStore.events.set(badEventId, {
    id: badEventId,
    businessId: "biz-a",
    eventNumber: "RFX-000002",
    rfxType: "RFQ",
    title: "Blocked",
    status: "AWARDED",
    currencyCode: "KES",
    recommendation: null,
    closesAt: new Date("2026-12-31"),
    originalClosesAt: new Date("2026-12-31"),
    riskLevel: "LOW",
    categoryCode: null,
    openingPolicy: "STANDARD",
    openingPolicySource: "DEFAULT",
    evaluationMethod: "LOWEST_COMPLIANT",
    technicalWeight: "0",
    financialWeight: "100",
    financialBasis: "YEAR_1",
    evaluationStage: "AWARDED",
    committeeConstitutedAt: null,
    committeeConstitutedBy: null,
    criteriaLockedAt: null,
    criteriaLockedBy: null,
    criteriaSnapshotHash: null,
    criteriaSnapshotJson: null,
    awardApprovalStatus: null,
    awardSubmittedAt: null,
    awardSubmittedBy: null,
    awardApprovedAt: null,
    awardApprovedBy: null,
    closedAt: new Date(),
    evaluationStartedAt: new Date(),
    dueDiligenceRequired: false,
    dueDiligenceLocationVerified: true,
    dueDiligenceStaffVerified: true,
    dueDiligenceLegalVerified: true,
    dueDiligenceOtherNotes: null,
    dueDiligenceRecordedAt: new Date(),
    bidsOpenedAt: new Date(),
    bidsOpenedBy: "buyer-1",
    bidsOpeningApprovedBy: null,
    recommendedProfileIds: "sup-bad",
    awardOverrideReason: null,
    createdBy: "buyer-1",
    deletedAt: null,
  });
  blacklistHarness.sourcingStore.awards.push({
    id: badAwardId,
    eventId: badEventId,
    profileId: "sup-bad",
    awardedAmount: "1000",
    allocatedBudgetAmount: "1000",
    winningQuoteId: randomUUID(),
    overrideReason: null,
  });
  blacklistHarness.sourcingStore.awardLines.push({
    id: randomUUID(),
    businessId: "biz-a",
    awardId: badAwardId,
    winningQuoteId: randomUUID(),
    winningQuoteLineId: null,
    sequence: 1,
    description: "Item",
    quantity: "1",
    uom: "EA",
    unitPrice: "1000",
    taxRate: "0",
    lineTotal: "1000",
    currencyCode: "KES",
  });
  const blacklistBlocked = await expectError(
    () => blacklistHarness.service.generateFromAward(context, buyer, { awardId: badAwardId }),
    PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE
  );
  record(results, "AC-007:blacklist-blocked", blacklistBlocked);

  const crossBiz = await expectError(
    () => lifecycle.service.get(ctx("biz-other"), buyer, po.id),
    PROCUREMENT_ERROR_CODES.PO_NOT_FOUND
  );
  record(results, "AC-010:cross-business", crossBiz);

  const sodHarness = harness(true);
  const { awardId: sodAwardId } = await seedAwardWithLines(
    sodHarness.sourcingStore,
    sodHarness.prStore,
    "sup-sod"
  );
  sodHarness.prStore.suppliers.set(
    "sup-sod",
    supplierSnapshot("sup-sod", "pty-sod", "SoD Supplier")
  );
  const sodPo = await sodHarness.service.generateFromAward(context, buyer, { awardId: sodAwardId });
  await sodHarness.service.submit(context, buyer, sodPo.id);
  const selfApprove = await expectError(
    () => sodHarness.service.approve(context, buyer, sodPo.id),
    PROCUREMENT_ERROR_CODES.SELF_APPROVAL
  );
  record(results, "AC-006:sod-self-approve", selfApprove);

  const portalUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/po-supplier-portal.tsx"),
    "utf8"
  );
  record(results, "ui:supplier-portal-actions", portalUi.includes("Accept purchase order"));

  return results;
}

async function main() {
  console.log("BP-009 IP-06 Purchase Order Management — smoke validation\n");
  const results = await runAcceptance();
  const failed = results.filter((row) => !row.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
