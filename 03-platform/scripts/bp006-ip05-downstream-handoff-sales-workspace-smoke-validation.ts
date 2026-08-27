/**
 * Purpose:
 * Smoke-validate BP-006 / IP-05 Downstream Handoff & Sales Workspace.
 *
 * Usage:
 *   npx tsx scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts
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
  SALES_FINANCIAL_INSTRUCTION_TYPES,
  SALES_ORDER_STATUS_CODES,
  SALES_REJECTION_REASON_CODES,
} from "@/modules/sales/constants";
import type { CommercialContractPort } from "@/modules/sales/ports";
import { canCheckerApprove } from "@/modules/sales/services/handoff-rules";
import { InMemorySalesDeliveryStore } from "@/modules/sales/services/sales-delivery-memory-store";
import { SalesDeliveryService } from "@/modules/sales/services/sales-delivery-service";
import { InMemorySalesExceptionStore } from "@/modules/sales/services/sales-exception-memory-store";
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
  "src/modules/sales/services/handoff-rules.ts",
  "src/modules/sales/components/sales-dashboard.tsx",
  "src/modules/sales/components/convert-quote-workspace.tsx",
  "src/modules/sales/components/sales-order-workspace.tsx",
  "src/app/(authenticated)/(app)/sales/convert-quote/page.tsx",
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
        quantity: 1,
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
  return { sales, delivery, store, audit };
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

function checkUxLanguage(): SmokeResult[] {
  const dashboard = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-dashboard.tsx"),
    "utf8"
  );
  const workspace = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-order-workspace.tsx"),
    "utf8"
  );
  const delivery = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-delivery-panel.tsx"),
    "utf8"
  );
  const convert = readFileSync(
    path.join(ROOT, "src/modules/sales/components/convert-quote-workspace.tsx"),
    "utf8"
  );
  return [
    {
      name: "ac-004:sell-price-convert-without-jargon",
      ok:
        dashboard.includes("Sell") &&
        dashboard.includes('href="/sales/new"') &&
        dashboard.includes("Price a sale") &&
        dashboard.includes("Convert quote") &&
        convert.includes("Convert quote") &&
        !dashboard.includes(">IP-05<") &&
        !dashboard.includes(">BP-006<") &&
        !convert.includes(">BP-004<"),
    },
    {
      name: "ac-005:fulfilment-quantities-shown",
      ok:
        workspace.includes("Delivered") &&
        workspace.includes("Accepted") &&
        workspace.includes("Rejected") &&
        workspace.includes("Outstanding") &&
        delivery.includes("Delivered") &&
        delivery.includes("Accepted") &&
        delivery.includes("Rejected") &&
        delivery.includes("Outstanding"),
    },
    {
      name: "ac-006:missing-separate-from-rejected",
      ok: workspace.includes("Missing") && delivery.includes("Missing"),
    },
    {
      name: "ac-007:service-remaining-shown",
      ok: delivery.includes("Remaining to deliver"),
    },
    {
      name: "ac-008:ui-hides-self-approval",
      ok:
        workspace.includes("canCheckerApprove") &&
        delivery.includes("Another authorised person must inspect") &&
        readFileSync(
          path.join(ROOT, "src/modules/sales/components/sales-exception-panel.tsx"),
          "utf8"
        ).includes("Another authorised person must approve"),
    },
    {
      name: "ac-009:payment-not-available",
      ok:
        workspace.includes("Payment not yet recorded") &&
        workspace.includes("not available") &&
        dashboard.includes("not available"),
    },
    {
      name: "ac-010:duplicate-submit-guard",
      ok: workspace.includes("inFlight.current"),
    },
  ];
}

function checkNoExecution(): SmokeResult {
  const rules = readFileSync(
    path.join(ROOT, "src/modules/sales/services/handoff-rules.ts"),
    "utf8"
  );
  const service = readFileSync(
    path.join(ROOT, "src/modules/sales/services/sales-order-service.ts"),
    "utf8"
  );
  return {
    name: "boundary:no-payment-inventory-scheduler-execution",
    ok:
      rules.includes("paymentCollectionAvailable: false") &&
      rules.includes("inventoryExecuted: false") &&
      rules.includes("schedulerExecuted: false") &&
      rules.includes("stockOnHand: null") &&
      rules.includes("tenderSplit: null") &&
      !service.includes("@/modules/inventory") &&
      !service.includes("@/modules/payment") &&
      !rules.includes("cashAmount") &&
      !rules.includes("mpesaAmount"),
  };
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const h = harness();
  const { confirmed } = await confirmOrder(h.sales, "offering-physical", 1);
  const handoff = await h.sales.getDownstreamHandoff(ctx("biz-a", "maker-1"), confirmed.id);

  results.push({
    name: "ac-001:payment-ready-amount-due-no-tender",
    ok:
      handoff.payment.expectedAmount === confirmed.expectedAmount &&
      handoff.payment.tenderSplit === null &&
      handoff.payment.collectedAmount === null &&
      handoff.payment.paymentCollectionAvailable === false &&
      handoff.payment.financialInstructionType === SALES_FINANCIAL_INSTRUCTION_TYPES.SALE &&
      handoff.payment.lines.length === 1 &&
      !("cashAmount" in handoff.payment),
    detail: `due=${handoff.payment.expectedAmount}`,
  });

  results.push({
    name: "ac-002:fulfilment-ready-quantities-no-stock",
    ok:
      handoff.fulfilment.stockOnHand === null &&
      handoff.fulfilment.inventoryExecuted === false &&
      handoff.fulfilment.lines[0]?.orderedQuantity === "1" &&
      handoff.fulfilment.customerId === confirmed.customerId &&
      Boolean(handoff.fulfilment.lines[0]?.orderLineId),
  });

  results.push({
    name: "ac-003:instructions-unexecuted",
    ok:
      handoff.financialInstruction.refundExecuted === false &&
      handoff.stockReturnInstruction.stockMoved === false &&
      handoff.booking.schedulerExecuted === false &&
      handoff.inventoryExecuted === false,
  });

  const noted = await h.sales.addOperationalNote(ctx("biz-a", "maker-1"), {
    orderId: confirmed.id,
    body: "Call before delivery",
  });
  results.push({
    name: "notes:header-note-persisted",
    ok: noted.notes.some((note) => note.body === "Call before delivery"),
  });

  const dashboard = await h.sales.getDashboard(ctx("biz-a", "maker-1"));
  results.push({
    name: "workspace:dashboard-operational-views",
    ok:
      dashboard.paymentCollectionAvailable === false &&
      dashboard.paymentStatusLabel.includes("not available") &&
      dashboard.recentOrders[0]?.nextAction !== undefined &&
      dashboard.confirmedCount >= 1,
  });

  const inspectH = harness();
  const inspected = await confirmOrder(inspectH.sales, "offering-physical", 100);
  const lineId = firstLineId(inspectH.store, inspected.confirmed.id);
  const arrived = await inspectH.delivery.recordPhysicalDelivery(inspected.maker, {
    orderId: inspected.confirmed.id,
    orderLineId: lineId,
    claimedQuantity: 100,
  });
  await inspectH.delivery.inspectDelivery(ctx("biz-a", "inspector-1"), {
    orderId: inspected.confirmed.id,
    deliveryEventId: arrived.deliveries[0]!.id,
    acceptedQuantity: 80,
    rejectedQuantity: 15,
    comments: "15 defective, 5 missing",
    rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
  });
  const after = await inspectH.sales.getDownstreamHandoff(
    inspected.maker,
    inspected.confirmed.id
  );
  results.push({
    name: "ac-006:outstanding-equals-missing-plus-rejected",
    ok:
      after.fulfilment.lines[0]?.acceptedQuantity === "80" &&
      after.fulfilment.lines[0]?.rejectedQuantity === "15" &&
      after.fulfilment.lines[0]?.missingQuantity === "5" &&
      after.fulfilment.lines[0]?.outstandingQuantity === "20" &&
      after.fulfilment.lines[0]?.deliveredQuantity === "95",
    detail: `outstanding=${after.fulfilment.lines[0]?.outstandingQuantity}`,
  });

  results.push({
    name: "ac-008:checker-helper-blocks-maker",
    ok:
      canCheckerApprove({
        sodRequired: true,
        submittedBy: "maker-1",
        viewerUserId: "maker-1",
      }) === false &&
      canCheckerApprove({
        sodRequired: true,
        submittedBy: "maker-1",
        viewerUserId: "checker-1",
      }) === true,
  });

  results.push({
    name: "viewer:order-carries-actor",
    ok: noted.viewerUserId === "maker-1",
  });

  results.push({
    name: "status:confirmed-not-draft",
    ok: confirmed.status === SALES_ORDER_STATUS_CODES.CONFIRMED,
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      IP02_SKIP_REGRESSION: "1",
      IP03_SKIP_REGRESSION: "1",
      IP04_SKIP_REGRESSION: "1",
    },
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
    ...checkUxLanguage(),
    checkNoExecution(),
    ...(await runCoreCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP05_SKIP_REGRESSION !== "1") {
    for (const script of [
      "scripts/bp006-ip01-sales-order-creation-smoke-validation.ts",
      "scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts",
      "scripts/bp006-ip03-delivery-inspection-service-smoke-validation.ts",
      "scripts/bp006-ip04-amendments-cancellation-returns-smoke-validation.ts",
    ]) {
      if (existsSync(path.join(ROOT, script))) {
        regressionResults.push(runExternal(script));
      }
    }
  }
  const results = [...coreResults, ...regressionResults];
  const coreFailed = coreResults.filter((item) => !item.ok);
  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    console.log(
      `[${item.ok ? "PASS" : "FAIL"}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`
    );
  }
  console.log(
    `\nCore: ${coreResults.length - coreFailed.length}/${coreResults.length} passed. All checks: ${results.length - failed.length}/${results.length} passed.`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
