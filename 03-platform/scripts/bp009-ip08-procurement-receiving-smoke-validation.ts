/**
 * Purpose:
 * Smoke-validate BP-009 / IP-08 Procurement Receiving & Fulfilment Handoff.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip08-procurement-receiving-smoke-validation.ts
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
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  QUALIFICATION_STATUS_CODES,
} from "@/modules/procurement";
import {
  DISCREPANCY_TYPES,
  INSPECTION_STATUSES,
  LINE_FULFILMENT_STATUSES,
  OVER_RECEIPT_POLICIES,
  PO_FULFILMENT_STATUSES,
  PO_LINE_TYPES,
  PO_SOURCE_TYPES,
  PO_STATUSES,
  PO_VERSION_STATUSES,
  PROCUREMENT_PERMISSIONS,
  RECEIPT_HANDOFF_STATUSES,
  RECEIPT_STATUSES,
  RECEIPT_TYPES,
} from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import {
  InProcessAssetHandoffAdapter,
  InProcessInventoryHandoffAdapter,
} from "@/modules/procurement/adapters/procurement-inventory-handoff-adapter";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { InMemoryPurchaseOrderStore } from "@/modules/procurement/services/purchase-order-memory-store";
import { InMemoryPurchaseRequestStore } from "@/modules/procurement/services/purchase-request-memory-store";
import { InMemoryReceivingStore } from "@/modules/procurement/services/receiving-memory-store";
import { ReceivingService } from "@/modules/procurement/services/receiving-service";
import { computeOutstandingQuantity } from "@/modules/procurement/services/receiving-rules";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
import { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  PoLineRecord,
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  ReceivingControlRecord,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0088_bp009_ip008_procurement_receiving.sql",
  "src/db/schema/procurement-receiving.ts",
  "src/modules/procurement/services/receiving-service.ts",
  "src/modules/procurement/repositories/receiving-repository.ts",
  "src/app/(authenticated)/(app)/procurement/receiving/page.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string, userId = "receiver-1"): CurrentBusinessContext {
  return { businessId, platformUserId: userId, businessMembershipId: `mem-${businessId}` };
}

function actor(userId = "receiver-1", permissions = ALL_PROCUREMENT_PERMISSIONS): ProcurementActor {
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
    createdBy: "receiver-1",
    updatedAt: new Date(),
    updatedBy: "receiver-1",
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
      createdBy: "receiver-1",
      updatedAt: new Date(),
      updatedBy: "receiver-1",
      deletedAt: null,
      version: 1,
      evidenceDocumentIds: [],
    },
  };
}

type HarnessOptions = {
  overReceiptPolicy?: string;
  requiresReceiptConfirmation?: boolean;
  requiresSupplierAcceptance?: boolean;
};

type Harness = ReturnType<typeof harness>;

function harness(options: HarnessOptions = {}) {
  const receivingStore = new InMemoryReceivingStore();
  receivingStore.seedControl("biz-a", {
    requiresSupplierAcceptance: options.requiresSupplierAcceptance ?? true,
    overReceiptPolicy: options.overReceiptPolicy ?? OVER_RECEIPT_POLICIES.BLOCK,
    requiresReceiptConfirmation: options.requiresReceiptConfirmation ?? false,
  });
  const poStore = new InMemoryPurchaseOrderStore();
  poStore.seedControl("biz-a", {
    requiresApproval: false,
    skipRfxEnabled: true,
    skipRfxMaxAmount: "50000000",
  });
  const prStore = new InMemoryPurchaseRequestStore();
  const sourcingStore = new InMemorySourcingStore();
  const audit = new RecordingProcurementAudit();
  const inventoryHandoff = new InProcessInventoryHandoffAdapter();
  const assetHandoff = new InProcessAssetHandoffAdapter();
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
  });
  const service = new ReceivingService({
    store: receivingStore.store,
    poStore: poStore.store,
    controls: receivingStore.controls,
    numbering: receivingStore.numbering,
    audit,
    suggestedSupplier: prStore.suggestedSupplier,
    inventoryHandoff,
    assetHandoff,
    purchaseOrders: poService,
  });
  return {
    receivingStore,
    poStore,
    prStore,
    sourcingStore,
    audit,
    service,
    poService,
    inventoryHandoff,
    assetHandoff,
  };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

type SeedPoLine = {
  lineType?: string;
  quantity?: string;
  description?: string;
};

type SeedPoOptions = {
  status?: string;
  lines?: SeedPoLine[];
};

async function seedAcceptedPo(h: Harness, options: SeedPoOptions = {}) {
  const profileId = "sup-rcv";
  h.prStore.suppliers.set(
    profileId,
    supplierSnapshot(profileId, `pty-${profileId}`, "Receiving Supplier")
  );
  const poId = randomUUID();
  const versionId = randomUUID();
  const status = options.status ?? PO_STATUSES.ACCEPTED;
  const lineSpecs = options.lines ?? [{ lineType: PO_LINE_TYPES.INVENTORY, quantity: "100" }];
  const totalQty = lineSpecs.reduce((sum, row) => sum + Number(row.quantity ?? "100"), 0);
  const totalAmount = String(totalQty * 1000);

  await h.poStore.store.insert({
    id: poId,
    businessId: "biz-a",
    poNumber: `PO-${poId.slice(0, 8)}`,
    profileId,
    sourceType: PO_SOURCE_TYPES.DIRECT,
    purchaseRequestId: null,
    sourcingEventId: null,
    awardId: null,
    contractId: null,
    contractVersionId: null,
    callOffReference: null,
    winningQuoteId: null,
    currencyCode: "KES",
    status,
    currentVersionId: versionId,
    acceptedVersionId: status === PO_STATUSES.ACCEPTED ? versionId : null,
    subtotalAmount: totalAmount,
    taxAmount: "0",
    totalAmount,
    year1Amount: null,
    tcvAmount: null,
    tcoAmount: null,
    deliveryLocation: "HQ",
    warrantyNotes: null,
    termsAndConditions: null,
    submittedAt: new Date(),
    submittedBy: "receiver-1",
    approvedAt: new Date(),
    approvedBy: "approver-1",
    issuedAt: new Date(),
    issuedBy: "receiver-1",
    acceptedAt: status === PO_STATUSES.ACCEPTED ? new Date() : null,
    cancelledAt: status === PO_STATUSES.CANCELLED ? new Date() : null,
    cancelledBy: status === PO_STATUSES.CANCELLED ? "receiver-1" : null,
    cancellationReason: status === PO_STATUSES.CANCELLED ? "Test cancellation" : null,
    closedAt: null,
    closedBy: null,
    closureReason: null,
    issueIdempotencyKey: null,
    createdBy: "receiver-1",
    updatedBy: "receiver-1",
  });

  const versionStatus =
    status === PO_STATUSES.ACCEPTED ? PO_VERSION_STATUSES.ACCEPTED : PO_VERSION_STATUSES.DRAFT;

  await h.poStore.store.insertVersion({
    id: versionId,
    businessId: "biz-a",
    purchaseOrderId: poId,
    versionNumber: 1,
    status: versionStatus,
    subtotalAmount: totalAmount,
    taxAmount: "0",
    totalAmount,
    year1Amount: null,
    tcvAmount: null,
    tcoAmount: null,
    promisedDeliveryDate: null,
    warrantyNotes: null,
    termsAndConditions: null,
    issuedAt: status === PO_STATUSES.ACCEPTED ? new Date() : null,
    issuedBy: status === PO_STATUSES.ACCEPTED ? "receiver-1" : null,
    supersededAt: null,
    createdBy: "receiver-1",
  });

  const lines = await h.poStore.store.insertLines(
    "biz-a",
    versionId,
    lineSpecs.map((spec, index) => {
      const quantity = spec.quantity ?? "100";
      const lineTotal = String(Number(quantity) * 1000);
      return {
        sequence: index + 1,
        description: spec.description ?? `${spec.lineType ?? PO_LINE_TYPES.INVENTORY} item`,
        quantity,
        uom: "EA",
        unitPrice: "1000",
        taxRate: "0",
        lineSubtotal: lineTotal,
        lineTax: "0",
        lineTotal,
        promisedDeliveryDate: null,
        deliveryLocation: "HQ",
        comments: null,
        lineType: spec.lineType ?? PO_LINE_TYPES.INVENTORY,
        awardLineId: null,
        quoteLineId: null,
        purchaseRequestLineId: null,
        catalogueItemId: null,
      };
    })
  );

  return { poId, versionId, lines, profileId };
}

function inventoryLine(lines: PoLineRecord[]) {
  return lines.find((row) => row.lineType === PO_LINE_TYPES.INVENTORY) ?? lines[0]!;
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const context = ctx("biz-a");
  const buyer = actor("receiver-1");

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "architecture:no-supplier-master", scan.supplierMaster.length === 0);
  record(results, "architecture:no-client-businessId", scan.clientBusinessId.length === 0);

  record(
    results,
    "rules:outstanding-quantity",
    computeOutstandingQuantity("100", ["30", "20"]) === "50"
  );

  const controlHarness = harness();
  const control = controlHarness.receivingStore.controlByBusiness.get("biz-a") as ReceivingControlRecord;
  record(results, "control:requires-supplier-acceptance", control.requiresSupplierAcceptance === true);

  const acceptedHarness = harness();
  const acceptedPo = await seedAcceptedPo(acceptedHarness);
  const inventoryPoLine = inventoryLine(acceptedPo.lines);
  const acceptedReceipt = await acceptedHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: acceptedPo.poId,
    lines: [{ poLineId: inventoryPoLine.id, quantityReceived: "25" }],
  });
  record(
    results,
    "AC-001:receipt-against-accepted-po",
    acceptedReceipt.status === RECEIPT_STATUSES.CONFIRMED &&
      acceptedReceipt.receiptType === RECEIPT_TYPES.GOODS_RECEIPT
  );
  record(
    results,
    "AC-001:receipt-number-allocated",
    acceptedReceipt.receiptNumber.startsWith("GREC-")
  );

  const draftHarness = harness();
  const draftPo = await seedAcceptedPo(draftHarness, { status: PO_STATUSES.DRAFT });
  const draftBlocked = await expectError(
    () =>
      draftHarness.service.createReceipt(context, buyer, {
        purchaseOrderId: draftPo.poId,
        lines: [{ poLineId: inventoryLine(draftPo.lines).id, quantityReceived: "1" }],
      }),
    PROCUREMENT_ERROR_CODES.PO_NOT_RECEIVABLE
  );
  record(results, "AC-002:draft-po-blocked", draftBlocked);

  const cancelledHarness = harness();
  const cancelledPo = await seedAcceptedPo(cancelledHarness, { status: PO_STATUSES.CANCELLED });
  const cancelledBlocked = await expectError(
    () =>
      cancelledHarness.service.createReceipt(context, buyer, {
        purchaseOrderId: cancelledPo.poId,
        lines: [{ poLineId: inventoryLine(cancelledPo.lines).id, quantityReceived: "1" }],
      }),
    PROCUREMENT_ERROR_CODES.PO_NOT_RECEIVABLE
  );
  record(results, "AC-003:cancelled-po-blocked", cancelledBlocked);

  const partialHarness = harness();
  const partialPo = await seedAcceptedPo(partialHarness);
  const partialLine = inventoryLine(partialPo.lines);
  await partialHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: partialPo.poId,
    lines: [{ poLineId: partialLine.id, quantityReceived: "40" }],
  });
  const partialSummary = await partialHarness.service.getPOFulfilmentSummary(
    context,
    buyer,
    partialPo.poId
  );
  const partialLineSummary = partialSummary.lines.find((row) => row.poLineId === partialLine.id);
  record(
    results,
    "AC-004:partial-receipt-outstanding",
    partialLineSummary?.outstandingQuantity === "60" &&
      partialLineSummary.fulfilmentStatus === LINE_FULFILMENT_STATUSES.PARTIALLY_FULFILLED
  );
  record(
    results,
    "AC-004:po-partial-status",
    partialSummary.fulfilmentStatus === PO_FULFILMENT_STATUSES.PARTIALLY_FULFILLED
  );

  const fullHarness = harness();
  const fullPo = await seedAcceptedPo(fullHarness);
  const fullLine = inventoryLine(fullPo.lines);
  await fullHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: fullPo.poId,
    lines: [{ poLineId: fullLine.id, quantityReceived: "40" }],
  });
  await fullHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: fullPo.poId,
    lines: [{ poLineId: fullLine.id, quantityReceived: "60" }],
  });
  const fullSummary = await fullHarness.service.getPOFulfilmentSummary(context, buyer, fullPo.poId);
  const fullLineSummary = fullSummary.lines.find((row) => row.poLineId === fullLine.id);
  const fullPoView = await fullHarness.poService.get(context, buyer, fullPo.poId);
  record(
    results,
    "AC-005:multiple-receipts-fulfilled",
    fullLineSummary?.fulfilmentStatus === LINE_FULFILMENT_STATUSES.FULFILLED &&
      fullSummary.fulfilmentStatus === PO_FULFILMENT_STATUSES.FULFILLED
  );
  record(results, "AC-005:po-fulfilled-status", fullPoView.status === PO_STATUSES.FULFILLED);

  const overBlockHarness = harness({ overReceiptPolicy: OVER_RECEIPT_POLICIES.BLOCK });
  const overBlockPo = await seedAcceptedPo(overBlockHarness);
  const overBlockLine = inventoryLine(overBlockPo.lines);
  const overBlocked = await expectError(
    () =>
      overBlockHarness.service.createReceipt(context, buyer, {
        purchaseOrderId: overBlockPo.poId,
        lines: [{ poLineId: overBlockLine.id, quantityReceived: "110" }],
      }),
    PROCUREMENT_ERROR_CODES.OVER_RECEIPT_BLOCKED
  );
  record(results, "AC-006:over-receipt-blocked", overBlocked);

  const overAllowHarness = harness({ overReceiptPolicy: OVER_RECEIPT_POLICIES.ALLOW_EXCEPTION });
  const overAllowPo = await seedAcceptedPo(overAllowHarness);
  const overAllowLine = inventoryLine(overAllowPo.lines);
  const overAllowed = await overAllowHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: overAllowPo.poId,
    lines: [{ poLineId: overAllowLine.id, quantityReceived: "110" }],
  });
  record(results, "AC-007:over-receipt-allowed", overAllowed.status === RECEIPT_STATUSES.CONFIRMED);
  record(results, "AC-007:over-delivery-flagged", overAllowed.overDeliveryFlag === true);

  const handoffHarness = harness();
  const handoffPo = await seedAcceptedPo(handoffHarness);
  const handoffLine = inventoryLine(handoffPo.lines);
  const handoffReceipt = await handoffHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: handoffPo.poId,
    lines: [{ poLineId: handoffLine.id, quantityReceived: "10" }],
  });
  const handoffViewLine = handoffReceipt.lines[0];
  record(
    results,
    "AC-008:goods-handoff-reference",
    handoffViewLine?.handoff?.status === RECEIPT_HANDOFF_STATUSES.SUCCEEDED &&
      Boolean(handoffViewLine.handoff.downstreamReference?.startsWith("INV-MOV-"))
  );
  record(
    results,
    "AC-008:goods-handoff-downstream",
    handoffViewLine?.handoff?.downstreamSystem === "BP-008"
  );

  const failHarness = harness();
  failHarness.inventoryHandoff.failNext = true;
  const failPo = await seedAcceptedPo(failHarness);
  const failLine = inventoryLine(failPo.lines);
  const failedReceipt = await failHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: failPo.poId,
    lines: [{ poLineId: failLine.id, quantityReceived: "5" }],
  });
  const failedHandoff = failedReceipt.lines[0]?.handoff;
  record(
    results,
    "AC-009:handoff-failure-status",
    failedHandoff?.status === RECEIPT_HANDOFF_STATUSES.FAILED
  );
  record(
    results,
    "AC-009:handoff-failure-audit",
    failHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.GOODS_HANDOFF_FAILED)
  );

  const idemHarness = harness({ requiresReceiptConfirmation: true });
  const idemPo = await seedAcceptedPo(idemHarness);
  const idemLine = inventoryLine(idemPo.lines);
  const idemReceipt = await idemHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: idemPo.poId,
    lines: [{ poLineId: idemLine.id, quantityReceived: "8" }],
  });
  record(results, "AC-010:draft-before-confirm", idemReceipt.status === RECEIPT_STATUSES.DRAFT);
  const counterBefore = idemHarness.inventoryHandoff.movementCounter;
  await idemHarness.service.confirmReceipt(context, buyer, idemReceipt.id);
  const counterAfterFirst = idemHarness.inventoryHandoff.movementCounter;
  await idemHarness.service.confirmReceipt(context, buyer, idemReceipt.id);
  record(
    results,
    "AC-010:handoff-idempotency-counter",
    counterAfterFirst === counterBefore + 1 && idemHarness.inventoryHandoff.movementCounter === counterAfterFirst
  );
  const idemConfirmed = await idemHarness.service.get(context, buyer, idemReceipt.id);
  record(results, "AC-010:duplicate-confirm-safe", idemConfirmed.status === RECEIPT_STATUSES.CONFIRMED);

  const assetHarness = harness();
  const assetPo = await seedAcceptedPo(assetHarness, {
    lines: [{ lineType: PO_LINE_TYPES.ASSET, quantity: "2", description: "Server rack" }],
  });
  const assetLine = inventoryLine(assetPo.lines);
  const inventoryCounterBefore = assetHarness.inventoryHandoff.movementCounter;
  const assetReceipt = await assetHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: assetPo.poId,
    assetCondition: "NEW",
    lines: [{ poLineId: assetLine.id, quantityReceived: "2" }],
  });
  const assetHandoffView = assetReceipt.lines[0]?.handoff;
  record(
    results,
    "AC-011:asset-handoff-reference",
    assetReceipt.receiptType === RECEIPT_TYPES.ASSET_RECEIPT &&
      assetHandoffView?.downstreamReference?.startsWith("AST-HO-") === true
  );
  record(
    results,
    "AC-011:no-inventory-handoff",
    assetHarness.inventoryHandoff.movementCounter === inventoryCounterBefore
  );
  record(
    results,
    "AC-011:asset-handoff-succeeded",
    assetHandoffView?.status === RECEIPT_HANDOFF_STATUSES.SUCCEEDED
  );

  const serviceHarness = harness();
  const servicePo = await seedAcceptedPo(serviceHarness, {
    lines: [{ lineType: PO_LINE_TYPES.SERVICE, quantity: "1", description: "Managed support" }],
  });
  const serviceLine = inventoryLine(servicePo.lines);
  const servicePeriodMissing = await expectError(
    () =>
      serviceHarness.service.createReceipt(context, buyer, {
        purchaseOrderId: servicePo.poId,
        lines: [{ poLineId: serviceLine.id, quantityReceived: "1" }],
      }),
    PROCUREMENT_ERROR_CODES.INVALID_INPUT
  );
  record(results, "AC-012:service-period-required", servicePeriodMissing);
  const inventoryBeforeService = serviceHarness.inventoryHandoff.movementCounter;
  const serviceReceipt = await serviceHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: servicePo.poId,
    servicePeriodStart: "2026-01-01",
    servicePeriodEnd: "2026-01-31",
    lines: [{ poLineId: serviceLine.id, quantityReceived: "1" }],
  });
  record(
    results,
    "AC-012:service-confirmation",
    serviceReceipt.receiptType === RECEIPT_TYPES.SERVICE_CONFIRMATION &&
      serviceReceipt.status === RECEIPT_STATUSES.CONFIRMED
  );
  record(
    results,
    "AC-012:service-no-handoff",
    serviceReceipt.lines.every((row) => row.handoff === null) &&
      serviceHarness.inventoryHandoff.movementCounter === inventoryBeforeService
  );
  record(
    results,
    "AC-012:service-audit",
    serviceHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.SERVICE_CONFIRMED)
  );

  const inspectHarness = harness();
  const inspectPo = await seedAcceptedPo(inspectHarness);
  const inspectLine = inventoryLine(inspectPo.lines);
  const inspectReceipt = await inspectHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: inspectPo.poId,
    lines: [{ poLineId: inspectLine.id, quantityReceived: "3" }],
  });
  const passed = await inspectHarness.service.recordInspection(context, buyer, inspectReceipt.id, {
    inspectionStatus: INSPECTION_STATUSES.PASSED,
    inspectionNotes: "All items acceptable",
  });
  record(results, "AC-013:inspection-passed", passed.inspectionStatus === INSPECTION_STATUSES.PASSED);

  const failedInspectHarness = harness();
  const failedInspectPo = await seedAcceptedPo(failedInspectHarness);
  const failedInspectLine = inventoryLine(failedInspectPo.lines);
  const failedInspectReceipt = await failedInspectHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: failedInspectPo.poId,
    lines: [{ poLineId: failedInspectLine.id, quantityReceived: "3" }],
  });
  const failedInspection = await failedInspectHarness.service.recordInspection(
    context,
    buyer,
    failedInspectReceipt.id,
    {
      inspectionStatus: INSPECTION_STATUSES.FAILED,
      inspectionNotes: "Damaged packaging",
    }
  );
  record(results, "AC-014:inspection-failed", failedInspection.inspectionStatus === INSPECTION_STATUSES.FAILED);

  const discrepancyHarness = harness();
  const discrepancyPo = await seedAcceptedPo(discrepancyHarness);
  const discrepancyLine = inventoryLine(discrepancyPo.lines);
  const discrepancyReceipt = await discrepancyHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: discrepancyPo.poId,
    lines: [{ poLineId: discrepancyLine.id, quantityReceived: "7" }],
  });
  const receiptLineId = discrepancyReceipt.lines[0]?.id;
  if (!receiptLineId) {
    record(results, "AC-015:discrepancy-recorded", false, "missing receipt line");
  } else {
    const withDiscrepancy = await discrepancyHarness.service.recordDiscrepancy(
      context,
      buyer,
      discrepancyReceipt.id,
      {
        receiptLineId,
        discrepancyType: DISCREPANCY_TYPES.SHORT_DELIVERY,
        discrepancyDescription: "Two units missing",
        damageFlag: false,
      }
    );
    record(
      results,
      "AC-015:discrepancy-recorded",
      withDiscrepancy.lines[0]?.discrepancyType === DISCREPANCY_TYPES.SHORT_DELIVERY
    );
    record(
      results,
      "AC-015:discrepancy-audit",
      discrepancyHarness.audit.entries.some(
        (entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.DISCREPANCY_RECORDED
      )
    );
  }

  const crossHarness = harness();
  const crossPo = await seedAcceptedPo(crossHarness);
  const crossLine = inventoryLine(crossPo.lines);
  const crossReceipt = await crossHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: crossPo.poId,
    lines: [{ poLineId: crossLine.id, quantityReceived: "1" }],
  });
  const crossBlocked = await expectError(
    () => crossHarness.service.get(ctx("biz-other"), buyer, crossReceipt.id),
    PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND
  );
  record(results, "AC-016:cross-business-blocked", crossBlocked);

  const authHarness = harness();
  const authPo = await seedAcceptedPo(authHarness);
  const authLine = inventoryLine(authPo.lines);
  const unauthorized = await expectError(
    () =>
      authHarness.service.createReceipt(context, actor("receiver-1", [PROCUREMENT_PERMISSIONS.RECEIVING_READ]), {
        purchaseOrderId: authPo.poId,
        lines: [{ poLineId: authLine.id, quantityReceived: "1" }],
      }),
    PROCUREMENT_ERROR_CODES.UNAUTHORIZED
  );
  record(results, "AC-017:unauthorized-blocked", unauthorized);

  const auditHarness = harness();
  const auditPo = await seedAcceptedPo(auditHarness);
  const auditLine = inventoryLine(auditPo.lines);
  await auditHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: auditPo.poId,
    lines: [{ poLineId: auditLine.id, quantityReceived: "4" }],
  });
  record(
    results,
    "audit:receipt-created",
    auditHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.RECEIPT_CREATED)
  );
  record(
    results,
    "audit:receipt-confirmed",
    auditHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.RECEIPT_CONFIRMED)
  );
  record(
    results,
    "audit:goods-handoff",
    auditHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.GOODS_HANDOFF_SUCCEEDED)
  );

  const receivingSource = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/receiving-service.ts"),
    "utf8"
  ).toLowerCase();
  const forbidden = ["invoice", "generalledger", "glaccount", "accountspayable"];
  record(
    results,
    "boundary:no-invoice-gl-fields",
    !forbidden.some((token) => receivingSource.includes(token))
  );

  const listHarness = harness();
  const listPo = await seedAcceptedPo(listHarness);
  const listLine = inventoryLine(listPo.lines);
  await listHarness.service.createReceipt(context, buyer, {
    purchaseOrderId: listPo.poId,
    lines: [{ poLineId: listLine.id, quantityReceived: "2" }],
  });
  const listed = await listHarness.service.list(context, buyer);
  record(results, "AC-018:receipt-list", listed.length >= 1);

  const workspaceUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/receiving-workspace.tsx"),
    "utf8"
  );
  const receivingListUi = readFileSync(
    path.join(ROOT, "src/modules/procurement/components/receiving-list.tsx"),
    "utf8"
  );
  record(
    results,
    "ui:receiving-workspace",
    workspaceUi.includes("Receipt details") && receivingListUi.includes("fulfilment")
  );

  const navConfig = readFileSync(path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"), "utf8");
  record(results, "nav:receiving-route", navConfig.includes("/procurement/receiving"));

  return results;
}

async function main() {
  console.log("BP-009 IP-08 Procurement Receiving — smoke validation\n");
  const results = await runAcceptance();
  const failed = results.filter((row) => !row.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
