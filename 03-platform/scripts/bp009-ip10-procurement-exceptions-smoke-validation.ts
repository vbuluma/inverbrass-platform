/**
 * Purpose:
 * Smoke-validate BP-009 / IP-10 Procurement Exceptions & Controls.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip10-procurement-exceptions-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { procurementExceptionTypes } from "@/db/seeds/procurement-catalogues";
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
  EXCEPTION_OBJECT_TYPES,
  EXCEPTION_RAISED_FROM,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPE_CODES,
  INVOICE_STATUSES,
  MATCH_OUTCOMES,
  OVER_RECEIPT_POLICIES,
  PO_LINE_TYPES,
  PO_SOURCE_TYPES,
  PO_STATUSES,
  PO_VERSION_STATUSES,
  PROCUREMENT_PERMISSIONS,
} from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { createInProcessApHandoffAdapter } from "@/modules/procurement/adapters/procurement-ap-handoff-adapter";
import {
  InProcessAssetHandoffAdapter,
  InProcessInventoryHandoffAdapter,
} from "@/modules/procurement/adapters/procurement-inventory-handoff-adapter";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { createInMemoryExceptionStore } from "@/modules/procurement/services/exception-memory-store";
import {
  ExceptionService,
  createProcurementExceptionBridge,
} from "@/modules/procurement/services/exception-service";
import { buildExceptionLinkHref } from "@/modules/procurement/services/exception-rules";
import { InMemoryInvoiceStore } from "@/modules/procurement/services/invoice-memory-store";
import { InvoiceService } from "@/modules/procurement/services/invoice-service";
import { InMemoryPurchaseOrderStore } from "@/modules/procurement/services/purchase-order-memory-store";
import { InMemoryPurchaseRequestStore } from "@/modules/procurement/services/purchase-request-memory-store";
import { InMemoryReceivingStore } from "@/modules/procurement/services/receiving-memory-store";
import { ReceivingService } from "@/modules/procurement/services/receiving-service";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
import { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  PoLineRecord,
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0090_bp009_ip010_procurement_exceptions.sql",
  "src/db/schema/procurement-exception.ts",
  "src/modules/procurement/services/exception-service.ts",
  "src/modules/procurement/repositories/exception-repository.ts",
  "src/app/(authenticated)/(app)/procurement/exceptions/page.tsx",
  "src/app/(authenticated)/(app)/procurement/exceptions/[exceptionId]/page.tsx",
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
      createdBy: "buyer-1",
      updatedAt: new Date(),
      updatedBy: "buyer-1",
      deletedAt: null,
      version: 1,
      evidenceDocumentIds: [],
    },
  };
}

type Harness = ReturnType<typeof harness>;

function harness() {
  const exceptionMemory = createInMemoryExceptionStore();
  const invoiceStore = new InMemoryInvoiceStore();
  const receivingStore = new InMemoryReceivingStore();
  const poStore = new InMemoryPurchaseOrderStore();
  poStore.seedControl("biz-a", {
    requiresApproval: false,
    skipRfxEnabled: true,
    skipRfxMaxAmount: "50000000",
  });
  const prStore = new InMemoryPurchaseRequestStore();
  const sourcingStore = new InMemorySourcingStore();
  const audit = new RecordingProcurementAudit();
  const exceptionService = new ExceptionService({
    store: exceptionMemory.store,
    controls: exceptionMemory.controls,
    numbering: exceptionMemory.numbering,
    audit,
  });
  const exceptionBridge = createProcurementExceptionBridge(exceptionService);
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
  const receivingService = new ReceivingService({
    store: receivingStore.store,
    poStore: poStore.store,
    controls: receivingStore.controls,
    numbering: receivingStore.numbering,
    audit,
    suggestedSupplier: prStore.suggestedSupplier,
    inventoryHandoff: new InProcessInventoryHandoffAdapter(),
    assetHandoff: new InProcessAssetHandoffAdapter(),
    purchaseOrders: poService,
    exceptions: exceptionBridge,
  });
  const invoiceService = new InvoiceService({
    store: invoiceStore.store,
    poStore: poStore.store,
    receivingStore: receivingStore.store,
    controls: invoiceStore.controls,
    numbering: invoiceStore.numbering,
    audit,
    suggestedSupplier: prStore.suggestedSupplier,
    apHandoff: createInProcessApHandoffAdapter(),
    exceptions: exceptionBridge,
  });
  return {
    exceptionMemory,
    exceptionService,
    invoiceStore,
    receivingStore,
    poStore,
    prStore,
    audit,
    poService,
    receivingService,
    invoiceService,
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

async function seedAcceptedPo(h: Harness) {
  const profileId = "sup-exc";
  h.prStore.suppliers.set(
    profileId,
    supplierSnapshot(profileId, `pty-${profileId}`, "Exception Supplier")
  );
  const poId = randomUUID();
  const versionId = randomUUID();
  const quantity = "10";
  const unitPrice = "1000";
  const totalAmount = "10000";

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
    status: PO_STATUSES.ACCEPTED,
    currentVersionId: versionId,
    acceptedVersionId: versionId,
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
    submittedBy: "buyer-1",
    approvedAt: new Date(),
    approvedBy: "approver-1",
    issuedAt: new Date(),
    issuedBy: "buyer-1",
    acceptedAt: new Date(),
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    closedAt: null,
    closedBy: null,
    closureReason: null,
    issueIdempotencyKey: null,
    createdBy: "buyer-1",
    updatedBy: "buyer-1",
  });

  await h.poStore.store.insertVersion({
    id: versionId,
    businessId: "biz-a",
    purchaseOrderId: poId,
    versionNumber: 1,
    status: PO_VERSION_STATUSES.ACCEPTED,
    subtotalAmount: totalAmount,
    taxAmount: "0",
    totalAmount,
    year1Amount: null,
    tcvAmount: null,
    tcoAmount: null,
    promisedDeliveryDate: null,
    warrantyNotes: null,
    termsAndConditions: null,
    issuedAt: new Date(),
    issuedBy: "buyer-1",
    supersededAt: null,
    createdBy: "buyer-1",
  });

  const lineId = randomUUID();
  const line: PoLineRecord = {
    id: lineId,
    businessId: "biz-a",
    versionId,
    awardLineId: null,
    quoteLineId: null,
    purchaseRequestLineId: null,
    catalogueItemId: null,
    sequence: 1,
    description: "Widgets",
    quantity,
    uom: "EA",
    unitPrice,
    taxRate: "0",
    lineSubtotal: totalAmount,
    lineTax: "0",
    lineTotal: totalAmount,
    promisedDeliveryDate: null,
    deliveryLocation: null,
    comments: null,
    lineType: PO_LINE_TYPES.INVENTORY,
  };
  await h.poStore.store.insertLines("biz-a", versionId, [line]);
  return { poId, versionId, profileId, line };
}

async function main() {
  console.log("BP-009 IP-10 Procurement Exceptions & Controls — smoke validation\n");
  const results: Result[] = [];
  const context = ctx("biz-a");
  const clerk = actor("buyer-1");

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  const types = await harness().exceptionService.listTypes(context, clerk);
  record(
    results,
    "AC-002:catalogue-types",
    types.length >= procurementExceptionTypes.length &&
      procurementExceptionTypes.every((item) => types.some((row) => row.code === item.code))
  );

  const manualHarness = harness();
  const manualPo = await seedAcceptedPo(manualHarness);
  const manual = await manualHarness.exceptionService.create(context, clerk, {
    exceptionTypeCode: EXCEPTION_TYPE_CODES.SUPPLIER_DISPUTE,
    title: "Supplier dispute on delivery",
    description: "Raised manually for testing.",
    ownerUserId: "buyer-1",
    links: [
      { objectType: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, objectId: manualPo.poId },
      { objectType: EXCEPTION_OBJECT_TYPES.PROFILE, objectId: manualPo.profileId },
    ],
  });
  record(
    results,
    "AC-001:manual-raise",
    manual.raisedFrom === "USER" && manual.status === EXCEPTION_STATUSES.ASSIGNED
  );

  const autoHarness = harness();
  const autoPo = await seedAcceptedPo(autoHarness);
  const invoiceA = await autoHarness.invoiceService.create(context, clerk, {
    profileId: autoPo.profileId,
    purchaseOrderId: autoPo.poId,
    supplierInvoiceNumber: "DUP-001",
    invoiceDate: "2026-03-01",
    currencyCode: "KES",
    lines: [
      {
        poLineId: autoPo.line.id,
        description: autoPo.line.description,
        quantity: "10",
        unitPrice: "1000",
      },
    ],
  });
  await autoHarness.invoiceService.capture(context, clerk, invoiceA.id);
  const invoiceB = await autoHarness.invoiceService.create(context, clerk, {
    profileId: autoPo.profileId,
    purchaseOrderId: autoPo.poId,
    supplierInvoiceNumber: "DUP-001",
    invoiceDate: "2026-03-02",
    currencyCode: "KES",
    lines: [
      {
        poLineId: autoPo.line.id,
        description: autoPo.line.description,
        quantity: "10",
        unitPrice: "1000",
      },
    ],
  });
  const duplicateBlocked = await expectError(
    () => autoHarness.invoiceService.capture(context, clerk, invoiceB.id),
    PROCUREMENT_ERROR_CODES.INVOICE_DUPLICATE
  );
  const autoExceptions = await autoHarness.exceptionMemory.store.listExceptionsByBusiness("biz-a");
  const duplicateException = autoExceptions.find(
    (row) => row.exceptionTypeCode === EXCEPTION_TYPE_CODES.DUPLICATE_INVOICE
  );
  record(
    results,
    "AC-001:auto-match-raise",
    duplicateBlocked &&
      Boolean(duplicateException) &&
      duplicateException?.raisedFrom === EXCEPTION_RAISED_FROM.SYSTEM_MATCH
  );

  const lifecycleHarness = harness();
  const lifecyclePo = await seedAcceptedPo(lifecycleHarness);
  const lifecycle = await lifecycleHarness.exceptionService.create(context, clerk, {
    exceptionTypeCode: EXCEPTION_TYPE_CODES.PRICE_VARIANCE,
    title: "Price variance on widgets",
    description: null,
    links: [{ objectType: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, objectId: lifecyclePo.poId }],
  });
  await lifecycleHarness.exceptionService.assign(context, clerk, lifecycle.id, {
    ownerUserId: "resolver-1",
  });
  await lifecycleHarness.exceptionService.startProgress(context, clerk, lifecycle.id);
  const resolved = await lifecycleHarness.exceptionService.resolve(context, clerk, lifecycle.id, {
    resolutionNotes: "Tolerance accepted by procurement lead.",
    varianceAccepted: true,
  });
  const detail = await lifecycleHarness.exceptionService.get(context, clerk, lifecycle.id);
  const auditRaised = lifecycleHarness.audit.entries.some(
    (row) =>
      row.entityId === lifecycle.id && row.action === PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_RAISED
  );
  record(
    results,
    "AC-003:owner-actions-audit",
    resolved.ownerUserId === "resolver-1" &&
      detail.actions.length >= 3 &&
      auditRaised &&
      (resolved.status === EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL ||
        resolved.status === EXCEPTION_STATUSES.CLOSED)
  );

  const approvalHarness = harness();
  const approvalPo = await seedAcceptedPo(approvalHarness);
  const approval = await approvalHarness.exceptionService.create(context, clerk, {
    exceptionTypeCode: EXCEPTION_TYPE_CODES.PRICE_VARIANCE,
    title: "High severity variance",
    description: null,
    severity: "HIGH",
    links: [{ objectType: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, objectId: approvalPo.poId }],
  });
  await approvalHarness.exceptionService.resolve(context, clerk, approval.id, {
    resolutionNotes: "Awaiting approval.",
    varianceAccepted: true,
  });
  const pending = await approvalHarness.exceptionService.get(context, clerk, approval.id);
  const approved = await approvalHarness.exceptionService.approveClose(context, clerk, approval.id);
  record(
    results,
    "AC-004:approval-required",
    pending.status === EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL &&
      approved.status === EXCEPTION_STATUSES.CLOSED
  );

  const dupHarness = harness();
  const dupPo = await seedAcceptedPo(dupHarness);
  const dupException = await dupHarness.exceptionService.create(context, clerk, {
    exceptionTypeCode: EXCEPTION_TYPE_CODES.DUPLICATE_INVOICE,
    title: "Duplicate supplier invoice",
    description: null,
    links: [{ objectType: EXCEPTION_OBJECT_TYPES.INVOICE, objectId: randomUUID() }],
  });
  const decisionBlocked = await expectError(
    () =>
      dupHarness.exceptionService.resolve(context, clerk, dupException.id, {
        resolutionNotes: "Trying to close without decision.",
      }),
    PROCUREMENT_ERROR_CODES.EXCEPTION_DECISION_REQUIRED
  );
  const dupClosed = await dupHarness.exceptionService.resolve(context, clerk, dupException.id, {
    resolutionNotes: "Duplicate voided.",
    resolutionDecision: "Keep first invoice, void duplicate.",
  });
  record(
    results,
    "AC-005:duplicate-decision",
    Boolean(
      decisionBlocked &&
        (dupClosed.status === EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL ||
          dupClosed.status === EXCEPTION_STATUSES.CLOSED) &&
        dupClosed.resolutionDecision?.includes("void duplicate")
    )
  );

  const linkHarness = harness();
  const linkPo = await seedAcceptedPo(linkHarness);
  const receipt = await linkHarness.receivingService.createReceipt(context, clerk, {
    purchaseOrderId: linkPo.poId,
    lines: [{ poLineId: linkPo.line.id, quantityReceived: "5" }],
  });
  const receiptLine = (await linkHarness.receivingStore.store.listReceiptLines(receipt.id))[0]!;
  await linkHarness.receivingService.recordDiscrepancy(context, clerk, receipt.id, {
    receiptLineId: receiptLine.id,
    discrepancyType: DISCREPANCY_TYPES.SHORT_DELIVERY,
    discrepancyDescription: "Short by 5 units",
  });
  const receiptExceptions = await linkHarness.exceptionMemory.store.listExceptionsByObject(
    "biz-a",
    EXCEPTION_OBJECT_TYPES.RECEIPT,
    receipt.id
  );
  const poHref = buildExceptionLinkHref(EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, linkPo.poId);
  const invoiceHref = buildExceptionLinkHref(EXCEPTION_OBJECT_TYPES.INVOICE, randomUUID());
  const receiptHref = buildExceptionLinkHref(EXCEPTION_OBJECT_TYPES.RECEIPT, receipt.id);
  record(
    results,
    "AC-006:linked-navigation",
    receiptExceptions.length >= 1 &&
      poHref === `/procurement/orders/${linkPo.poId}` &&
      invoiceHref.startsWith("/procurement/invoices/") &&
      receiptHref === `/procurement/receiving/${receipt.id}`
  );

  const crossHarness = harness();
  const crossPo = await seedAcceptedPo(crossHarness);
  const cross = await crossHarness.exceptionService.create(context, clerk, {
    exceptionTypeCode: EXCEPTION_TYPE_CODES.LATE_DELIVERY,
    title: "Late delivery",
    description: null,
    links: [{ objectType: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, objectId: crossPo.poId }],
  });
  const crossBlocked = await expectError(
    () => crossHarness.exceptionService.get(ctx("biz-other"), clerk, cross.id),
    PROCUREMENT_ERROR_CODES.EXCEPTION_NOT_FOUND
  );
  record(results, "AC-007:cross-business-blocked", crossBlocked);

  const exceptionSource = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/exception-service.ts"),
    "utf8"
  ).toLowerCase();
  record(
    results,
    "AC-008:no-payment-or-stock",
    !exceptionSource.includes("journalentry") &&
      !exceptionSource.includes("postgl") &&
      !exceptionSource.includes("inventoryhandoff") &&
      !exceptionSource.includes("paymentinitiation")
  );

  const openCount = await manualHarness.exceptionService.countOpen(context, clerk);
  record(results, "open-count", openCount >= 1);

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "architecture-scan-clean", scan.supplierMaster.length === 0);

  const passed = results.filter((row) => row.ok).length;
  const failed = results.filter((row) => !row.ok);
  console.log(`\n${passed}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("\nFailures:");
    for (const row of failed) {
      console.log(`  - ${row.name}${row.detail ? `: ${row.detail}` : ""}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
