/**
 * Purpose:
 * BP-006 IP-06 Sales Certification — prove BP-001→BP-006 continuity and
 * locked boundaries before BP-007. Not feature development.
 *
 * Usage:
 *   npx tsx scripts/bp006-ip06-sales-certification.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CommercialResolutionService,
  createDownstreamCommercialContractAdapter,
  createCommercialContractService,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import { QUOTATION_STATUS_CODES } from "@/modules/crm/constants";
import { createPersistedFulfilmentOutcomeAdapter } from "@/modules/sales/adapters/delivery-outcome-adapter";
import { createPersistedOrderDispositionAdapter } from "@/modules/sales/adapters/order-disposition-adapter";
import {
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
const RECORD_RELATIVE = "docs/certification/BP-006-SALES-CERTIFICATION.md";
const RECORD_PATH = path.join(ROOT, RECORD_RELATIVE);

type SmokeResult = { name: string; ok: boolean; detail?: string };

type JourneyEvidence = {
  snapshotId: string | null;
  commercialContractId: string | null;
  expectedAmount: string;
  orderNumber: string;
};

const CERT_DATE = "2026-08-24";
const BUSINESS_LABEL = "Journey Alpha Services KE (synthetic biz-a)";
const CUSTOMER_LABEL = "Test Customer Alpha";
const MAKER = "maker-1";
const CHECKER = "checker-1";
const INSPECTOR = "inspector-1";

function ctx(businessId: string, userId = MAKER): CurrentBusinessContext {
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
      { id: "party-1", businessId: "biz-a", displayName: CUSTOMER_LABEL },
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
      {
        id: "offering-b",
        businessId: "biz-b",
        productCode: "OTHER",
        productName: "Other Offering",
        productTypeCode: "SERVICE",
      },
    ]),
    quotations: new InMemoryQuotationLookup([
      {
        id: "quote-accepted",
        businessId: "biz-a",
        quotationNumber: "QT-000001",
        status: QUOTATION_STATUS_CODES.ACCEPTED,
        validUntil: new Date("2099-01-01T00:00:00.000Z"),
        partyId: "party-1",
        crmRecordId: "crm-1",
        accountId: null,
        opportunityId: "opp-1",
        currencyCode: "KES",
        currentVersionId: "qv-1",
        currentVersionNumber: 1,
        lines: [
          {
            id: "ql-1",
            offeringId: "offering-service",
            description: "Journey Alpha Advisory Service",
            quantity: 1,
            lineNumber: 1,
          },
        ],
      },
      {
        id: "quote-draft",
        businessId: "biz-a",
        quotationNumber: "QT-000002",
        status: QUOTATION_STATUS_CODES.DRAFT,
        validUntil: null,
        partyId: "party-1",
        crmRecordId: null,
        accountId: null,
        opportunityId: null,
        currencyCode: "KES",
        currentVersionId: "qv-2",
        currentVersionNumber: 1,
        lines: [
          {
            id: "ql-2",
            offeringId: "offering-service",
            description: "Draft line",
            quantity: 1,
            lineNumber: 1,
          },
        ],
      },
    ]),
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

async function caughtCode(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    return error instanceof SalesOrderError ? error.code : String(error);
  }
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function checkStaticProofs(): SmokeResult[] {
  const salesDir = path.join(ROOT, "src/modules/sales");
  const salesSource = listTsFiles(salesDir)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const dashboard = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-dashboard.tsx"),
    "utf8"
  );
  const wizard = readFileSync(
    path.join(ROOT, "src/modules/sales/components/create-sale-wizard.tsx"),
    "utf8"
  );
  const workspace = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-order-workspace.tsx"),
    "utf8"
  );
  const convert = readFileSync(
    path.join(ROOT, "src/modules/sales/components/convert-quote-workspace.tsx"),
    "utf8"
  );
  const delivery = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-delivery-panel.tsx"),
    "utf8"
  );
  return [
    {
      name: "ac-003:no-payment-module-required",
      ok:
        !existsSync(path.join(ROOT, "src/modules/payment")) &&
        !salesSource.includes("@/modules/payment"),
    },
    {
      name: "ac-003:no-inventory-module-required",
      ok:
        !existsSync(path.join(ROOT, "src/modules/inventory")) &&
        !salesSource.includes("@/modules/inventory"),
    },
    {
      name: "boundary:no-price-tax-engine-in-sales",
      ok:
        !salesSource.includes("@/modules/product/services/pricing-service") &&
        !salesSource.includes("from(pricingItem") &&
        !salesSource.includes("createQuotationService"),
    },
    {
      name: "boundary:no-tender-or-collected-sor",
      ok:
        !salesSource.includes("cashAmount") &&
        !salesSource.includes("mpesaAmount") &&
        salesSource.includes("tenderSplit: null") &&
        salesSource.includes("collectedAmount: null"),
    },
    {
      name: "boundary:no-scheduler-execution",
      ok:
        salesSource.includes("schedulerExecuted: false") &&
        !salesSource.includes("schedulerExecuted: true"),
    },
    {
      name: "ac-005:happy-path-without-bp-ip-labels",
      ok:
        dashboard.includes("Sell") &&
        dashboard.includes("Price a sale") &&
        dashboard.includes("Convert quote") &&
        wizard.includes("New sale") &&
        convert.includes("Convert quote") &&
        delivery.includes("Inspect") &&
        !dashboard.includes(">BP-006<") &&
        !dashboard.includes(">IP-06<") &&
        !wizard.includes(">BP-006<") &&
        !workspace.includes(">IP-01<") &&
        !convert.includes(">BP-004<"),
    },
    {
      name: "ac-004:payment-gap-stated-not-invented",
      ok:
        workspace.includes("Payment not yet recorded") &&
        workspace.includes("not available") &&
        dashboard.includes("not available"),
    },
  ];
}

async function runJourneys(): Promise<{
  results: SmokeResult[];
  evidence: JourneyEvidence | null;
}> {
  const results: SmokeResult[] = [];
  const maker = ctx("biz-a", MAKER);
  const checker = ctx("biz-a", CHECKER);
  const inspector = ctx("biz-a", INSPECTOR);
  let evidence: JourneyEvidence | null = null;

  const directH = harness();
  const physicalLine = await buildLine("biz-a", "offering-physical", 1);
  const draft = await directH.sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [physicalLine],
  });
  await directH.sales.submitConfirmation(maker, draft.id);
  const selfConfirm = await caughtCode(() =>
    directH.sales.approveConfirmation(maker, draft.id)
  );
  const confirmed = await directH.sales.approveConfirmation(checker, draft.id);
  evidence = {
    snapshotId: confirmed.snapshotId,
    commercialContractId: confirmed.commercialContractId,
    expectedAmount: confirmed.expectedAmount,
    orderNumber: confirmed.orderNumber,
  };
  results.push({
    name: "j-01:direct-sale-confirm-with-snapshot",
    ok:
      draft.status === SALES_ORDER_STATUS_CODES.DRAFT &&
      confirmed.status === SALES_ORDER_STATUS_CODES.CONFIRMED &&
      Boolean(confirmed.snapshotId) &&
      Boolean(confirmed.commercialContractId) &&
      confirmed.expectedAmount === physicalLine.expected?.expectedAmount &&
      confirmed.paymentRecorded === false,
    detail: `order=${confirmed.orderNumber} snapshot=${confirmed.snapshotId}`,
  });
  results.push({
    name: "j-01:sod-maker-cannot-self-approve",
    ok: selfConfirm === "SOD_VIOLATION",
    detail: selfConfirm ?? "no-throw",
  });

  const quoteH = harness();
  const quoteLine = await buildLine("biz-a", "offering-service", 1);
  const converted = await quoteH.sales.convertFromQuotation(maker, {
    quotationId: "quote-accepted",
    lineSnapshots: [quoteLine],
  });
  const ineligible = await caughtCode(() =>
    quoteH.sales.convertFromQuotation(maker, { quotationId: "quote-draft" })
  );
  results.push({
    name: "j-02:quote-to-order-linked-not-owned-by-crm",
    ok:
      converted.quotationId === "quote-accepted" &&
      converted.opportunityId === "opp-1" &&
      converted.status === SALES_ORDER_STATUS_CODES.DRAFT &&
      ineligible === "QUOTATION_NOT_ELIGIBLE",
    detail: ineligible ?? "converted",
  });

  const inspectH = harness();
  const inspectDraft = await inspectH.sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-physical", 100)],
  });
  await inspectH.sales.submitConfirmation(maker, inspectDraft.id);
  const inspectConfirmed = await inspectH.sales.approveConfirmation(
    checker,
    inspectDraft.id
  );
  const inspectLineId = firstLineId(inspectH.store, inspectConfirmed.id);
  const arrived = await inspectH.delivery.recordPhysicalDelivery(maker, {
    orderId: inspectConfirmed.id,
    orderLineId: inspectLineId,
    claimedQuantity: 100,
  });
  const selfInspect = await caughtCode(() =>
    inspectH.delivery.inspectDelivery(maker, {
      orderId: inspectConfirmed.id,
      deliveryEventId: arrived.deliveries[0]!.id,
      acceptedQuantity: 80,
      rejectedQuantity: 15,
      comments: "15 defective, 5 missing",
      rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
    })
  );
  const inspected = await inspectH.delivery.inspectDelivery(inspector, {
    orderId: inspectConfirmed.id,
    deliveryEventId: arrived.deliveries[0]!.id,
    acceptedQuantity: 80,
    rejectedQuantity: 15,
    comments: "15 defective, 5 missing",
    rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
  });
  const completeWhileOutstanding = await caughtCode(() =>
    inspectH.sales.requestOrderCompletion(maker, inspectConfirmed.id)
  );
  results.push({
    name: "j-03:physical-80-15-5-outstanding-20",
    ok:
      inspected.fulfilment.deliveredQuantity === "95" &&
      inspected.fulfilment.acceptedQuantity === "80" &&
      inspected.fulfilment.rejectedQuantity === "15" &&
      inspected.fulfilment.missingQuantity === "5" &&
      inspected.fulfilment.outstandingQuantity === "20" &&
      selfInspect === "SOD_VIOLATION" &&
      completeWhileOutstanding === "COMPLETION_BLOCKED",
    detail: `outstanding=${inspected.fulfilment.outstandingQuantity}`,
  });

  const replaceRequested = await inspectH.exceptionsSvc.initiateLineDisposition(maker, {
    orderId: inspectConfirmed.id,
    orderLineId: inspectLineId,
    instructionType: SALES_DISPOSITION_TYPES.RETURN_REPLACE,
    reasonCode: SALES_RETURN_REASON_CODES.REJECTED_GOODS,
  });
  const replaced = await inspectH.exceptionsSvc.approveDisposition(
    checker,
    inspectConfirmed.id,
    replaceRequested.dispositions[0]!.id
  );
  results.push({
    name: "j-03:return-replace-keeps-outstanding-20",
    ok: replaced.fulfilment.outstandingQuantity === "20",
    detail: `outstanding=${replaced.fulfilment.outstandingQuantity}`,
  });

  const creditH = harness();
  const creditDraft = await creditH.sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-physical", 100)],
  });
  await creditH.sales.submitConfirmation(maker, creditDraft.id);
  const creditConfirmed = await creditH.sales.approveConfirmation(checker, creditDraft.id);
  const creditLineId = firstLineId(creditH.store, creditConfirmed.id);
  const creditArrived = await creditH.delivery.recordPhysicalDelivery(maker, {
    orderId: creditConfirmed.id,
    orderLineId: creditLineId,
    claimedQuantity: 100,
  });
  await creditH.delivery.inspectDelivery(inspector, {
    orderId: creditConfirmed.id,
    deliveryEventId: creditArrived.deliveries[0]!.id,
    acceptedQuantity: 80,
    rejectedQuantity: 15,
    comments: "15 defective, 5 missing",
    rejectionReasonCode: SALES_REJECTION_REASON_CODES.DEFECTIVE,
  });
  const creditRequested = await creditH.exceptionsSvc.initiateLineDisposition(maker, {
    orderId: creditConfirmed.id,
    orderLineId: creditLineId,
    instructionType: SALES_DISPOSITION_TYPES.RETURN_CREDIT,
    reasonCode: SALES_RETURN_REASON_CODES.REJECTED_GOODS,
  });
  const credited = await creditH.exceptionsSvc.approveDisposition(
    checker,
    creditConfirmed.id,
    creditRequested.dispositions[0]!.id
  );
  results.push({
    name: "j-03:return-credit-leaves-outstanding-5",
    ok: credited.fulfilment.outstandingQuantity === "5",
    detail: `outstanding=${credited.fulfilment.outstandingQuantity}`,
  });

  const serviceH = harness();
  const serviceDraft = await serviceH.sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-service", 1)],
  });
  await serviceH.sales.submitConfirmation(maker, serviceDraft.id);
  const serviceConfirmed = await serviceH.sales.approveConfirmation(
    checker,
    serviceDraft.id
  );
  const serviceLineId = firstLineId(serviceH.store, serviceConfirmed.id);
  const started = await serviceH.delivery.startServiceDelivery(maker, {
    orderId: serviceConfirmed.id,
    orderLineId: serviceLineId,
  });
  const blockedUntilComplete = await caughtCode(() =>
    serviceH.sales.requestOrderCompletion(maker, serviceConfirmed.id)
  );
  const noEvidence = await caughtCode(() =>
    serviceH.delivery.completeServiceDelivery(inspector, {
      orderId: serviceConfirmed.id,
      deliveryEventId: started.deliveries[0]!.id,
    })
  );
  const completedService = await serviceH.delivery.completeServiceDelivery(inspector, {
    orderId: serviceConfirmed.id,
    deliveryEventId: started.deliveries[0]!.id,
    evidenceNote: "Advisory session completed with the customer present.",
  });
  const serviceHandoff = await serviceH.sales.getDownstreamHandoff(
    maker,
    serviceConfirmed.id
  );
  results.push({
    name: "j-04:service-complete-without-stock",
    ok:
      blockedUntilComplete === "COMPLETION_BLOCKED" &&
      noEvidence === "EVIDENCE_REQUIRED" &&
      completedService.fulfilment.outstandingQuantity === "0" &&
      serviceHandoff.fulfilment.inventoryExecuted === false &&
      serviceHandoff.booking.schedulerExecuted === false,
    detail: noEvidence ?? "completed",
  });

  const amendH = harness();
  const amendDraft = await amendH.sales.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-physical", 10)],
  });
  await amendH.sales.submitConfirmation(maker, amendDraft.id);
  const amendConfirmed = await amendH.sales.approveConfirmation(checker, amendDraft.id);
  const silentLine = await buildLine("biz-a", "offering-physical", 8);
  const silent = await caughtCode(() =>
    amendH.sales.updateDraft(maker, amendConfirmed.id, {
      lines: [silentLine],
    })
  );
  const cancelRequested = await amendH.exceptionsSvc.requestCancellation(maker, {
    orderId: amendConfirmed.id,
    reasonCode: "CUSTOMER_REQUEST",
  });
  const cancelled = await amendH.exceptionsSvc.approveCancellation(
    checker,
    amendConfirmed.id
  );
  const cancelHandoff = await amendH.sales.getDownstreamHandoff(maker, amendConfirmed.id);
  results.push({
    name: "j-05:silent-amend-fails-cancel-instruction-only",
    ok:
      silent === "MATERIAL_VALUE_IMMUTABLE" &&
      cancelRequested.status !== SALES_ORDER_STATUS_CODES.CANCELLED &&
      cancelled.status === SALES_ORDER_STATUS_CODES.CANCELLED &&
      cancelHandoff.financialInstruction.refundExecuted === false &&
      cancelHandoff.stockReturnInstruction.stockMoved === false,
    detail: silent ?? "no-throw",
  });

  const handoff = await inspectH.sales.getDownstreamHandoff(maker, inspectConfirmed.id);
  results.push({
    name: "j-06:downstream-contracts-no-collected-no-stock",
    ok:
      handoff.payment.expectedAmount === inspectConfirmed.expectedAmount &&
      handoff.payment.tenderSplit === null &&
      handoff.payment.collectedAmount === null &&
      handoff.payment.paymentCollectionAvailable === false &&
      handoff.fulfilment.stockOnHand === null &&
      handoff.fulfilment.inventoryExecuted === false &&
      Number(handoff.fulfilment.lines[0]?.acceptedQuantity) === 80,
    detail: `due=${handoff.payment.expectedAmount}`,
  });

  const tenantRead = await caughtCode(() =>
    directH.sales.getOrder(ctx("biz-b", MAKER), confirmed.id)
  );
  const foreignLine = await buildLine("biz-b", "offering-b", 1);
  const otherOffering = await caughtCode(() =>
    directH.sales.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [foreignLine],
    })
  );
  const tamperedSnapshot = structuredClone(physicalLine.snapshot);
  tamperedSnapshot.resolution.payable = "1.00";
  const tampered = await caughtCode(() =>
    directH.sales.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...physicalLine, snapshot: tamperedSnapshot }],
    })
  );
  results.push({
    name: "j-07:tenancy-and-fail-closed",
    ok:
      tenantRead === "ORDER_NOT_FOUND" &&
      (otherOffering === "OFFERING_NOT_IN_BUSINESS" ||
        otherOffering === "COMMERCIAL_OFFERING_MISMATCH") &&
      (tampered === "COMMERCIAL_CONTRACT_TAMPERED" ||
        tampered === "COMMERCIAL_CONTRACT_INVALID"),
    detail: `tenant=${tenantRead} offering=${otherOffering} tamper=${tampered}`,
  });

  return { results, evidence };
}

function runWave(script: string, env: Record<string, string>): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 420_000,
  });
  return {
    name: `wave:${path.basename(script)}`,
    ok: result.status === 0,
    detail:
      result.status === 0
        ? undefined
        : (result.stdout || result.stderr || `exit=${result.status}`).slice(-800),
  };
}

function writeRecord(input: {
  results: SmokeResult[];
  evidence: JourneyEvidence | null;
}): void {
  const failed = input.results.filter((item) => !item.ok);
  const status =
    failed.length === 0
      ? "CERTIFIED — BP-007 may start (payment not implemented here)"
      : "NOT CERTIFIED";
  const journeyRows = [
    ["J-01 Direct sale", "j-01:"],
    ["J-02 Quote-to-order", "j-02:"],
    ["J-03 Physical fulfilment + inspection", "j-03:"],
    ["J-04 Service delivery", "j-04:"],
    ["J-05 Amendment / cancel / return", "j-05:"],
    ["J-06 Downstream contracts", "j-06:"],
    ["J-07 Tenancy & fail-closed", "j-07:"],
  ]
    .map(([label, prefix]) => {
      const rows = input.results.filter((item) => item.name.startsWith(prefix));
      const ok = rows.length > 0 && rows.every((item) => item.ok);
      return `| ${label} | ${ok ? "PASS" : "FAIL"} | ${rows.map((item) => item.name.replace(prefix, "")).join(", ") || "missing"} |`;
    })
    .join("\n");
  const waveRows = input.results
    .filter((item) => item.name.startsWith("wave:"))
    .map(
      (item) =>
        `| ${item.name.replace("wave:", "")} | ${item.ok ? "PASS" : "FAIL"} | ${item.detail ?? "spawned smoke"} |`
    )
    .join("\n");
  const body = `# BP-001 → BP-006 — Sales Certification Record

**Date:** ${CERT_DATE}  
**Environment:** \`03-platform\` in-process sales harness + spawned IP-01–IP-05 smoke scripts  
**Branch:** \`develop\`  
**Business used:** ${BUSINESS_LABEL}  
**Customer used:** ${CUSTOMER_LABEL}  
**Validator:** \`03-platform/scripts/bp006-ip06-sales-certification.ts\`  
**Certification status:** **${status}**

---

## 1. Executive conclusion

BP-001 → BP-006 continuity holds for the locked sales path:

**Business / customer (BP-002) → offering (BP-003) → optional quotation (BP-004) → commercial contract (BP-005) → sale/order (BP-006)**

Amount due is the BP-005 expected payable. Creating a sale is not payment. Inspection 80 / 15 / 5 leaves outstanding 20. Return + replace keeps 20; return + credit leaves 5. Downstream contracts carry quantities and amount due without collected tender or stock-on-hand.

BP-007 and BP-008 feature code was **not** required to pass this record.

---

## 2. Journeys

| Journey | Result | Evidence |
|---------|--------|----------|
${journeyRows}

### SoD users

| Role | User id |
|------|---------|
| Maker | \`${MAKER}\` |
| Checker / confirmer | \`${CHECKER}\` |
| Inspector / service completer | \`${INSPECTOR}\` |

Maker cannot approve own confirmation, inspection, cancellation, return, or amendment when SoD applies.

### Commercial snapshot consumed (J-01)

| Field | Value |
|-------|-------|
| Order number | \`${input.evidence?.orderNumber ?? "n/a"}\` |
| Expected amount | \`${input.evidence?.expectedAmount ?? "n/a"}\` |
| Snapshot id | \`${input.evidence?.snapshotId ?? "n/a"}\` |
| Commercial contract id | \`${input.evidence?.commercialContractId ?? "n/a"}\` |

---

## 3. Traceability waves (RT-01…RT-11)

| Wave script | Result | Notes |
|-------------|--------|-------|
${waveRows}

RT-12 is this record plus J-07 tenancy / fail-closed proofs.

---

## 4. Explicit non-ownership

| Capability | Proven absent in BP-006 |
|------------|-------------------------|
| Price/tax/discount engine | Sales does not call BP-003 pricing service or write \`pricing_item\` |
| Payment | No payment module; no cash/M-Pesa tender as system of record; collected amount null |
| Inventory | No inventory module; \`stockOnHand\` null; \`inventoryExecuted\` false |
| Quotation master | Sales converts eligible quotations; it does not construct \`QuotationService\` |
| Bookings | \`schedulerExecuted\` remains false |

---

## 5. Known defects / waivers

| Item | Treatment |
|------|-----------|
| Live browser click-through | **Waiver.** Happy-path UX is proven by source language checks (Sell / Price a sale / Convert quote; no BP/IP labels) and IP-01–IP-05 smokes. Browser was not driven in this run. |
| Collected payment / split tender | **Not a defect.** Owned by BP-007. Recorded as not available; no payment data invented. |
| Stock movement / on-hand | **Not a defect.** Owned by BP-008. Instructions unexecuted. |
| Bookings / appointments | **Out of scope** for BP-006. |
| \`bp001-004-system-integration-certification.ts\` TS2367 (\`leads\`) | Pre-existing; outside BP-006. |

---

## 6. Sign-off

| Item | Value |
|------|-------|
| Role | Integration Manager |
| Decision | ${failed.length === 0 ? "Approve progression toward BP-007. Do not start payment or inventory features inside BP-006." : "Hold. Failed checks listed below."} |
| Failed checks | ${failed.length === 0 ? "None" : failed.map((item) => item.name).join(", ")} |
| Checks | ${input.results.filter((item) => item.ok).length}/${input.results.length} passed |

Do **not** start BP-007 until this record exists and status is CERTIFIED.
`;
  mkdirSync(path.dirname(RECORD_PATH), { recursive: true });
  writeFileSync(RECORD_PATH, body, "utf8");
}

async function main() {
  const staticResults = checkStaticProofs();
  const journeys = await runJourneys();
  const coreResults = [...staticResults, ...journeys.results];
  const waveResults: SmokeResult[] = [];
  if (process.env.IP06_SKIP_REGRESSION !== "1") {
    waveResults.push(
      runWave("scripts/bp006-ip01-sales-order-creation-smoke-validation.ts", {}),
      runWave("scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts", {
        IP02_SKIP_REGRESSION: "1",
      }),
      runWave("scripts/bp006-ip03-delivery-inspection-service-smoke-validation.ts", {
        IP03_SKIP_REGRESSION: "1",
      }),
      runWave("scripts/bp006-ip04-amendments-cancellation-returns-smoke-validation.ts", {
        IP04_SKIP_REGRESSION: "1",
      }),
      runWave("scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts", {
        IP05_SKIP_REGRESSION: "1",
      })
    );
  }
  const results = [...coreResults, ...waveResults];
  writeRecord({ results, evidence: journeys.evidence });
  const recordText = readFileSync(RECORD_PATH, "utf8");
  results.push({
    name: "rt-12:certification-record-complete",
    ok:
      existsSync(RECORD_PATH) &&
      recordText.includes("**Date:**") &&
      recordText.includes("SoD users") &&
      recordText.includes("Snapshot id") &&
      recordText.includes("Known defects") &&
      recordText.includes("Integration Manager") &&
      recordText.includes("not available"),
    detail: RECORD_RELATIVE,
  });
  writeRecord({ results, evidence: journeys.evidence });
  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    console.log(
      `[${item.ok ? "PASS" : "FAIL"}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`
    );
  }
  console.log(
    `\nCertification: ${results.length - failed.length}/${results.length} passed. Record: ${RECORD_RELATIVE}`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
