/**
 * Purpose:
 * Smoke-validate BP-006 / IP-02 Order Lifecycle & Fulfilment.
 *
 * Usage:
 *   npx tsx scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts
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
import { InjectedCompletionChecklistAdapter } from "@/modules/sales/adapters/completion-checklist-adapter";
import { InMemoryFulfilmentOutcomeAdapter } from "@/modules/sales/adapters/fulfilment-outcome-adapter";
import { InMemoryOrderDispositionAdapter } from "@/modules/sales/adapters/order-disposition-adapter";
import {
  SALES_COMPLETION_BLOCKER_CODES,
  SALES_INSPECTION_STATUS_CODES,
  SALES_ORDER_STATUS_CODES,
  SALES_SERVICE_COMPLETION_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError } from "@/modules/sales/errors";
import type { CommercialContractPort, LineFulfilmentOutcome } from "@/modules/sales/ports";
import { RecordingSalesAudit } from "@/modules/sales/services/sales-order-audit-helper";
import {
  deriveLineQuantities,
} from "@/modules/sales/services/order-lifecycle-rules";
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
  "drizzle/0058_bp006_ip002_order_lifecycle_fulfilment.sql",
  "src/modules/sales/services/order-lifecycle-rules.ts",
  "src/modules/sales/adapters/fulfilment-outcome-adapter.ts",
  "src/modules/sales/adapters/order-disposition-adapter.ts",
  "src/modules/sales/adapters/completion-checklist-adapter.ts",
  "src/modules/sales/components/sales-order-workspace.tsx",
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
    offeringId: "offering-1",
    offeringCode: "JA-ADV-001",
    offeringName: "Journey Alpha Advisory Service",
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
        partyId: "party-1",
        quantity: 10,
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

function harness(options?: {
  completionSod?: boolean;
  checklistFail?: boolean;
}) {
  const store = new InMemorySalesOrderStore();
  const audit = new RecordingSalesAudit();
  const outcomes = new InMemoryFulfilmentOutcomeAdapter();
  const disposition = new InMemoryOrderDispositionAdapter();
  const service = new SalesOrderService({
    orders: store,
    parties: new InMemoryPartyLookup([
      { id: "party-1", businessId: "biz-a", displayName: "Test Customer Alpha" },
      { id: "party-b", businessId: "biz-b", displayName: "Other Business Customer" },
    ]),
    offerings: new InMemoryOfferingLookup([
      {
        id: "offering-1",
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
    completionPolicy: {
      requiresSegregationOfDuties: options?.completionSod ?? true,
    },
    fulfilmentOutcomes: outcomes,
    disposition,
    completionChecklist: options?.checklistFail
      ? new InjectedCompletionChecklistAdapter({
          passed: false,
          blockers: [SALES_COMPLETION_BLOCKER_CODES.CHECKLIST_FAILED],
          items: [
            {
              code: "FORCED_FAIL",
              name: "Forced checklist failure",
              mandatory: true,
              passed: false,
              blockerCode: SALES_COMPLETION_BLOCKER_CODES.CHECKLIST_FAILED,
            },
          ],
        })
      : undefined,
  });
  return { service, store, audit, outcomes, disposition };
}

function firstLineId(store: InMemorySalesOrderStore, orderId: string) {
  return store.lines.get(orderId)?.[0]?.id ?? "";
}

function outcome(
  businessId: string,
  orderId: string,
  orderLineId: string,
  values: Partial<LineFulfilmentOutcome> & {
    acceptedQuantity: number;
    rejectedQuantity?: number;
  }
): LineFulfilmentOutcome {
  return {
    businessId,
    orderId,
    orderLineId,
    acceptedQuantity: values.acceptedQuantity,
    rejectedQuantity: values.rejectedQuantity ?? 0,
    inspectionStatus:
      values.inspectionStatus ?? SALES_INSPECTION_STATUS_CODES.NOT_REQUIRED,
    serviceCompletionStatus:
      values.serviceCompletionStatus ??
      SALES_SERVICE_COMPLETION_STATUS_CODES.NOT_REQUIRED,
    hasActivity: values.hasActivity ?? true,
    mandatoryEvidenceMissing: values.mandatoryEvidenceMissing ?? false,
  };
}

async function confirmOrder(
  service: SalesOrderService,
  quantity = 10
) {
  const maker = ctx("biz-a", "maker-1");
  const checker = ctx("biz-a", "checker-1");
  const created = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-1", quantity)],
  });
  await service.submitConfirmation(maker, created.id);
  const confirmed = await service.approveConfirmation(checker, created.id);
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
    name: "journal:0058_bp006_ip002_order_lifecycle_fulfilment",
    ok: journal.includes("0058_bp006_ip002_order_lifecycle_fulfilment"),
  };
}

function checkNoInventedQuantity(): SmokeResult {
  const schema = readFileSync(
    path.join(ROOT, "src/db/schema/sales-order.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0058_bp006_ip002_order_lifecycle_fulfilment.sql"),
    "utf8"
  );
  return {
    name: "no-ip02-fulfilled-quantity-column",
    ok:
      !schema.includes("fulfilledQuantity") &&
      !schema.includes("fulfilled_quantity") &&
      !migration.includes("fulfilled_quantity") &&
      !migration.includes("accepted_quantity"),
  };
}

function checkUxLanguage(): SmokeResult {
  const workspace = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-order-workspace.tsx"),
    "utf8"
  );
  return {
    name: "ux:business-language-lifecycle",
    ok:
      workspace.includes("Completion blocked") &&
      workspace.includes("Sale progress") &&
      workspace.includes("Payment not yet recorded") &&
      !workspace.includes(">IP-02<") &&
      !workspace.includes(">ENG-003l<") &&
      !workspace.includes(">ENG-005<"),
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
  const { service, store, audit, outcomes } = harness();
  const maker = ctx("biz-a", "maker-1");
  const checker = ctx("biz-a", "checker-1");

  const { confirmed } = await confirmOrder(service, 10);
  results.push({
    name: "lifecycle:draft-to-confirmed",
    ok: confirmed.status === SALES_ORDER_STATUS_CODES.CONFIRMED,
  });

  const lineId = firstLineId(store, confirmed.id);
  outcomes.setLine(
    "biz-a",
    confirmed.id,
    outcome("biz-a", confirmed.id, lineId, {
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      hasActivity: true,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PENDING,
    })
  );
  const inProgress = await service.applyFulfilmentOutcomes(maker, confirmed.id);
  results.push({
    name: "lifecycle:confirmed-to-in-progress",
    ok: inProgress.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS,
    detail: inProgress.status,
  });

  outcomes.setLine(
    "biz-a",
    confirmed.id,
    outcome("biz-a", confirmed.id, lineId, {
      acceptedQuantity: 6,
      rejectedQuantity: 2,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
    })
  );
  const partial = await service.applyFulfilmentOutcomes(maker, confirmed.id);
  const partialLine = partial.lines[0];
  results.push({
    name: "lifecycle:in-progress-to-partially-fulfilled",
    ok:
      partial.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED &&
      Number(partialLine?.acceptedQuantity) === 6 &&
      Number(partialLine?.outstandingQuantity) === 4,
    detail: `${partial.status} outstanding=${partialLine?.outstandingQuantity}`,
  });

  const qtyZero = deriveLineQuantities(10, null, null);
  results.push({
    name: "quantity:zero-accepted-outstanding-equals-ordered",
    ok: qtyZero.accepted === 0 && qtyZero.outstanding === 10,
  });

  const qtyPartial = deriveLineQuantities(
    10,
    outcome("biz-a", "o", "l", { acceptedQuantity: 6, rejectedQuantity: 0 }),
    null
  );
  results.push({
    name: "quantity:partial-accepted-outstanding",
    ok: qtyPartial.outstanding === 4 && qtyPartial.accepted === 6,
  });

  const qtyReject = deriveLineQuantities(
    10,
    outcome("biz-a", "o", "l", { acceptedQuantity: 6, rejectedQuantity: 2 }),
    null
  );
  results.push({
    name: "quantity:accepted-plus-rejected-outstanding",
    ok:
      qtyReject.outstanding === 4 &&
      qtyReject.missing === 2 &&
      qtyReject.missing + qtyReject.openRejected === qtyReject.outstanding,
  });

  results.push({
    name: "quantity:missing-plus-rejected-equals-outstanding",
    ok: qtyReject.missing + qtyReject.rejected === qtyReject.outstanding,
  });

  const acceptedOverflow = await caughtCode(async () => {
    deriveLineQuantities(
      10,
      outcome("biz-a", "o", "l", { acceptedQuantity: 11, rejectedQuantity: 0 }),
      null
    );
  });
  results.push({
    name: "quantity:accepted-cannot-exceed-ordered",
    ok: acceptedOverflow === "ACCEPTED_EXCEEDS_ORDERED",
    detail: acceptedOverflow ?? "no-throw",
  });

  const schema = readFileSync(
    path.join(ROOT, "src/modules/sales/services/sales-order-service.ts"),
    "utf8"
  );
  results.push({
    name: "quantity:ip02-does-not-invent-fulfilled-qty",
    ok:
      !schema.includes("fulfilledQuantity") &&
      schema.includes("deriveOrderLineFulfilment"),
  });

  const outstandingBlock = await caughtCode(() =>
    service.requestOrderCompletion(maker, confirmed.id)
  );
  results.push({
    name: "gate:outstanding-blocks-completion",
    ok: outstandingBlock === "COMPLETION_BLOCKED",
    detail: outstandingBlock ?? "no-throw",
  });

  const inspectHarness = harness();
  const inspectConfirmed = (await confirmOrder(inspectHarness.service, 10)).confirmed;
  const inspectLine = firstLineId(inspectHarness.store, inspectConfirmed.id);
  inspectHarness.outcomes.setLine(
    "biz-a",
    inspectConfirmed.id,
    outcome("biz-a", inspectConfirmed.id, inspectLine, {
      acceptedQuantity: 10,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PENDING,
    })
  );
  await inspectHarness.service.applyFulfilmentOutcomes(maker, inspectConfirmed.id);
  const inspectBlock = await caughtCode(() =>
    inspectHarness.service.requestOrderCompletion(maker, inspectConfirmed.id)
  );
  results.push({
    name: "gate:inspection-pending-blocks-completion",
    ok: inspectBlock === "COMPLETION_BLOCKED",
    detail: inspectBlock ?? "no-throw",
  });

  const serviceHarness = harness();
  const serviceConfirmed = (await confirmOrder(serviceHarness.service, 10)).confirmed;
  const serviceLine = firstLineId(serviceHarness.store, serviceConfirmed.id);
  serviceHarness.outcomes.setLine(
    "biz-a",
    serviceConfirmed.id,
    outcome("biz-a", serviceConfirmed.id, serviceLine, {
      acceptedQuantity: 10,
      serviceCompletionStatus: SALES_SERVICE_COMPLETION_STATUS_CODES.PENDING,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
    })
  );
  await serviceHarness.service.applyFulfilmentOutcomes(maker, serviceConfirmed.id);
  const serviceBlock = await caughtCode(() =>
    serviceHarness.service.requestOrderCompletion(maker, serviceConfirmed.id)
  );
  results.push({
    name: "gate:service-incomplete-blocks-completion",
    ok: serviceBlock === "COMPLETION_BLOCKED",
    detail: serviceBlock ?? "no-throw",
  });

  const dispositionHarness = harness();
  const dispositionConfirmed = (await confirmOrder(dispositionHarness.service, 10))
    .confirmed;
  const dispositionLine = firstLineId(
    dispositionHarness.store,
    dispositionConfirmed.id
  );
  dispositionHarness.outcomes.setLine(
    "biz-a",
    dispositionConfirmed.id,
    outcome("biz-a", dispositionConfirmed.id, dispositionLine, {
      acceptedQuantity: 8,
      rejectedQuantity: 2,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
    })
  );
  await dispositionHarness.service.applyFulfilmentOutcomes(
    maker,
    dispositionConfirmed.id
  );
  const dispositionBlock = await caughtCode(() =>
    dispositionHarness.service.requestOrderCompletion(maker, dispositionConfirmed.id)
  );
  results.push({
    name: "gate:ip04-disposition-blocks-completion",
    ok: dispositionBlock === "COMPLETION_BLOCKED",
    detail: dispositionBlock ?? "no-throw",
  });

  const checklistHarness = harness({ checklistFail: true, completionSod: false });
  const checklistConfirmed = (await confirmOrder(checklistHarness.service, 10))
    .confirmed;
  const checklistLine = firstLineId(checklistHarness.store, checklistConfirmed.id);
  checklistHarness.outcomes.setLine(
    "biz-a",
    checklistConfirmed.id,
    outcome("biz-a", checklistConfirmed.id, checklistLine, {
      acceptedQuantity: 10,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
      serviceCompletionStatus: SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE,
    })
  );
  await checklistHarness.service.applyFulfilmentOutcomes(maker, checklistConfirmed.id);
  const checklistBlock = await caughtCode(() =>
    checklistHarness.service.requestOrderCompletion(maker, checklistConfirmed.id)
  );
  results.push({
    name: "gate:checklist-failure-blocks-completion",
    ok: checklistBlock === "COMPLETION_BLOCKED",
    detail: checklistBlock ?? "no-throw",
  });

  const completeNoSod = harness({ completionSod: false });
  const completeConfirmed = (await confirmOrder(completeNoSod.service, 10)).confirmed;
  const completeLine = firstLineId(completeNoSod.store, completeConfirmed.id);
  completeNoSod.outcomes.setLine(
    "biz-a",
    completeConfirmed.id,
    outcome("biz-a", completeConfirmed.id, completeLine, {
      acceptedQuantity: 10,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
      serviceCompletionStatus: SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE,
    })
  );
  const progressed = await completeNoSod.service.applyFulfilmentOutcomes(
    maker,
    completeConfirmed.id
  );
  const completedDirect = await completeNoSod.service.requestOrderCompletion(
    maker,
    completeConfirmed.id
  );
  results.push({
    name: "lifecycle:in-progress-to-completed",
    ok:
      progressed.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS &&
      completedDirect.status === SALES_ORDER_STATUS_CODES.COMPLETED,
    detail: `${progressed.status} -> ${completedDirect.status}`,
  });
  results.push({
    name: "gate:all-gates-pass-completion-eligible",
    ok: completedDirect.status === SALES_ORDER_STATUS_CODES.COMPLETED,
  });
  results.push({
    name: "sod:completion-without-sod-completes",
    ok: completedDirect.completedBy === "maker-1",
  });

  const partialComplete = harness({ completionSod: false });
  const partialOrder = (await confirmOrder(partialComplete.service, 10)).confirmed;
  const partialLineId = firstLineId(partialComplete.store, partialOrder.id);
  partialComplete.outcomes.setLine(
    "biz-a",
    partialOrder.id,
    outcome("biz-a", partialOrder.id, partialLineId, {
      acceptedQuantity: 6,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
    })
  );
  const becamePartial = await partialComplete.service.applyFulfilmentOutcomes(
    maker,
    partialOrder.id
  );
  partialComplete.outcomes.setLine(
    "biz-a",
    partialOrder.id,
    outcome("biz-a", partialOrder.id, partialLineId, {
      acceptedQuantity: 10,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
      serviceCompletionStatus: SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE,
    })
  );
  await partialComplete.service.applyFulfilmentOutcomes(maker, partialOrder.id);
  const completedFromPartial = await partialComplete.service.requestOrderCompletion(
    maker,
    partialOrder.id
  );
  results.push({
    name: "lifecycle:partially-fulfilled-to-completed",
    ok:
      becamePartial.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED &&
      completedFromPartial.status === SALES_ORDER_STATUS_CODES.COMPLETED,
    detail: `${becamePartial.status} -> ${completedFromPartial.status}`,
  });

  const cancelHarness = harness();
  const cancelOrder = (await confirmOrder(cancelHarness.service, 10)).confirmed;
  const cancelUnauthorized = await caughtCode(() =>
    cancelHarness.service.recognizeCancellation(maker, cancelOrder.id, {
      reason: "Customer asked to stop",
    })
  );
  cancelHarness.disposition.authorizeCancellation(
    "biz-a",
    cancelOrder.id,
    "Customer asked to stop"
  );
  const cancelled = await cancelHarness.service.recognizeCancellation(
    maker,
    cancelOrder.id,
    { reason: "Customer asked to stop" }
  );
  results.push({
    name: "lifecycle:eligible-to-cancelled",
    ok:
      cancelUnauthorized === "CANCELLATION_NOT_AUTHORIZED" &&
      cancelled.status === SALES_ORDER_STATUS_CODES.CANCELLED,
  });

  const invalid = await caughtCode(() =>
    service.transitionOrder(maker, confirmed.id, {
      targetStatus: SALES_ORDER_STATUS_CODES.DRAFT,
    })
  );
  results.push({
    name: "lifecycle:invalid-transition-rejected",
    ok: invalid === "INVALID_STATUS_TRANSITION",
    detail: invalid ?? "no-throw",
  });

  const cancelLine = firstLineId(cancelHarness.store, cancelOrder.id);
  cancelHarness.outcomes.setLine(
    "biz-a",
    cancelOrder.id,
    outcome("biz-a", cancelOrder.id, cancelLine, { acceptedQuantity: 1 })
  );
  const cancelledFulfilment = await caughtCode(() =>
    cancelHarness.service.assertFulfilmentAllowed(maker, cancelOrder.id)
  );
  const cancelledProgress = await cancelHarness.service.applyFulfilmentOutcomes(
    maker,
    cancelOrder.id
  );
  results.push({
    name: "lifecycle:cancelled-fulfilment-rejected",
    ok:
      cancelledFulfilment === "ORDER_CANCELLED" &&
      cancelledProgress.status === SALES_ORDER_STATUS_CODES.CANCELLED,
  });

  const completedEdit = await caughtCode(() =>
    completeNoSod.service.updateDraft(maker, completeConfirmed.id, {
      orderDate: "2026-08-01T00:00:00.000Z",
    })
  );
  results.push({
    name: "lifecycle:completed-ordinary-edit-rejected",
    ok: completedEdit === "MATERIAL_VALUE_IMMUTABLE",
    detail: completedEdit ?? "no-throw",
  });

  const sodHarness = harness({ completionSod: true });
  const sodOrder = (await confirmOrder(sodHarness.service, 10)).confirmed;
  const sodLine = firstLineId(sodHarness.store, sodOrder.id);
  sodHarness.outcomes.setLine(
    "biz-a",
    sodOrder.id,
    outcome("biz-a", sodOrder.id, sodLine, {
      acceptedQuantity: 10,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
      serviceCompletionStatus: SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE,
    })
  );
  await sodHarness.service.applyFulfilmentOutcomes(maker, sodOrder.id);
  const requested = await sodHarness.service.requestOrderCompletion(maker, sodOrder.id);
  results.push({
    name: "sod:completion-with-sod-requires-approval",
    ok:
      requested.status !== SALES_ORDER_STATUS_CODES.COMPLETED &&
      requested.completionSubmittedBy === "maker-1",
    detail: requested.status,
  });

  const selfApprove = await caughtCode(() =>
    sodHarness.service.approveOrderCompletion(maker, sodOrder.id)
  );
  results.push({
    name: "sod:maker-cannot-approve-own-completion",
    ok: selfApprove === "SOD_VIOLATION",
    detail: selfApprove ?? "no-throw",
  });

  const approved = await sodHarness.service.approveOrderCompletion(checker, sodOrder.id);
  results.push({
    name: "sod:checker-can-approve-completion",
    ok:
      approved.status === SALES_ORDER_STATUS_CODES.COMPLETED &&
      approved.completedBy === "checker-1",
  });

  const rejectHarness = harness({ completionSod: true });
  const rejectOrder = (await confirmOrder(rejectHarness.service, 10)).confirmed;
  const rejectLine = firstLineId(rejectHarness.store, rejectOrder.id);
  rejectHarness.outcomes.setLine(
    "biz-a",
    rejectOrder.id,
    outcome("biz-a", rejectOrder.id, rejectLine, {
      acceptedQuantity: 10,
      inspectionStatus: SALES_INSPECTION_STATUS_CODES.PASSED,
      serviceCompletionStatus: SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE,
    })
  );
  await rejectHarness.service.applyFulfilmentOutcomes(maker, rejectOrder.id);
  await rejectHarness.service.requestOrderCompletion(maker, rejectOrder.id);
  const rejected = await rejectHarness.service.rejectOrderCompletion(
    checker,
    rejectOrder.id,
    { reason: "Evidence incomplete" }
  );
  results.push({
    name: "sod:failed-approval-does-not-complete",
    ok:
      rejected.status !== SALES_ORDER_STATUS_CODES.COMPLETED &&
      rejected.completionSubmittedBy === null,
    detail: rejected.status,
  });

  const lifecycleAudits = new Set(
    [...audit.entries, ...completeNoSod.audit.entries, ...sodHarness.audit.entries].map(
      (entry) => entry.action
    )
  );
  results.push({
    name: "audit:material-lifecycle-and-completion",
    ok:
      lifecycleAudits.has("ORDER_CONFIRMED") &&
      completeNoSod.audit.entries.some((entry) => entry.action === "LIFECYCLE_TRANSITIONED") &&
      completeNoSod.audit.entries.some((entry) => entry.action === "ORDER_COMPLETED") &&
      sodHarness.audit.entries.some((entry) => entry.action === "COMPLETION_REQUESTED") &&
      sodHarness.audit.entries.some((entry) => entry.action === "ORDER_COMPLETED") &&
      rejectHarness.audit.entries.some((entry) => entry.action === "COMPLETION_REJECTED"),
    detail: [...lifecycleAudits].join(","),
  });

  const isolatedRead = await caughtCode(() =>
    service.getOrder(ctx("biz-b", "other"), confirmed.id)
  );
  const isolatedTransition = await caughtCode(() =>
    service.transitionOrder(ctx("biz-b", "other"), confirmed.id, {
      targetStatus: SALES_ORDER_STATUS_CODES.IN_PROGRESS,
    })
  );
  const isolatedCompletion = await caughtCode(() =>
    service.requestOrderCompletion(ctx("biz-b", "other"), confirmed.id)
  );
  results.push({
    name: "tenant:cross-business-order-read-fails",
    ok: isolatedRead === "ORDER_NOT_FOUND",
  });
  results.push({
    name: "tenant:cross-business-lifecycle-fails",
    ok: isolatedTransition === "ORDER_NOT_FOUND",
  });
  results.push({
    name: "tenant:cross-business-completion-fails",
    ok: isolatedCompletion === "ORDER_NOT_FOUND",
  });

  const foreign = harness();
  const localOrder = (await confirmOrder(foreign.service, 10)).confirmed;
  const localLine = firstLineId(foreign.store, localOrder.id);
  foreign.outcomes.setOutcome({
    businessId: "biz-a",
    orderId: localOrder.id,
    hasAnyActivity: true,
    lines: [
      outcome("biz-b", localOrder.id, localLine, { acceptedQuantity: 10 }),
    ],
  });
  const foreignOutcome = await caughtCode(() =>
    foreign.service.applyFulfilmentOutcomes(maker, localOrder.id)
  );
  results.push({
    name: "tenant:cross-business-ip03-outcome-cannot-affect-order",
    ok: foreignOutcome === "CROSS_BUSINESS_ACCESS",
    detail: foreignOutcome ?? "no-throw",
  });

  const fresh = harness();
  const untouched = (await confirmOrder(fresh.service, 10)).confirmed;
  const noActivityAdvance = await caughtCode(() =>
    fresh.service.transitionOrder(maker, untouched.id, {
      targetStatus: SALES_ORDER_STATUS_CODES.IN_PROGRESS,
    })
  );
  results.push({
    name: "boundary:no-invented-delivery-for-in-progress",
    ok:
      noActivityAdvance === "FULFILMENT_NOT_ALLOWED" ||
      noActivityAdvance === "INVALID_STATUS_TRANSITION",
    detail: noActivityAdvance ?? "no-throw",
  });

  const readiness = inProgress.readiness;
  results.push({
    name: "readiness:next-action-flags-exposed",
    ok:
      typeof readiness.readyForDelivery === "boolean" &&
      typeof readiness.readyForInspection === "boolean" &&
      typeof readiness.readyForCompletion === "boolean" &&
      Array.isArray(readiness.completionBlockers) &&
      typeof readiness.readyForCancellation === "boolean",
  });

  const directComplete = await caughtCode(() =>
    completeNoSod.service.transitionOrder(maker, completeConfirmed.id, {
      targetStatus: SALES_ORDER_STATUS_CODES.COMPLETED,
    })
  );
  results.push({
    name: "boundary:direct-status-cannot-bypass-completion",
    ok:
      directComplete === "INVALID_STATUS_TRANSITION" ||
      directComplete === "ORDER_ALREADY_COMPLETED",
    detail: directComplete ?? "no-throw",
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
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
    checkNoInventedQuantity(),
    checkUxLanguage(),
    ...(await runCoreCases()),
  ];

  const regressionResults: SmokeResult[] = [];
  if (process.env.IP02_SKIP_REGRESSION !== "1") {
    const regressions = [
      "scripts/bp006-ip01-sales-order-creation-smoke-validation.ts",
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
