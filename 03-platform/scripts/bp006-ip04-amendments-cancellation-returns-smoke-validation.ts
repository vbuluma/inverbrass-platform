/**
 * Purpose:
 * Smoke-validate BP-006 / IP-04 Amendments, Cancellation & Returns.
 *
 * Usage:
 *   npx tsx scripts/bp006-ip04-amendments-cancellation-returns-smoke-validation.ts
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
import { createPersistedOrderDispositionAdapter } from "@/modules/sales/adapters/order-disposition-adapter";
import {
  SALES_AUDIT_ACTIONS,
  SALES_CANCELLATION_REASON_CODES,
  SALES_DISPOSITION_TYPES,
  SALES_ORDER_STATUS_CODES,
  SALES_REJECTION_REASON_CODES,
  SALES_RETURN_REASON_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError } from "@/modules/sales/errors";
import type { CommercialContractPort } from "@/modules/sales/ports";
import { InMemorySalesDeliveryStore } from "@/modules/sales/services/sales-delivery-memory-store";
import { SalesDeliveryService } from "@/modules/sales/services/sales-delivery-service";
import { InMemorySalesExceptionStore } from "@/modules/sales/services/sales-exception-memory-store";
import { SalesExceptionService } from "@/modules/sales/services/sales-exception-service";
import { RecordingSalesAudit } from "@/modules/sales/services/sales-order-audit-helper";
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
  "drizzle/0060_bp006_ip004_amendments_cancellation_returns.sql",
  "src/db/schema/sales-exception.ts",
  "src/modules/sales/services/exception-rules.ts",
  "src/modules/sales/services/sales-exception-service.ts",
  "src/modules/sales/components/sales-exception-panel.tsx",
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
  const exceptions = new InMemorySalesExceptionStore();
  const audit = new RecordingSalesAudit();
  const sales = new SalesOrderService({
    orders: store,
    parties: new InMemoryPartyLookup([
      { id: "party-1", businessId: "biz-a", displayName: "Test Customer Alpha" },
    ]),
    offerings: new InMemoryOfferingLookup([
      {
        id: "offering-physical",
        businessId: "biz-a",
        productCode: "JA-PHYS-001",
        productName: "Journey Alpha Physical Pack",
        productTypeCode: "PHYSICAL_PRODUCT",
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
    disposition: createPersistedOrderDispositionAdapter(exceptions),
    deliveries,
    exceptions,
  });
  const delivery = new SalesDeliveryService({
    orders: store,
    deliveries,
    sales,
    audit,
  });
  const exceptionsSvc = new SalesExceptionService({
    orders: store,
    exceptions,
    sales,
    commercial: commercialPort(),
    audit,
  });
  return { sales, delivery, exceptionsSvc, store, audit };
}

function firstLineId(store: InMemorySalesOrderStore, orderId: string) {
  return store.lines.get(orderId)?.[0]?.id ?? "";
}

async function confirmOrder(
  sales: SalesOrderService,
  quantity: number
) {
  const maker = ctx("biz-a", "maker-1");
  const checker = ctx("biz-a", "checker-1");
  const created = await sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-physical", quantity)],
  });
  await sales.submitConfirmation(maker, created.id);
  const confirmed = await sales.approveConfirmation(checker, created.id);
  return { maker, checker, created, confirmed };
}

async function inspectSplit(
  h: ReturnType<typeof harness>,
  orderId: string,
  lineId: string
) {
  const maker = ctx("biz-a", "maker-1");
  const inspector = ctx("biz-a", "inspector-1");
  const arrived = await h.delivery.recordPhysicalDelivery(maker, {
    orderId,
    orderLineId: lineId,
    claimedQuantity: 100,
  });
  return h.delivery.inspectDelivery(inspector, {
    orderId,
    deliveryEventId: arrived.deliveries[0]!.id,
    acceptedQuantity: 80,
    rejectedQuantity: 15,
    comments: "15 defective, 5 missing",
    rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
  });
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `file:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkJournal(): SmokeResult {
  const journal = readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8");
  return {
    name: "journal:0060_bp006_ip004_amendments_cancellation_returns",
    ok: journal.includes("0060_bp006_ip004_amendments_cancellation_returns"),
  };
}

function checkUxLanguage(): SmokeResult {
  const panel = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-exception-panel.tsx"),
    "utf8"
  );
  return {
    name: "ux:business-language-exceptions",
    ok:
      panel.includes("Request cancellation") &&
      panel.includes("Return and replace") &&
      panel.includes("Return and credit") &&
      panel.includes("Request a quantity change") &&
      panel.includes("do not refund money or move stock") &&
      !panel.includes(">IP-04<") &&
      !panel.includes("M-Pesa"),
  };
}

function checkNoExecution(): SmokeResult {
  const service = readFileSync(
    path.join(ROOT, "src/modules/sales/services/sales-exception-service.ts"),
    "utf8"
  );
  return {
    name: "boundary:no-refund-or-stock-execution",
    ok:
      !service.includes("@/modules/inventory") &&
      !service.includes("@/modules/payment") &&
      service.includes("refundExecuted: false") &&
      service.includes("stockMoved: false"),
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
  const inspector = ctx("biz-a", "inspector-1");

  const draftHarness = harness();
  const maker = ctx("biz-a", "maker-1");
  const draft = await draftHarness.sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-physical", 2)],
  });
  const edited = await draftHarness.sales.updateDraft(maker, draft.id, {
    lines: [await buildLine("biz-a", "offering-physical", 3)],
  });
  results.push({
    name: "ac-001:draft-can-be-edited",
    ok: edited.status === SALES_ORDER_STATUS_CODES.DRAFT && edited.lines[0]?.orderedQuantity === "3",
  });

  const confirmedHarness = harness();
  const confirmed = await confirmOrder(confirmedHarness.sales, 10);
  const inPlaceLine = await buildLine("biz-a", "offering-physical", 9);
  const inPlace = await caughtCode(() =>
    confirmedHarness.sales.updateDraft(confirmed.maker, confirmed.confirmed.id, {
      lines: [inPlaceLine],
    })
  );
  results.push({
    name: "ac-002:confirmed-in-place-edit-rejected",
    ok: inPlace === "MATERIAL_VALUE_IMMUTABLE",
    detail: inPlace ?? "no-throw",
  });

  const amendLine = await buildLine("biz-a", "offering-physical", 8);
  const proposed = await confirmedHarness.exceptionsSvc.proposeAmendment(confirmed.maker, {
    orderId: confirmed.confirmed.id,
    orderLineId: firstLineId(confirmedHarness.store, confirmed.confirmed.id),
    quantity: 8,
    reason: "Customer reduced the order",
    snapshot: amendLine.snapshot,
    expected: amendLine.expected,
  });
  results.push({
    name: "ac-003:amendment-proposed-not-applied",
    ok:
      proposed.expectedAmount === confirmed.confirmed.expectedAmount &&
      proposed.amendments[0]?.status === "PROPOSED" &&
      proposed.lines[0]?.orderedQuantity === "10",
  });
  const selfAmend = await caughtCode(() =>
    confirmedHarness.exceptionsSvc.approveAmendment(
      confirmed.maker,
      confirmed.confirmed.id,
      proposed.amendments[0]!.id
    )
  );
  results.push({
    name: "ac-008:maker-cannot-approve-own-amendment",
    ok: selfAmend === "SOD_VIOLATION",
    detail: selfAmend ?? "no-throw",
  });
  const approvedAmend = await confirmedHarness.exceptionsSvc.approveAmendment(
    confirmed.checker,
    confirmed.confirmed.id,
    proposed.amendments[0]!.id
  );
  results.push({
    name: "ac-003:approved-amendment-applies-new-contract",
    ok:
      approvedAmend.lines[0]?.orderedQuantity === "8" &&
      approvedAmend.expectedAmount !== confirmed.confirmed.expectedAmount &&
      approvedAmend.amendments[0]?.previousExpectedAmount ===
        confirmed.confirmed.expectedAmount,
  });

  const failHarness = harness();
  const failOrder = await confirmOrder(failHarness.sales, 10);
  const mismatchedSnapshot = (await buildLine("biz-a", "offering-physical", 10)).snapshot;
  const mismatch = await caughtCode(() =>
    failHarness.exceptionsSvc.proposeAmendment(failOrder.maker, {
      orderId: failOrder.confirmed.id,
      orderLineId: firstLineId(failHarness.store, failOrder.confirmed.id),
      quantity: 8,
      reason: "Invalid contract",
      snapshot: mismatchedSnapshot,
    })
  );
  const unchanged = await failHarness.sales.getOrder(
    failOrder.maker,
    failOrder.confirmed.id
  );
  results.push({
    name: "ac-004:failed-contract-leaves-original",
    ok:
      mismatch === "QUANTITY_CONTRACT_MISMATCH" &&
      unchanged.expectedAmount === failOrder.confirmed.expectedAmount &&
      unchanged.amendments.length === 0,
    detail: mismatch ?? "no-throw",
  });

  const completeHarness = harness();
  const completeOrder = await confirmOrder(completeHarness.sales, 1);
  const completeLine = firstLineId(completeHarness.store, completeOrder.confirmed.id);
  await completeHarness.delivery.recordPhysicalDelivery(completeOrder.maker, {
    orderId: completeOrder.confirmed.id,
    orderLineId: completeLine,
    claimedQuantity: 1,
  });
  const arrived = await completeHarness.sales.getOrder(
    completeOrder.maker,
    completeOrder.confirmed.id
  );
  await completeHarness.delivery.inspectDelivery(inspector, {
    orderId: completeOrder.confirmed.id,
    deliveryEventId: arrived.deliveries[0]!.id,
    acceptedQuantity: 1,
    rejectedQuantity: 0,
    comments: "Accepted in full",
  });
  // 1 accepted still has outstanding 0; completion SoD still required — skip full complete
  const completedCancel = await caughtCode(async () => {
    const sodOff = harness();
    const created = await sodOff.sales.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [await buildLine("biz-a", "offering-physical", 1)],
    });
    await sodOff.sales.submitConfirmation(maker, created.id);
    const conf = await sodOff.sales.approveConfirmation(
      ctx("biz-a", "checker-1"),
      created.id
    );
    await sodOff.sales.recognizeCancellation(ctx("biz-a", "checker-1"), conf.id, {
      reason: "no",
    });
  });
  results.push({
    name: "cancel:unauthorised-without-instruction",
    ok: completedCancel === "CANCELLATION_NOT_AUTHORIZED",
    detail: completedCancel ?? "no-throw",
  });

  const doneHarness = harness();
  const done = await confirmOrder(doneHarness.sales, 1);
  doneHarness.store.orders.get(done.confirmed.id)!.status = SALES_ORDER_STATUS_CODES.COMPLETED;
  const cancelCompleted = await caughtCode(() =>
    doneHarness.exceptionsSvc.requestCancellation(done.maker, {
      orderId: done.confirmed.id,
      reasonCode: SALES_CANCELLATION_REASON_CODES.CUSTOMER_REQUEST,
    })
  );
  results.push({
    name: "ac-005:completed-cannot-cancel-ordinary",
    ok: cancelCompleted === "COMPLETED_ORDER_NOT_CANCELLABLE",
    detail: cancelCompleted ?? "no-throw",
  });

  const cancelHarness = harness();
  const toCancel = await confirmOrder(cancelHarness.sales, 2);
  const requested = await cancelHarness.exceptionsSvc.requestCancellation(toCancel.maker, {
    orderId: toCancel.confirmed.id,
    reasonCode: SALES_CANCELLATION_REASON_CODES.CUSTOMER_REQUEST,
    comments: "Customer withdrew",
  });
  results.push({
    name: "ac-006:cancellation-reason-recorded",
    ok:
      requested.status !== SALES_ORDER_STATUS_CODES.CANCELLED &&
      requested.dispositions[0]?.reasonCode ===
        SALES_CANCELLATION_REASON_CODES.CUSTOMER_REQUEST,
  });
  const selfCancel = await caughtCode(() =>
    cancelHarness.exceptionsSvc.approveCancellation(toCancel.maker, toCancel.confirmed.id)
  );
  results.push({
    name: "ac-008:maker-cannot-approve-own-cancel",
    ok: selfCancel === "SOD_VIOLATION",
    detail: selfCancel ?? "no-throw",
  });
  const cancelled = await cancelHarness.exceptionsSvc.approveCancellation(
    toCancel.checker,
    toCancel.confirmed.id
  );
  results.push({
    name: "ac-006:cancellation-approved",
    ok: cancelled.status === SALES_ORDER_STATUS_CODES.CANCELLED,
  });
  const fulfilCancelled = await caughtCode(() =>
    cancelHarness.delivery.recordPhysicalDelivery(toCancel.maker, {
      orderId: toCancel.confirmed.id,
      orderLineId: firstLineId(cancelHarness.store, toCancel.confirmed.id),
      claimedQuantity: 1,
    })
  );
  results.push({
    name: "ac-009:cancelled-cannot-be-fulfilled",
    ok: fulfilCancelled === "ORDER_CANCELLED",
    detail: fulfilCancelled ?? "no-throw",
  });

  const replaceHarness = harness();
  const replaceOrder = await confirmOrder(replaceHarness.sales, 100);
  const replaceLine = firstLineId(replaceHarness.store, replaceOrder.confirmed.id);
  await inspectSplit(replaceHarness, replaceOrder.confirmed.id, replaceLine);
  const replaceRequested = await replaceHarness.exceptionsSvc.initiateLineDisposition(
    replaceOrder.maker,
    {
      orderId: replaceOrder.confirmed.id,
      orderLineId: replaceLine,
      instructionType: SALES_DISPOSITION_TYPES.RETURN_REPLACE,
      reasonCode: SALES_RETURN_REASON_CODES.REJECTED_GOODS,
    }
  );
  const selfReturn = await caughtCode(() =>
    replaceHarness.exceptionsSvc.approveDisposition(
      replaceOrder.maker,
      replaceOrder.confirmed.id,
      replaceRequested.dispositions[0]!.id
    )
  );
  results.push({
    name: "ac-008:maker-cannot-approve-own-return",
    ok: selfReturn === "SOD_VIOLATION",
    detail: selfReturn ?? "no-throw",
  });
  const replaced = await replaceHarness.exceptionsSvc.approveDisposition(
    replaceOrder.checker,
    replaceOrder.confirmed.id,
    (await replaceHarness.sales.getOrder(replaceOrder.maker, replaceOrder.confirmed.id))
      .dispositions[0]!.id
  );
  const finance = await replaceHarness.exceptionsSvc.getFinancialInstruction(
    replaceOrder.maker,
    replaceOrder.confirmed.id
  );
  const stock = await replaceHarness.exceptionsSvc.getStockReturnInstruction(
    replaceOrder.maker,
    replaceOrder.confirmed.id
  );
  results.push({
    name: "ac-012:return-replace-outstanding-20",
    ok:
      replaced.fulfilment.outstandingQuantity === "20" &&
      replaced.fulfilment.missingQuantity === "5" &&
      replaced.fulfilment.rejectedQuantity === "15",
    detail: `outstanding=${replaced.fulfilment.outstandingQuantity}`,
  });
  results.push({
    name: "ac-007:return-does-not-refund-or-move-stock",
    ok:
      finance.refundExecuted === false &&
      finance.paymentRecorded === false &&
      stock.stockMoved === false &&
      stock.inventoryExecuted === false,
  });
  results.push({
    name: "ac-010:ip04-does-not-inspect",
    ok: replaced.deliveries.length === 1 && replaced.deliveries[0]?.status === "INSPECTED",
  });

  const creditHarness = harness();
  const creditOrder = await confirmOrder(creditHarness.sales, 100);
  const creditLine = firstLineId(creditHarness.store, creditOrder.confirmed.id);
  await inspectSplit(creditHarness, creditOrder.confirmed.id, creditLine);
  await creditHarness.exceptionsSvc.initiateLineDisposition(creditOrder.maker, {
    orderId: creditOrder.confirmed.id,
    orderLineId: creditLine,
    instructionType: SALES_DISPOSITION_TYPES.RETURN_CREDIT,
    reasonCode: SALES_RETURN_REASON_CODES.REJECTED_GOODS,
  });
  const credited = await creditHarness.exceptionsSvc.approveDisposition(
    creditOrder.checker,
    creditOrder.confirmed.id,
    (await creditHarness.sales.getOrder(creditOrder.maker, creditOrder.confirmed.id))
      .dispositions[0]!.id
  );
  results.push({
    name: "ac-012:return-credit-outstanding-5",
    ok:
      credited.fulfilment.outstandingQuantity === "5" &&
      credited.fulfilment.missingQuantity === "5" &&
      credited.fulfilment.openRejectedQuantity === "0",
    detail: `outstanding=${credited.fulfilment.outstandingQuantity}`,
  });
  results.push({
    name: "ac-011:replace-or-return-from-rejected-qty",
    ok:
      replaced.dispositions[0]?.instructionType === SALES_DISPOSITION_TYPES.RETURN_REPLACE &&
      credited.dispositions[0]?.instructionType === SALES_DISPOSITION_TYPES.RETURN_CREDIT,
  });

  const audited = new Set(replaceHarness.audit.entries.map((entry) => entry.action));
  results.push({
    name: "audit:cancel-return-amendment-events",
    ok:
      cancelHarness.audit.entries.some(
        (entry) => entry.action === SALES_AUDIT_ACTIONS.CANCELLATION_REQUESTED
      ) &&
      audited.has(SALES_AUDIT_ACTIONS.DISPOSITION_REQUESTED) &&
      audited.has(SALES_AUDIT_ACTIONS.DISPOSITION_APPROVED),
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, IP02_SKIP_REGRESSION: "1", IP03_SKIP_REGRESSION: "1" },
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
    checkUxLanguage(),
    checkNoExecution(),
    ...(await runCoreCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP04_SKIP_REGRESSION !== "1") {
    for (const script of [
      "scripts/bp006-ip01-sales-order-creation-smoke-validation.ts",
      "scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts",
      "scripts/bp006-ip03-delivery-inspection-service-smoke-validation.ts",
    ]) {
      if (existsSync(path.join(ROOT, script))) {
        regressionResults.push(runExternal(script));
      }
    }
  }
  const results = [...coreResults, ...regressionResults];
  const coreFailed = coreResults.filter((item) => !item.ok);
  for (const item of results) {
    console.log(
      `[${item.ok ? "PASS" : "FAIL"}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`
    );
  }
  console.log(
    `\nCore: ${coreResults.length - coreFailed.length}/${coreResults.length} passed. All checks: ${results.length - coreFailed.length - regressionResults.filter((item) => !item.ok).length}/${results.length} passed.`
  );
  process.exit(coreFailed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
