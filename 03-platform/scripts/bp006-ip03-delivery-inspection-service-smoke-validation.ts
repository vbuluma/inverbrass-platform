/**
 * Purpose:
 * Smoke-validate BP-006 / IP-03 Delivery, Inspection & Service Completion.
 *
 * Usage:
 *   npx tsx scripts/bp006-ip03-delivery-inspection-service-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CommercialResolutionService,
  createDownstreamCommercialContractAdapter,
  createCommercialContractService,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import { createPersistedFulfilmentOutcomeAdapter } from "@/modules/sales/adapters/delivery-outcome-adapter";
import { InMemoryOrderDispositionAdapter } from "@/modules/sales/adapters/order-disposition-adapter";
import {
  SALES_AUDIT_ACTIONS,
  SALES_COMPLETION_BLOCKER_CODES,
  SALES_DELIVERY_EVENT_STATUS_CODES,
  SALES_ORDER_LINE_TYPES,
  SALES_ORDER_STATUS_CODES,
  SALES_REJECTION_REASON_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError } from "@/modules/sales/errors";
import type { CommercialContractPort } from "@/modules/sales/ports";
import { RecordingSalesAudit } from "@/modules/sales/services/sales-order-audit-helper";
import { InMemorySalesDeliveryStore } from "@/modules/sales/services/sales-delivery-memory-store";
import { SalesDeliveryService } from "@/modules/sales/services/sales-delivery-service";
import {
  InMemoryOfferingLookup,
  InMemoryPartyLookup,
  InMemoryQuotationLookup,
  InMemorySalesOrderStore,
} from "@/modules/sales/services/sales-order-memory-store";
import { SalesOrderService } from "@/modules/sales/services/sales-order-service";
import type { CreateDirectSaleLineInput } from "@/modules/sales/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0059_bp006_ip003_delivery_inspection_service.sql",
  "src/db/schema/sales-delivery.ts",
  "src/modules/sales/services/delivery-rules.ts",
  "src/modules/sales/services/sales-delivery-service.ts",
  "src/modules/sales/services/sales-delivery-memory-store.ts",
  "src/modules/sales/adapters/delivery-outcome-adapter.ts",
  "src/modules/sales/repositories/sales-delivery-repository.ts",
  "src/modules/sales/components/sales-delivery-panel.tsx",
];

function ctx(businessId: string, userId = "maker-1"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function fixtureResolvedBase(
  overrides: Partial<ResolvedBasePrice> = {}
): ResolvedBasePrice {
  return {
    unitPrice: 300,
    currencyCode: "KES",
    pricingMethod: "FIXED",
    pricingMethodLabel: "Fixed",
    pricingCatalogueId: "cat-1",
    catalogueCode: "DEFAULT",
    catalogueName: "Default",
    pricingItemId: "price-1",
    offeringId: "offering-physical",
    offeringCode: "JA-PHYS-001",
    offeringName: "Journey Alpha Physical Pack",
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
      offeringId: "offering-physical",
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
        quantity: 100,
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

function commercialPort(): CommercialContractPort {
  const adapter = createDownstreamCommercialContractAdapter();
  const service = createCommercialContractService();
  return {
    consumeFromSnapshot: (context, snapshot, options) =>
      adapter.consumeFromSnapshot(context, snapshot, options),
    validate: (context, contract, snapshot) =>
      adapter.validate(context, contract, snapshot),
    verifyIntegrity: (context, contract, snapshot) =>
      service.verifyCommercialContractIntegrity(context, contract, snapshot),
  };
}

async function buildLine(
  businessId: string,
  offeringId: string,
  quantity: number,
  currencyCode = "KES"
): Promise<CreateDirectSaleLineInput> {
  const resolution = new CommercialResolutionService({
    resolveBasePrice: async () =>
      fixtureResolvedBase({
        offeringId,
        provenance: {
          ...fixtureResolvedBase().provenance,
          businessId,
          offeringId,
          dimensions: {
            ...fixtureResolvedBase().provenance.dimensions,
            currencyCode,
            quantity,
          },
        },
      }),
  } as never);
  const pipeline = await resolution.resolveExpectedAmount(ctx(businessId), {
    businessId,
    offeringId,
    currencyCode,
    quantity,
  });
  return {
    offeringId,
    quantity,
    snapshot: pipeline.snapshot,
    expected: pipeline.expected,
  };
}

function harness() {
  const store = new InMemorySalesOrderStore();
  const deliveries = new InMemorySalesDeliveryStore();
  const audit = new RecordingSalesAudit();
  const disposition = new InMemoryOrderDispositionAdapter();
  const sales = new SalesOrderService({
    orders: store,
    parties: new InMemoryPartyLookup([
      { id: "party-1", businessId: "biz-a", displayName: "Test Customer Alpha" },
      { id: "party-b", businessId: "biz-b", displayName: "Other Business Customer" },
    ]),
    offerings: new InMemoryOfferingLookup([
      {
        id: "offering-physical",
        businessId: "biz-a",
        productCode: "JA-PHYS-001",
        productName: "Journey Alpha Physical Pack",
        productTypeCode: "PHYSICAL_PRODUCT",
      },
      {
        id: "offering-service",
        businessId: "biz-a",
        productCode: "JA-ADV-001",
        productName: "Journey Alpha Advisory Service",
        productTypeCode: "SERVICE",
      },
    ]),
    quotations: new InMemoryQuotationLookup([]),
    commercial: commercialPort(),
    commercialResolver: {
      resolveAndConsume: async (context, input) => {
        const line = await buildLine(
          context.businessId,
          input.offeringId,
          input.quantity,
          input.currencyCode
        );
        const contract = commercialPort().consumeFromSnapshot(context, line.snapshot, {
          expected: line.expected,
          expectedCurrency: input.currencyCode,
          consumerRef: input.consumerRef,
        });
        return { snapshot: line.snapshot, expected: line.expected!, contract };
      },
    },
    audit,
    confirmationPolicy: { requiresSegregationOfDuties: true },
    completionPolicy: { requiresSegregationOfDuties: true },
    fulfilmentOutcomes: createPersistedFulfilmentOutcomeAdapter(deliveries, store),
    disposition,
    deliveries,
  });
  const delivery = new SalesDeliveryService({
    orders: store,
    deliveries,
    sales,
    audit,
  });
  return { sales, delivery, store, deliveries, audit, disposition };
}

function firstLineId(store: InMemorySalesOrderStore, orderId: string) {
  return store.lines.get(orderId)?.[0]?.id ?? "";
}

async function confirmOrder(
  sales: SalesOrderService,
  offeringId: string,
  quantity: number
) {
  const maker = ctx("biz-a", "maker-1");
  const checker = ctx("biz-a", "checker-1");
  const created = await sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", offeringId, quantity)],
  });
  await sales.submitConfirmation(maker, created.id);
  const confirmed = await sales.approveConfirmation(checker, created.id);
  return { maker, checker, created, confirmed };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `file:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkJournal(): SmokeResult {
  const journal = readFileSync(
    path.join(ROOT, "drizzle/meta/_journal.json"),
    "utf8"
  );
  return {
    name: "journal:0059_bp006_ip003_delivery_inspection_service",
    ok: journal.includes("0059_bp006_ip003_delivery_inspection_service"),
  };
}

function checkNoLineFulfilledColumn(): SmokeResult {
  const schema = readFileSync(
    path.join(ROOT, "src/db/schema/sales-order.ts"),
    "utf8"
  );
  return {
    name: "no-competing-fulfilled-quantity-on-order-line",
    ok:
      !schema.includes("fulfilledQuantity") &&
      !schema.includes("fulfilled_quantity"),
  };
}

function checkUxLanguage(): SmokeResult {
  const panel = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-delivery-panel.tsx"),
    "utf8"
  );
  const workspace = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-order-workspace.tsx"),
    "utf8"
  );
  return {
    name: "ux:business-language-delivery",
    ok:
      panel.includes("Record arrival") &&
      panel.includes("Inspect") &&
      panel.includes("Start service") &&
      panel.includes("Complete service") &&
      workspace.includes("Payment not yet recorded") &&
      !panel.includes("cash") &&
      !panel.includes("M-Pesa") &&
      !panel.includes("Start return") &&
      !panel.includes("calendar") &&
      !workspace.includes(">IP-03<") &&
      !workspace.includes(">ENG-015<"),
  };
}

function checkNoInventoryOrReturn(): SmokeResult {
  const service = readFileSync(
    path.join(ROOT, "src/modules/sales/services/sales-delivery-service.ts"),
    "utf8"
  );
  return {
    name: "boundary:no-inventory-return-refund-scheduler",
    ok:
      !service.includes("@/modules/inventory") &&
      !service.includes("@/modules/payment") &&
      !service.includes("createReturn") &&
      !service.includes("executeRefund") &&
      service.includes("inventoryExecuted: false") &&
      service.includes("schedulerExecuted: false"),
  };
}

async function caughtCode(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    return error instanceof SalesOrderError ? error.code : String(error);
  }
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const { sales, delivery, store, audit } = harness();
  const inspector = ctx("biz-a", "inspector-1");
  const otherBiz = ctx("biz-b", "other-1");

  const physical = await confirmOrder(sales, "offering-physical", 100);
  const physicalLineId = firstLineId(store, physical.confirmed.id);
  results.push({
    name: "setup:physical-line-type",
    ok: physical.confirmed.lines[0]?.lineType === SALES_ORDER_LINE_TYPES.PHYSICAL,
    detail: physical.confirmed.lines[0]?.lineType,
  });

  const arrived = await delivery.recordPhysicalDelivery(physical.maker, {
    orderId: physical.confirmed.id,
    orderLineId: physicalLineId,
    claimedQuantity: 100,
  });
  results.push({
    name: "ac-005:uninspected-delivery-pending",
    ok:
      arrived.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS &&
      arrived.lines[0]?.inspectionStatus === "PENDING" &&
      arrived.fulfilment.acceptedQuantity === "0" &&
      arrived.fulfilment.outstandingQuantity === "100" &&
      arrived.fulfilment.completion.blockers.includes(
        SALES_COMPLETION_BLOCKER_CODES.INSPECTION_PENDING
      ),
    detail: `${arrived.status} inspect=${arrived.lines[0]?.inspectionStatus}`,
  });

  const selfInspect = await caughtCode(() =>
    delivery.inspectDelivery(physical.maker, {
      orderId: physical.confirmed.id,
      deliveryEventId: arrived.deliveries[0]!.id,
      acceptedQuantity: 80,
      rejectedQuantity: 15,
      comments: "15 defective, 5 not in the shipment",
      rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
      qualityFindingCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
    })
  );
  results.push({
    name: "ac-006:maker-cannot-inspect-own-delivery",
    ok: selfInspect === "SOD_VIOLATION",
    detail: selfInspect ?? "no-throw",
  });

  const noComments = await caughtCode(() =>
    delivery.inspectDelivery(inspector, {
      orderId: physical.confirmed.id,
      deliveryEventId: arrived.deliveries[0]!.id,
      acceptedQuantity: 80,
      rejectedQuantity: 15,
      rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
    })
  );
  results.push({
    name: "ac-004:partial-requires-comments",
    ok: noComments === "COMMENTS_REQUIRED",
    detail: noComments ?? "no-throw",
  });

  const noReason = await caughtCode(() =>
    delivery.inspectDelivery(inspector, {
      orderId: physical.confirmed.id,
      deliveryEventId: arrived.deliveries[0]!.id,
      acceptedQuantity: 80,
      rejectedQuantity: 15,
      comments: "Split without a reason code",
    })
  );
  results.push({
    name: "ac-004:reject-requires-reason",
    ok: noReason === "REJECTION_REASON_REQUIRED",
    detail: noReason ?? "no-throw",
  });

  const inspected = await delivery.inspectDelivery(inspector, {
    orderId: physical.confirmed.id,
    deliveryEventId: arrived.deliveries[0]!.id,
    acceptedQuantity: 80,
    rejectedQuantity: 15,
    comments: "15 defective, 5 not in the shipment",
    rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
    qualityFindingCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
  });
  results.push({
    name: "ac-001:100-ordered-80-15-5-outstanding-20",
    ok:
      inspected.fulfilment.orderedQuantity === "100" &&
      inspected.fulfilment.acceptedQuantity === "80" &&
      inspected.fulfilment.rejectedQuantity === "15" &&
      inspected.fulfilment.deliveredQuantity === "95" &&
      inspected.fulfilment.missingQuantity === "5" &&
      inspected.fulfilment.outstandingQuantity === "20" &&
      inspected.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
    detail: `delivered=${inspected.fulfilment.deliveredQuantity} missing=${inspected.fulfilment.missingQuantity} outstanding=${inspected.fulfilment.outstandingQuantity}`,
  });
  results.push({
    name: "ac-002:missing-is-not-rejected",
    ok:
      inspected.fulfilment.missingQuantity === "5" &&
      inspected.fulfilment.rejectedQuantity === "15",
  });
  results.push({
    name: "ac-007:rejected-not-line-complete",
    ok:
      inspected.lines[0]?.fulfilmentStatus !== "FULFILLED" &&
      inspected.fulfilment.completion.completionBlocked &&
      inspected.fulfilment.outstandingQuantity === "20",
    detail: inspected.lines[0]?.fulfilmentStatus,
  });
  results.push({
    name: "ac-004:quality-finding-stored",
    ok:
      inspected.deliveries[0]?.qualityFindingCode ===
        SALES_REJECTION_REASON_CODES.DEFECTIVE &&
      inspected.deliveries[0]?.rejectionReasonCode ===
        SALES_REJECTION_REASON_CODES.DEFECTIVE,
  });

  const completeWhileOutstanding = await caughtCode(() =>
    sales.requestOrderCompletion(physical.maker, physical.confirmed.id)
  );
  results.push({
    name: "ac-005:header-completion-blocked-while-outstanding",
    ok: completeWhileOutstanding === "COMPLETION_BLOCKED",
    detail: completeWhileOutstanding ?? "no-throw",
  });

  const exceed = await caughtCode(() =>
    delivery.recordPhysicalDelivery(physical.maker, {
      orderId: physical.confirmed.id,
      orderLineId: physicalLineId,
      claimedQuantity: 6,
    })
  );
  results.push({
    name: "rt-05:delivered-cannot-exceed-ordered",
    ok: exceed === "DELIVERED_EXCEEDS_ORDERED",
    detail: exceed ?? "no-throw",
  });

  const fullRejectHarness = harness();
  const fullReject = await confirmOrder(
    fullRejectHarness.sales,
    "offering-physical",
    50
  );
  const fullRejectLine = firstLineId(fullRejectHarness.store, fullReject.confirmed.id);
  const fullArrived = await fullRejectHarness.delivery.recordPhysicalDelivery(
    fullReject.maker,
    {
      orderId: fullReject.confirmed.id,
      orderLineId: fullRejectLine,
      claimedQuantity: 50,
    }
  );
  const fullRejected = await fullRejectHarness.delivery.inspectDelivery(
    ctx("biz-a", "inspector-2"),
    {
      orderId: fullReject.confirmed.id,
      deliveryEventId: fullArrived.deliveries[0]!.id,
      acceptedQuantity: 0,
      rejectedQuantity: 50,
      comments: "Entire shipment damaged",
      rejectionReasonCode: SALES_REJECTION_REASON_CODES.DAMAGED,
      qualityFindingCode: SALES_REJECTION_REASON_CODES.DAMAGED,
    }
  );
  results.push({
    name: "ac-003:full-rejection-with-reason",
    ok:
      fullRejected.fulfilment.acceptedQuantity === "0" &&
      fullRejected.fulfilment.rejectedQuantity === "50" &&
      fullRejected.fulfilment.deliveredQuantity === "50" &&
      fullRejected.fulfilment.outstandingQuantity === "50" &&
      fullRejected.deliveries[0]?.rejectionReasonCode ===
        SALES_REJECTION_REASON_CODES.DAMAGED,
  });

  const serviceHarness = harness();
  const serviceOrder = await confirmOrder(
    serviceHarness.sales,
    "offering-service",
    1
  );
  const serviceLineId = firstLineId(serviceHarness.store, serviceOrder.confirmed.id);
  results.push({
    name: "setup:service-line-type",
    ok: serviceOrder.confirmed.lines[0]?.lineType === SALES_ORDER_LINE_TYPES.SERVICE,
  });

  const serviceMismatch = await caughtCode(() =>
    serviceHarness.delivery.recordPhysicalDelivery(serviceOrder.maker, {
      orderId: serviceOrder.confirmed.id,
      orderLineId: serviceLineId,
      claimedQuantity: 1,
    })
  );
  results.push({
    name: "boundary:physical-flow-rejected-on-service-line",
    ok: serviceMismatch === "LINE_TYPE_MISMATCH",
    detail: serviceMismatch ?? "no-throw",
  });

  const started = await serviceHarness.delivery.startServiceDelivery(
    serviceOrder.maker,
    {
      orderId: serviceOrder.confirmed.id,
      orderLineId: serviceLineId,
    }
  );
  results.push({
    name: "service:started-in-progress",
    ok:
      started.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS &&
      started.deliveries[0]?.status ===
        SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_IN_PROGRESS,
  });

  const selfComplete = await caughtCode(() =>
    serviceHarness.delivery.completeServiceDelivery(serviceOrder.maker, {
      orderId: serviceOrder.confirmed.id,
      deliveryEventId: started.deliveries[0]!.id,
      evidenceNote: "Work finished by the same person",
    })
  );
  results.push({
    name: "ac-006:maker-cannot-complete-own-service",
    ok: selfComplete === "SOD_VIOLATION",
    detail: selfComplete ?? "no-throw",
  });

  const noEvidence = await caughtCode(() =>
    serviceHarness.delivery.completeServiceDelivery(inspector, {
      orderId: serviceOrder.confirmed.id,
      deliveryEventId: started.deliveries[0]!.id,
    })
  );
  results.push({
    name: "service:evidence-required",
    ok: noEvidence === "EVIDENCE_REQUIRED",
    detail: noEvidence ?? "no-throw",
  });

  const completedService = await serviceHarness.delivery.completeServiceDelivery(
    inspector,
    {
      orderId: serviceOrder.confirmed.id,
      deliveryEventId: started.deliveries[0]!.id,
      evidenceNote: "Advisory session completed with the customer present.",
    }
  );
  const payment = await serviceHarness.sales.getPaymentReadyContract(
    serviceOrder.maker,
    serviceOrder.confirmed.id
  );
  const inventory = await serviceHarness.sales.getFulfilmentHandoffContract(
    serviceOrder.maker,
    serviceOrder.confirmed.id
  );
  const booking = await serviceHarness.delivery.getBookingHandoff(
    serviceOrder.maker,
    serviceOrder.confirmed.id
  );
  results.push({
    name: "ac-008:service-complete-without-inventory",
    ok:
      completedService.fulfilment.acceptedQuantity === "1" &&
      completedService.fulfilment.outstandingQuantity === "0" &&
      inventory.inventoryExecuted === false &&
      inventory.stockMoved === false &&
      booking.schedulerExecuted === false &&
      payment.paymentRecorded === false &&
      payment.paymentStatus === "NOT_RECORDED",
  });
  results.push({
    name: "ac-009:no-return-refund-or-stock-movement",
    ok:
      inventory.inventoryExecuted === false &&
      inventory.stockMoved === false &&
      inventory.stockOnHand === null &&
      payment.collectedAmount === null &&
      !JSON.stringify(inventory).toLowerCase().includes("refund") &&
      Number(inventory.lines[0]?.returnReplaceQuantity ?? 0) === 0,
  });

  const cancelHarness = harness();
  const cancelOrder = await confirmOrder(
    cancelHarness.sales,
    "offering-physical",
    10
  );
  cancelHarness.disposition.authorizeCancellation(
    "biz-a",
    cancelOrder.confirmed.id,
    "Test cancellation"
  );
  await cancelHarness.sales.recognizeCancellation(
    cancelOrder.checker,
    cancelOrder.confirmed.id,
    { reason: "Test cancellation" }
  );
  const cancelledDelivery = await caughtCode(() =>
    cancelHarness.delivery.recordPhysicalDelivery(cancelOrder.maker, {
      orderId: cancelOrder.confirmed.id,
      orderLineId: firstLineId(cancelHarness.store, cancelOrder.confirmed.id),
      claimedQuantity: 1,
    })
  );
  results.push({
    name: "ac-010:cancelled-order-cannot-receive-delivery",
    ok: cancelledDelivery === "ORDER_CANCELLED",
    detail: cancelledDelivery ?? "no-throw",
  });

  const isolated = await caughtCode(() =>
    delivery.recordPhysicalDelivery(otherBiz, {
      orderId: physical.confirmed.id,
      orderLineId: physicalLineId,
      claimedQuantity: 1,
    })
  );
  results.push({
    name: "tenant:other-business-cannot-record-delivery",
    ok: isolated === "ORDER_NOT_FOUND" || isolated === "CROSS_BUSINESS_ACCESS",
    detail: isolated ?? "no-throw",
  });

  const audited = [
    SALES_AUDIT_ACTIONS.DELIVERY_RECORDED,
    SALES_AUDIT_ACTIONS.INSPECTION_RECORDED,
    SALES_AUDIT_ACTIONS.SERVICE_STARTED,
    SALES_AUDIT_ACTIONS.SERVICE_COMPLETED,
  ];
  const seen = new Set(audit.entries.map((entry) => entry.action));
  const serviceSeen = new Set(
    serviceHarness.audit.entries.map((entry) => entry.action)
  );
  results.push({
    name: "ac-012:delivery-inspection-service-audited",
    ok:
      seen.has(SALES_AUDIT_ACTIONS.DELIVERY_RECORDED) &&
      seen.has(SALES_AUDIT_ACTIONS.INSPECTION_RECORDED) &&
      serviceSeen.has(SALES_AUDIT_ACTIONS.SERVICE_STARTED) &&
      serviceSeen.has(SALES_AUDIT_ACTIONS.SERVICE_COMPLETED),
    detail: audited.filter((action) => !seen.has(action) && !serviceSeen.has(action)).join(","),
  });

  results.push({
    name: "ac-011:no-appointment-calendar",
    ok: booking.schedulerExecuted === false && booking.lines.length === 1,
  });

  const alreadyInspected = await caughtCode(() =>
    delivery.inspectDelivery(inspector, {
      orderId: physical.confirmed.id,
      deliveryEventId: arrived.deliveries[0]!.id,
      acceptedQuantity: 80,
      rejectedQuantity: 15,
      comments: "Second inspect",
      rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
    })
  );
  results.push({
    name: "inspection:one-outcome-per-arrival",
    ok: alreadyInspected === "DELIVERY_ALREADY_INSPECTED",
    detail: alreadyInspected ?? "no-throw",
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, IP02_SKIP_REGRESSION: "1" },
    timeout: 420_000,
  });
  return {
    name: `regression:${path.basename(script)}`,
    ok: result.status === 0,
    detail:
      result.status === 0
        ? undefined
        : (result.stdout || result.stderr || `exit=${result.status}`).slice(-800),
  };
}

async function main() {
  const coreResults: SmokeResult[] = [
    ...checkFiles(),
    checkJournal(),
    checkNoLineFulfilledColumn(),
    checkUxLanguage(),
    checkNoInventoryOrReturn(),
    ...(await runCoreCases()),
  ];

  const regressionResults: SmokeResult[] = [];
  if (process.env.IP03_SKIP_REGRESSION !== "1") {
    const regressions = [
      "scripts/bp006-ip01-sales-order-creation-smoke-validation.ts",
      "scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts",
      "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
      "scripts/bp004-ip010-quotation-smoke-validation.ts",
      "scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts",
    ];
    for (const script of regressions) {
      if (existsSync(path.join(ROOT, script))) {
        regressionResults.push(runExternal(script));
      }
    }
  }

  const results = [...coreResults, ...regressionResults];
  const coreFailed = coreResults.filter((item) => !item.ok);
  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    const mark = item.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
  }
  console.log(
    `\nCore: ${coreResults.length - coreFailed.length}/${coreResults.length} passed. All checks: ${results.length - failed.length}/${results.length} passed.`
  );
  process.exit(coreFailed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
