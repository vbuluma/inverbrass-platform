/**
 * Purpose:
 * Smoke-validate BP-009 / IP-09 Supplier Invoice & Matching.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip09-supplier-invoice-smoke-validation.ts
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
  QUALIFICATION_STATUS_CODES,
} from "@/modules/procurement";
import {
  AP_HANDOFF_STATUSES,
  INVOICE_STATUSES,
  MATCH_OUTCOMES,
  PO_LINE_TYPES,
  PO_SOURCE_TYPES,
  PO_STATUSES,
  PO_VERSION_STATUSES,
} from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { createInProcessApHandoffAdapter } from "@/modules/procurement/adapters/procurement-ap-handoff-adapter";
import {
  InProcessAssetHandoffAdapter,
  InProcessInventoryHandoffAdapter,
} from "@/modules/procurement/adapters/procurement-inventory-handoff-adapter";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { InMemoryInvoiceStore } from "@/modules/procurement/services/invoice-memory-store";
import { InvoiceService } from "@/modules/procurement/services/invoice-service";
import { buildMatchIdempotencyKey } from "@/modules/procurement/services/invoice-rules";
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
  "drizzle/0089_bp009_ip009_supplier_invoice.sql",
  "src/db/schema/procurement-invoice.ts",
  "src/modules/procurement/services/invoice-service.ts",
  "src/modules/procurement/repositories/invoice-repository.ts",
  "src/app/(authenticated)/(app)/procurement/invoices/page.tsx",
  "src/app/(authenticated)/(app)/procurement/invoices/[invoiceId]/page.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string, userId = "ap-clerk-1"): CurrentBusinessContext {
  return { businessId, platformUserId: userId, businessMembershipId: `mem-${businessId}` };
}

function actor(userId = "ap-clerk-1", permissions = ALL_PROCUREMENT_PERMISSIONS): ProcurementActor {
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
    createdBy: "ap-clerk-1",
    updatedAt: new Date(),
    updatedBy: "ap-clerk-1",
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
      createdBy: "ap-clerk-1",
      updatedAt: new Date(),
      updatedBy: "ap-clerk-1",
      deletedAt: null,
      version: 1,
      evidenceDocumentIds: [],
    },
  };
}

type Harness = ReturnType<typeof harness>;

function harness() {
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
  const apHandoff = createInProcessApHandoffAdapter();
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
  });
  const invoiceService = new InvoiceService({
    store: invoiceStore.store,
    poStore: poStore.store,
    receivingStore: receivingStore.store,
    controls: invoiceStore.controls,
    numbering: invoiceStore.numbering,
    audit,
    suggestedSupplier: prStore.suggestedSupplier,
    apHandoff,
  });
  return {
    invoiceStore,
    receivingStore,
    poStore,
    prStore,
    audit,
    apHandoff,
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

type SeedPoLine = {
  lineType?: string;
  quantity?: string;
  unitPrice?: string;
  description?: string;
};

async function seedAcceptedPo(h: Harness, options: { lines?: SeedPoLine[] } = {}) {
  const profileId = "sup-inv";
  h.prStore.suppliers.set(
    profileId,
    supplierSnapshot(profileId, `pty-${profileId}`, "Invoice Supplier")
  );
  const poId = randomUUID();
  const versionId = randomUUID();
  const lineSpecs = options.lines ?? [
    { lineType: PO_LINE_TYPES.INVENTORY, quantity: "10", unitPrice: "1000", description: "Widgets" },
  ];
  const totalAmount = lineSpecs
    .reduce((sum, row) => sum + Number(row.quantity ?? "1") * Number(row.unitPrice ?? "1000"), 0)
    .toString();

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
    submittedBy: "ap-clerk-1",
    approvedAt: new Date(),
    approvedBy: "approver-1",
    issuedAt: new Date(),
    issuedBy: "ap-clerk-1",
    acceptedAt: new Date(),
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    closedAt: null,
    closedBy: null,
    closureReason: null,
    issueIdempotencyKey: null,
    createdBy: "ap-clerk-1",
    updatedBy: "ap-clerk-1",
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
    issuedBy: "ap-clerk-1",
    supersededAt: null,
    createdBy: "ap-clerk-1",
  });

  const lines: PoLineRecord[] = [];
  for (const [index, spec] of lineSpecs.entries()) {
    const quantity = spec.quantity ?? "1";
    const unitPrice = spec.unitPrice ?? "1000";
    const lineTotal = String(Number(quantity) * Number(unitPrice));
    const line: PoLineRecord = {
      id: randomUUID(),
      businessId: "biz-a",
      versionId,
      awardLineId: null,
      quoteLineId: null,
      purchaseRequestLineId: null,
      catalogueItemId: null,
      sequence: index + 1,
      description: spec.description ?? `Line ${index + 1}`,
      quantity,
      uom: "EA",
      unitPrice,
      taxRate: "0",
      lineSubtotal: lineTotal,
      lineTax: "0",
      lineTotal,
      promisedDeliveryDate: null,
      deliveryLocation: null,
      comments: null,
      lineType: spec.lineType ?? PO_LINE_TYPES.INVENTORY,
    };
    lines.push(line);
  }
  await h.poStore.store.insertLines("biz-a", versionId, lines);
  return { poId, versionId, profileId, lines, totalAmount };
}

async function main() {
  const results: Result[] = [];
  const context = ctx("biz-a");
  const clerk = actor();

  console.log("BP-009 IP-09 Supplier Invoice & Matching — smoke validation\n");

  for (const file of REQUIRED_FILES) {
    record(results, `files:${file}`, existsSync(path.join(ROOT, file)));
  }

  const h = harness();
  const po = await seedAcceptedPo(h);
  const poLine = po.lines[0]!;

  const draft = await h.invoiceService.create(context, clerk, {
    profileId: po.profileId,
    purchaseOrderId: po.poId,
    supplierInvoiceNumber: "SUP-INV-001",
    invoiceDate: "2026-02-01",
    dueDate: "2026-03-01",
    currencyCode: "KES",
    taxReference: "VAT-16",
    attachmentDocumentId: "doc-attach-1",
    lines: [
      {
        poLineId: poLine.id,
        description: poLine.description,
        quantity: "10",
        unitPrice: "1000",
        taxRate: "0",
      },
    ],
  });
  record(
    results,
    "AC-001:invoice-captured-against-po",
    draft.status === INVOICE_STATUSES.DRAFT &&
      draft.lines.length === 1 &&
      draft.taxReference === "VAT-16" &&
      draft.attachmentDocumentId === "doc-attach-1"
  );

  await h.receivingService.createReceipt(context, clerk, {
    purchaseOrderId: po.poId,
    lines: [{ poLineId: poLine.id, quantityReceived: "10" }],
  });

  const matched = await h.invoiceService.capture(context, clerk, draft.id);
  record(
    results,
    "AC-004:three-way-requires-receipt",
    matched.matchOutcome === MATCH_OUTCOMES.MATCHED ||
      matched.status === INVOICE_STATUSES.PENDING_APPROVAL
  );

  const duplicateHarness = harness();
  const dupPo = await seedAcceptedPo(duplicateHarness, {});
  const dupLine = dupPo.lines[0]!;
  await duplicateHarness.invoiceService.create(context, clerk, {
    profileId: dupPo.profileId,
    purchaseOrderId: dupPo.poId,
    supplierInvoiceNumber: "DUP-100",
    invoiceDate: "2026-02-02",
    currencyCode: "KES",
    lines: [{ poLineId: dupLine.id, description: dupLine.description, quantity: "1", unitPrice: "1000" }],
  });
  const second = await duplicateHarness.invoiceService.create(context, clerk, {
    profileId: dupPo.profileId,
    purchaseOrderId: dupPo.poId,
    supplierInvoiceNumber: "DUP-100",
    invoiceDate: "2026-02-03",
    currencyCode: "KES",
    lines: [{ poLineId: dupLine.id, description: dupLine.description, quantity: "1", unitPrice: "1000" }],
  });
  const dupBlocked = await expectError(
    () => duplicateHarness.invoiceService.capture(context, clerk, second.id),
    PROCUREMENT_ERROR_CODES.INVOICE_DUPLICATE
  );
  record(results, "AC-002:duplicate-invoice-detected", dupBlocked);

  const serviceHarness = harness();
  const servicePo = await seedAcceptedPo(serviceHarness, {
    lines: [{ lineType: PO_LINE_TYPES.SERVICE, quantity: "1", unitPrice: "5000", description: "Support" }],
  });
  const serviceLine = servicePo.lines[0]!;
  const serviceInvoice = await serviceHarness.invoiceService.create(context, clerk, {
    profileId: servicePo.profileId,
    purchaseOrderId: servicePo.poId,
    supplierInvoiceNumber: "SVC-INV-1",
    invoiceDate: "2026-02-04",
    currencyCode: "KES",
    lines: [{ poLineId: serviceLine.id, description: serviceLine.description, quantity: "1", unitPrice: "5000" }],
  });
  const serviceMatched = await serviceHarness.invoiceService.capture(context, clerk, serviceInvoice.id);
  record(
    results,
    "AC-003:two-way-service-match",
    serviceMatched.matchOutcome === MATCH_OUTCOMES.MATCHED
  );

  const noReceiptHarness = harness();
  const noReceiptPo = await seedAcceptedPo(noReceiptHarness, {});
  const noReceiptLine = noReceiptPo.lines[0]!;
  const noReceiptInvoice = await noReceiptHarness.invoiceService.create(context, clerk, {
    profileId: noReceiptPo.profileId,
    purchaseOrderId: noReceiptPo.poId,
    supplierInvoiceNumber: "NO-RCV-1",
    invoiceDate: "2026-02-05",
    currencyCode: "KES",
    lines: [{ poLineId: noReceiptLine.id, description: noReceiptLine.description, quantity: "10", unitPrice: "1000" }],
  });
  const noReceiptMatched = await noReceiptHarness.invoiceService.capture(
    context,
    clerk,
    noReceiptInvoice.id
  );
  record(
    results,
    "AC-004:three-way-fails-without-receipt",
    noReceiptMatched.matchOutcome === MATCH_OUTCOMES.UNMATCHED ||
      noReceiptMatched.status === INVOICE_STATUSES.UNMATCHED
  );

  const varianceHarness = harness();
  const variancePo = await seedAcceptedPo(varianceHarness, {});
  const varianceLine = variancePo.lines[0]!;
  await varianceHarness.receivingService.createReceipt(context, clerk, {
    purchaseOrderId: variancePo.poId,
    lines: [{ poLineId: varianceLine.id, quantityReceived: "10" }],
  });
  const varianceInvoice = await varianceHarness.invoiceService.create(context, clerk, {
    profileId: variancePo.profileId,
    purchaseOrderId: variancePo.poId,
    supplierInvoiceNumber: "VAR-1",
    invoiceDate: "2026-02-06",
    currencyCode: "KES",
    lines: [{ poLineId: varianceLine.id, description: varianceLine.description, quantity: "10", unitPrice: "1500" }],
  });
  const varianceResult = await varianceHarness.invoiceService.capture(context, clerk, varianceInvoice.id);
  record(
    results,
    "AC-005:variance-not-payment-ready",
    varianceResult.matchOutcome === MATCH_OUTCOMES.VARIANCE &&
      varianceResult.status !== INVOICE_STATUSES.PAYMENT_READY
  );

  const payHarness = harness();
  const payPo = await seedAcceptedPo(payHarness, {});
  const payLine = payPo.lines[0]!;
  await payHarness.receivingService.createReceipt(context, clerk, {
    purchaseOrderId: payPo.poId,
    lines: [{ poLineId: payLine.id, quantityReceived: "10" }],
  });
  const payInvoice = await payHarness.invoiceService.create(context, clerk, {
    profileId: payPo.profileId,
    purchaseOrderId: payPo.poId,
    supplierInvoiceNumber: "PAY-1",
    invoiceDate: "2026-02-07",
    dueDate: "2026-03-07",
    currencyCode: "KES",
    lines: [{ poLineId: payLine.id, description: payLine.description, quantity: "10", unitPrice: "1000" }],
  });
  const capturedPay = await payHarness.invoiceService.capture(context, clerk, payInvoice.id);
  const approvedPay = await payHarness.invoiceService.approve(context, clerk, capturedPay.id);
  record(
    results,
    "AC-006:payment-ready-handoff",
    approvedPay.status === INVOICE_STATUSES.PAYMENT_READY &&
      approvedPay.apHandoff?.status === AP_HANDOFF_STATUSES.SUCCEEDED &&
      approvedPay.apHandoff.downstreamReference?.startsWith("AP-REF-") === true
  );

  const idemHarness = harness();
  const idemPo = await seedAcceptedPo(idemHarness, {});
  const idemLine = idemPo.lines[0]!;
  await idemHarness.receivingService.createReceipt(context, clerk, {
    purchaseOrderId: idemPo.poId,
    lines: [{ poLineId: idemLine.id, quantityReceived: "10" }],
  });
  const idemInvoice = await idemHarness.invoiceService.create(context, clerk, {
    profileId: idemPo.profileId,
    purchaseOrderId: idemPo.poId,
    supplierInvoiceNumber: "IDEM-1",
    invoiceDate: "2026-02-08",
    currencyCode: "KES",
    lines: [{ poLineId: idemLine.id, description: idemLine.description, quantity: "10", unitPrice: "1000" }],
  });
  await idemHarness.invoiceService.capture(context, clerk, idemInvoice.id);
  const row = await idemHarness.invoiceStore.store.findInvoiceById("biz-a", idemInvoice.id);
  const key = buildMatchIdempotencyKey(idemInvoice.id, row?.matchVersion ?? 1);
  const before = (await idemHarness.invoiceStore.store.listMatchesByInvoice(idemInvoice.id)).length;
  await idemHarness.invoiceService.runMatch(context, clerk, idemInvoice.id);
  const after = (await idemHarness.invoiceStore.store.listMatchesByInvoice(idemInvoice.id)).length;
  record(results, "AC-007:match-idempotent", before === after && before >= 1 && key.length > 0);

  const invoiceSource = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/invoice-service.ts"),
    "utf8"
  ).toLowerCase();
  record(
    results,
    "AC-007:no-gl-posting",
    !invoiceSource.includes("journalentry") && !invoiceSource.includes("postgl")
  );
  record(
    results,
    "AC-008:no-customer-receipt",
    !invoiceSource.includes("@/modules/customer") && !invoiceSource.includes("customerreceipt")
  );

  const crossHarness = harness();
  const crossPo = await seedAcceptedPo(crossHarness, {});
  const crossLine = crossPo.lines[0]!;
  const crossInvoice = await crossHarness.invoiceService.create(context, clerk, {
    profileId: crossPo.profileId,
    purchaseOrderId: crossPo.poId,
    supplierInvoiceNumber: "CROSS-1",
    invoiceDate: "2026-02-09",
    currencyCode: "KES",
    lines: [{ poLineId: crossLine.id, description: crossLine.description, quantity: "1", unitPrice: "1000" }],
  });
  const crossBlocked = await expectError(
    () => crossHarness.invoiceService.get(ctx("biz-other"), clerk, crossInvoice.id),
    PROCUREMENT_ERROR_CODES.INVOICE_NOT_FOUND
  );
  record(results, "AC-010:cross-business-blocked", crossBlocked);

  const authHarness = harness();
  const authPo = await seedAcceptedPo(authHarness, {});
  const authLine = authPo.lines[0]!;
  const unauthorized = await expectError(
    () =>
      authHarness.invoiceService.create(context, actor("ap-clerk-1", [PROCUREMENT_PERMISSIONS.INVOICE_READ]), {
        profileId: authPo.profileId,
        purchaseOrderId: authPo.poId,
        supplierInvoiceNumber: "AUTH-1",
        invoiceDate: "2026-02-10",
        currencyCode: "KES",
        lines: [{ poLineId: authLine.id, description: authLine.description, quantity: "1", unitPrice: "1000" }],
      }),
    PROCUREMENT_ERROR_CODES.UNAUTHORIZED
  );
  record(results, "AC-009:unauthorized-blocked", unauthorized);

  const auditHarness = harness();
  const auditPo = await seedAcceptedPo(auditHarness, {});
  const auditLine = auditPo.lines[0]!;
  await auditHarness.receivingService.createReceipt(context, clerk, {
    purchaseOrderId: auditPo.poId,
    lines: [{ poLineId: auditLine.id, quantityReceived: "10" }],
  });
  const auditInvoice = await auditHarness.invoiceService.create(context, clerk, {
    profileId: auditPo.profileId,
    purchaseOrderId: auditPo.poId,
    supplierInvoiceNumber: "AUD-1",
    invoiceDate: "2026-02-11",
    currencyCode: "KES",
    lines: [{ poLineId: auditLine.id, description: auditLine.description, quantity: "10", unitPrice: "1000" }],
  });
  const auditCaptured = await auditHarness.invoiceService.capture(context, clerk, auditInvoice.id);
  await auditHarness.invoiceService.approve(context, clerk, auditCaptured.id);
  record(
    results,
    "audit:invoice-created",
    auditHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.INVOICE_CREATED)
  );
  record(
    results,
    "audit:invoice-matched",
    auditHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.INVOICE_MATCHED)
  );
  record(
    results,
    "audit:ap-handoff",
    auditHarness.audit.entries.some((entry) => entry.action === PROCUREMENT_AUDIT_ACTIONS.AP_HANDOFF_SUCCEEDED)
  );

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "architecture:no-downstream-scope-creep", scan.downstream.length === 0);

  const passed = results.filter((row) => row.ok).length;
  const failed = results.filter((row) => !row.ok);
  console.log(`\n${passed}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.error("\nFailed checks:");
    for (const row of failed) {
      console.error(`  - ${row.name}${row.detail ? `: ${row.detail}` : ""}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
