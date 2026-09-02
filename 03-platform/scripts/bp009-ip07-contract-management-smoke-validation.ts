/**
 * Purpose:
 * Smoke-validate BP-009 / IP-07 Contract Management.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip07-contract-management-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  PURCHASE_REQUEST_STATUSES,
  QUALIFICATION_STATUS_CODES,
} from "@/modules/procurement";
import {
  CONTRACT_SOURCE_TYPES,
  CONTRACT_STATUSES,
  PO_SOURCE_TYPES,
  PO_STATUSES,
  PURCHASE_REQUEST_ORIGIN_TYPES,
} from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { createProcurementContractWorkflowAdapter } from "@/modules/procurement/adapters/procurement-contract-workflow-adapter";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { InMemoryContractStore } from "@/modules/procurement/services/contract-memory-store";
import { InMemoryPurchaseOrderStore } from "@/modules/procurement/services/purchase-order-memory-store";
import { InMemoryPurchaseRequestStore } from "@/modules/procurement/services/purchase-request-memory-store";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
import { ContractService } from "@/modules/procurement/services/contract-service";
import { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import {
  computeRemainingContractValue,
  deriveExpiryStatus,
  validateContractCommercial,
} from "@/modules/procurement/services/contract-rules";
import type {
  ContractControlRecord,
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  PurchaseRequestInsert,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0087_bp009_ip007_contract_management.sql",
  "src/db/schema/procurement-contract.ts",
  "src/modules/procurement/services/contract-service.ts",
  "src/modules/procurement/repositories/contract-repository.ts",
  "src/app/(authenticated)/(app)/procurement/contracts/page.tsx",
  "src/app/(authenticated)/(app)/procurement/contracts/[contractId]/page.tsx",
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

type HarnessOptions = {
  requiresApproval?: boolean;
  requiresEvidence?: boolean;
  materialThreshold?: string | null;
  directFromPr?: boolean;
};

function harness(options: HarnessOptions = {}) {
  const requiresApproval = options.requiresApproval ?? true;
  const contractStore = new InMemoryContractStore();
  const control: ContractControlRecord = {
    businessId: "biz-a",
    requiresApproval,
    requiresExecutionEvidence: options.requiresEvidence ?? false,
    materialAmendmentThreshold: options.materialThreshold ?? null,
    expiryWarningDays: 90,
    directContractFromPrEnabled: options.directFromPr ?? false,
  };
  contractStore.controlByBusiness.set("biz-a", control);
  const poStore = new InMemoryPurchaseOrderStore();
  poStore.seedControl("biz-a", {
    requiresApproval: false,
    skipRfxEnabled: true,
    skipRfxMaxAmount: "50000000",
  });
  const prStore = new InMemoryPurchaseRequestStore();
  const sourcingStore = new InMemorySourcingStore();
  const audit = new RecordingProcurementAudit();
  const poService = new PurchaseOrderService({
    store: poStore.store,
    sourcing: sourcingStore.store,
    requests: prStore.requestsPort,
    numbering: poStore.numbering,
    audit,
    workflow: createProcurementPoWorkflowAdapter(poStore.controls),
    controls: poStore.controls,
    suggestedSupplier: prStore.suggestedSupplier,
    notifications: createInProcessNotificationAdapter(),
    contracts: contractStore.store,
  });
  const service = new ContractService({
    store: contractStore.store,
    poStore: poStore.store,
    sourcing: sourcingStore.store,
    requests: prStore.requestsPort,
    numbering: contractStore.numbering,
    audit,
    workflow: createProcurementContractWorkflowAdapter(contractStore.controls),
    controls: contractStore.controls,
    suggestedSupplier: prStore.suggestedSupplier,
    notifications: createInProcessNotificationAdapter(),
    purchaseOrders: poService,
  });
  return { contractStore, poStore, prStore, sourcingStore, audit, service, poService };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

function baseContractInput(profileId = "sup-ctr") {
  return {
    profileId,
    contractTypeCode: "FRAMEWORK_AGREEMENT",
    title: "IT Framework",
    description: "Laptop framework",
    currencyCode: "KES",
    valueType: "FIXED" as const,
    totalValue: "1000000",
    startDate: "2026-01-01",
    endDate: "2027-12-31",
    callOffsPermitted: true,
    paymentTerms: [{ milestoneName: "Delivery", percentage: "100" }],
  };
}

async function seedSupplier(prStore: InMemoryPurchaseRequestStore, profileId: string, name: string) {
  prStore.suppliers.set(profileId, supplierSnapshot(profileId, `pty-${profileId}`, name));
}

async function activateContract(
  h: ReturnType<typeof harness>,
  contractId: string,
  buyer = actor("buyer-1"),
  approver = actor("approver-1")
) {
  const context = ctx("biz-a", buyer.userId);
  await h.service.submit(context, buyer, contractId);
  if ((await h.service.get(context, buyer, contractId)).status === CONTRACT_STATUSES.PENDING_APPROVAL) {
    await h.service.approve(ctx("biz-a", approver.userId), approver, contractId);
  }
  const pending = await h.service.get(context, buyer, contractId);
  if (pending.status === CONTRACT_STATUSES.APPROVED) {
    await h.service.markPendingExecution(context, buyer, contractId);
  }
  return h.service.activate(context, buyer, contractId, {
    executionEvidenceDocumentId: "doc-evidence-1",
  });
}

async function seedAward(
  sourcingStore: InMemorySourcingStore,
  prStore: InMemoryPurchaseRequestStore,
  profileId = "sup-award"
) {
  await seedSupplier(prStore, profileId, "Award Supplier");
  const eventId = randomUUID();
  const awardId = randomUUID();
  const quoteId = randomUUID();
  sourcingStore.events.set(eventId, {
    id: eventId,
    businessId: "biz-a",
    eventNumber: "RFX-CTR-001",
    rfxType: "RFQ",
    title: "Framework laptops",
    status: "AWARDED",
    currencyCode: "KES",
    recommendation: null,
    closesAt: new Date("2026-12-31"),
    originalClosesAt: new Date("2026-12-31"),
    riskLevel: "LOW",
    categoryCode: "IT",
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
    awardedAmount: "800000",
    allocatedBudgetAmount: "800000",
    winningQuoteId: quoteId,
    overrideReason: null,
  });
  sourcingStore.quotes.push({
    id: quoteId,
    businessId: "biz-a",
    eventId,
    profileId,
    version: 1,
    amount: "800000",
    currencyCode: "KES",
    status: "SUBMITTED",
    comments: null,
    deliveryLeadDays: 14,
    warrantyNotes: null,
    year1Amount: "800000",
    tcvAmount: "900000",
    tcoAmount: null,
    capturedOnBehalf: false,
    idempotencyKey: null,
    submittedAt: new Date(),
    submittedBy: null,
  });
  return { eventId, awardId, profileId };
}

async function seedApprovedPr(prStore: InMemoryPurchaseRequestStore, profileId = "sup-pr") {
  const id = randomUUID();
  await seedSupplier(prStore, profileId, "PR Supplier");
  await prStore.requestsPort.insert({
    id,
    businessId: "biz-a",
    requestNumber: "PR-CTR-001",
    status: PURCHASE_REQUEST_STATUSES.APPROVED,
    originType: PURCHASE_REQUEST_ORIGIN_TYPES.AD_HOC,
    originReference: null,
    requesterUserId: "buyer-1",
    businessUnitCode: null,
    procurementType: "SERVICES",
    justification: "Managed services",
    requiredDate: "2026-06-01",
    deliveryLocation: "HQ",
    estimatedValue: "250000",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-1",
    budgetLine: null,
    budgetPeriod: null,
    budgetApprovedAmount: "500000",
    budgetAvailableAmount: "400000",
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
    deletedAt: null,
    version: 1,
  } satisfies PurchaseRequestInsert);
  return { id, profileId };
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const context = ctx("biz-a");
  const buyer = actor("buyer-1");
  const approver = actor("approver-1");

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "architecture:no-supplier-master", scan.supplierMaster.length === 0);
  record(results, "architecture:no-client-businessId", scan.clientBusinessId.length === 0);

  try {
    validateContractCommercial({
      valueType: "FIXED",
      totalValue: "1000",
      currencyCode: "KES",
      paymentTerms: [{ milestoneName: "Delivery", percentage: "100" }],
    });
    record(results, "rules:commercial-valid", true);
  } catch {
    record(results, "rules:commercial-valid", false);
  }

  const remainingResult = computeRemainingContractValue({
    valueType: "FIXED",
    ceiling: "1000",
    committedAmounts: ["300", "200"],
  });
  record(results, "rules:remaining-value", remainingResult.remaining === "500.00");

  const expiring = deriveExpiryStatus(CONTRACT_STATUSES.ACTIVE, "2026-04-01", 90);
  record(results, "rules:expiry-derivation", expiring === CONTRACT_STATUSES.EXPIRING || expiring === CONTRACT_STATUSES.EXPIRED);

  const noPerm = harness();
  await seedSupplier(noPerm.prStore, "sup-ctr", "Contract Supplier");
  const denied = await expectError(
    () =>
      noPerm.service.create(context, actor("buyer-1", [PROCUREMENT_PERMISSIONS.CONTRACT_READ]), {
        ...baseContractInput("sup-ctr"),
      }),
    PROCUREMENT_ERROR_CODES.UNAUTHORIZED
  );
  record(results, "AC-001:permission-create", denied);

  const createHarness = harness({ requiresApproval: true, requiresEvidence: false });
  await seedSupplier(createHarness.prStore, "sup-ctr", "Contract Supplier");
  const created = await createHarness.service.create(context, buyer, baseContractInput("sup-ctr"));
  record(
    results,
    "AC-002:manual-create",
    created.status === CONTRACT_STATUSES.DRAFT && created.contractNumber.startsWith("CTR-")
  );
  record(
    results,
    "AC-002:audit-created",
    createHarness.audit.entries.some((e) => e.action === PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CREATED)
  );

  const lifecycleHarness = harness({ requiresApproval: true, requiresEvidence: false });
  await seedSupplier(lifecycleHarness.prStore, "sup-life", "Lifecycle Supplier");
  const lifeContract = await lifecycleHarness.service.create(
    context,
    buyer,
    baseContractInput("sup-life")
  );
  await lifecycleHarness.service.submit(context, buyer, lifeContract.id);
  const pending = await lifecycleHarness.service.get(context, buyer, lifeContract.id);
  record(results, "AC-003:submit-pending", pending.status === CONTRACT_STATUSES.PENDING_APPROVAL);
  await lifecycleHarness.service.approve(ctx("biz-a", approver.userId), approver, lifeContract.id);
  const approved = await lifecycleHarness.service.get(context, buyer, lifeContract.id);
  record(
    results,
    "AC-003:approve-pending-execution",
    approved.status === CONTRACT_STATUSES.PENDING_EXECUTION
  );
  const active = await lifecycleHarness.service.activate(context, buyer, lifeContract.id, {});
  record(results, "AC-004:activate", active.status === CONTRACT_STATUSES.ACTIVE);

  const sodHarness = harness({ requiresApproval: true });
  await seedSupplier(sodHarness.prStore, "sup-sod", "SoD Supplier");
  const sodContract = await sodHarness.service.create(context, buyer, baseContractInput("sup-sod"));
  await sodHarness.service.submit(context, buyer, sodContract.id);
  const selfApprove = await expectError(
    () => sodHarness.service.approve(context, buyer, sodContract.id),
    PROCUREMENT_ERROR_CODES.SELF_APPROVAL
  );
  record(results, "AC-005:self-approval-blocked", selfApprove);

  const rejectHarness = harness({ requiresApproval: true });
  await seedSupplier(rejectHarness.prStore, "sup-rej", "Reject Supplier");
  const rejectContract = await rejectHarness.service.create(
    context,
    buyer,
    baseContractInput("sup-rej")
  );
  await rejectHarness.service.submit(context, buyer, rejectContract.id);
  const rejected = await rejectHarness.service.reject(ctx("biz-a", approver.userId), approver, rejectContract.id, {
    reason: "Commercial terms unacceptable",
  });
  record(results, "AC-006:reject", rejected.status === CONTRACT_STATUSES.REJECTED);

  const awardHarness = harness({ requiresApproval: false, requiresEvidence: false });
  const { awardId } = await seedAward(awardHarness.sourcingStore, awardHarness.prStore);
  const fromAward = await awardHarness.service.generateFromAward(context, buyer, { awardId });
  record(
    results,
    "AC-007:generate-from-award",
    fromAward.sourceType === CONTRACT_SOURCE_TYPES.AWARD && fromAward.awardId === awardId
  );
  const duplicate = await expectError(
    () => awardHarness.service.generateFromAward(context, buyer, { awardId }),
    PROCUREMENT_ERROR_CODES.CONTRACT_ALREADY_EXISTS
  );
  record(results, "AC-007:duplicate-award-blocked", duplicate);

  const prHarness = harness({ directFromPr: false });
  const { id: prId } = await seedApprovedPr(prHarness.prStore);
  const prBlocked = await expectError(
    () => prHarness.service.generateFromPurchaseRequest(context, buyer, { purchaseRequestId: prId }),
    PROCUREMENT_ERROR_CODES.DIRECT_CONTRACT_NOT_ALLOWED
  );
  record(results, "AC-008:direct-pr-policy", prBlocked);

  const prEnabledHarness = harness({ directFromPr: true, requiresApproval: false, requiresEvidence: false });
  const { id: enabledPrId } = await seedApprovedPr(prEnabledHarness.prStore, "sup-pr2");
  const fromPr = await prEnabledHarness.service.generateFromPurchaseRequest(context, buyer, {
    purchaseRequestId: enabledPrId,
  });
  record(
    results,
    "AC-008:generate-from-pr",
    fromPr.sourceType === CONTRACT_SOURCE_TYPES.PURCHASE_REQUEST && fromPr.purchaseRequestId === enabledPrId
  );

  const amendHarness = harness({ requiresApproval: false, requiresEvidence: false, materialThreshold: "10000" });
  await seedSupplier(amendHarness.prStore, "sup-amend", "Amend Supplier");
  const amendContract = await amendHarness.service.create(context, buyer, baseContractInput("sup-amend"));
  await activateContract(amendHarness, amendContract.id);
  const amended = await amendHarness.service.amend(context, buyer, amendContract.id, {
    changeReason: "Increase scope",
    totalValue: "2000000",
  });
  record(
    results,
    "AC-009:material-amendment",
    amended.status === CONTRACT_STATUSES.PENDING_APPROVAL && amended.versions.length === 2
  );

  const callOffHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(callOffHarness.prStore, "sup-call", "Call-off Supplier");
  const callContract = await callOffHarness.service.create(context, buyer, {
    ...baseContractInput("sup-call"),
    totalValue: "500000",
  });
  await activateContract(callOffHarness, callContract.id);
  const po = await callOffHarness.service.createCallOff(context, buyer, callContract.id, {
    description: "Q1 laptops",
    amount: "100000",
    callOffReference: "CO-001",
  });
  record(
    results,
    "AC-010:call-off-po",
    po.sourceType === PO_SOURCE_TYPES.CONTRACT_CALLOFF && po.contractId === callContract.id
  );
  record(
    results,
    "AC-010:call-off-audit",
    callOffHarness.audit.entries.some((e) => e.action === PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CALLOFF_CREATED)
  );

  const ceilingHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(ceilingHarness.prStore, "sup-ceil", "Ceiling Supplier");
  const ceilContract = await ceilingHarness.service.create(context, buyer, {
    ...baseContractInput("sup-ceil"),
    totalValue: "200000",
  });
  await activateContract(ceilingHarness, ceilContract.id);
  const firstPo = await ceilingHarness.service.createCallOff(context, buyer, ceilContract.id, {
    description: "First tranche",
    amount: "120000",
  });
  await ceilingHarness.poService.submit(context, buyer, firstPo.id);
  await ceilingHarness.poService.approve(context, buyer, firstPo.id);
  const overCeiling = await expectError(
    () =>
      ceilingHarness.service.createCallOff(context, buyer, ceilContract.id, {
        description: "Over ceiling",
        amount: "100000",
      }),
    PROCUREMENT_ERROR_CODES.CONTRACT_CEILING_EXCEEDED
  );
  record(results, "AC-011:ceiling-enforced", overCeiling);

  const remainingHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(remainingHarness.prStore, "sup-rem", "Remaining Supplier");
  const remContract = await remainingHarness.service.create(context, buyer, {
    ...baseContractInput("sup-rem"),
    totalValue: "300000",
  });
  await activateContract(remainingHarness, remContract.id);
  const remPo = await remainingHarness.service.createCallOff(context, buyer, remContract.id, {
    description: "Partial",
    amount: "50000",
  });
  await remainingHarness.poService.submit(context, buyer, remPo.id);
  await remainingHarness.poService.approve(context, buyer, remPo.id);
  const rem = await remainingHarness.service.getRemainingValue(context, remContract.id);
  record(results, "AC-012:remaining-value", rem.remaining === "250000.00");

  const suspendHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(suspendHarness.prStore, "sup-sus", "Suspend Supplier");
  const susContract = await suspendHarness.service.create(context, buyer, baseContractInput("sup-sus"));
  await activateContract(suspendHarness, susContract.id);
  const suspended = await suspendHarness.service.suspend(context, buyer, susContract.id, {
    reason: "Supplier under review",
  });
  record(results, "AC-013:suspend", suspended.status === CONTRACT_STATUSES.SUSPENDED);

  const terminateHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(terminateHarness.prStore, "sup-term", "Terminate Supplier");
  const termContract = await terminateHarness.service.create(context, buyer, baseContractInput("sup-term"));
  await activateContract(terminateHarness, termContract.id);
  const terminated = await terminateHarness.service.terminate(context, buyer, termContract.id, {
    reason: "Mutual exit",
  });
  record(results, "AC-014:terminate", terminated.status === CONTRACT_STATUSES.TERMINATED);

  const closeHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(closeHarness.prStore, "sup-close", "Close Supplier");
  const closeContract = await closeHarness.service.create(context, buyer, {
    ...baseContractInput("sup-close"),
    startDate: "2024-01-01",
    endDate: "2025-12-31",
  });
  await activateContract(closeHarness, closeContract.id);
  await closeHarness.service.refreshExpiryStatus(context, buyer, closeContract.id);
  const closed = await closeHarness.service.close(context, buyer, closeContract.id, {
    reason: "Completed",
  });
  record(results, "AC-015:close", closed.status === CONTRACT_STATUSES.CLOSED);

  const listHarness = harness({ requiresApproval: false, requiresEvidence: false });
  await seedSupplier(listHarness.prStore, "sup-list", "List Supplier");
  await listHarness.service.create(context, buyer, baseContractInput("sup-list"));
  const listed = await listHarness.service.list(context, buyer, { profileId: "sup-list" });
  record(results, "AC-016:list-filter", listed.length === 1);

  const evidenceHarness = harness({ requiresApproval: false, requiresEvidence: true });
  await seedSupplier(evidenceHarness.prStore, "sup-ev", "Evidence Supplier");
  const evContract = await evidenceHarness.service.create(context, buyer, baseContractInput("sup-ev"));
  await evidenceHarness.service.submit(context, buyer, evContract.id);
  const evidenceBlocked = await expectError(
    () => evidenceHarness.service.activate(context, buyer, evContract.id, {}),
    PROCUREMENT_ERROR_CODES.CONTRACT_EXECUTION_EVIDENCE_REQUIRED
  );
  record(results, "AC-017:execution-evidence", evidenceBlocked);

  const workspaceUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/contract-workspace.tsx"),
    "utf8"
  );
  record(results, "ui:contract-workspace", workspaceUi.includes("Create call-off purchase order"));

  const navConfig = readFileSync(path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"), "utf8");
  record(results, "nav:contracts-route", navConfig.includes("/procurement/contracts"));

  return results;
}

async function main() {
  console.log("BP-009 IP-07 Contract Management — smoke validation\n");
  const results = await runAcceptance();
  const failed = results.filter((row) => !row.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
