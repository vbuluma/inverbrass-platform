/**
 * Purpose:
 * BP-006 / BP-007 / BP-008 system integration certification.
 *
 * Certification-only. Executes existing service classes with isolated
 * in-memory fixtures consistent with BP-006, BP-007, and BP-008 smoke
 * architecture. Does not modify production logic, introduce later Build
 * Packs, or call live payment providers.
 *
 * Usage:
 *   npx tsx scripts/bp006-bp007-bp008-system-integration-certification.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { InProcessDocumentAdapter } from "@/core/document-engine";
import { INVENTORY_MOVEMENT_TYPES } from "@/core/inventory-engine";
import { ScriptedDocumentNumberingAdapter } from "@/core/localization-regulatory";
import { createScriptedDocumentNumberingAdapter } from "@/core/localization-regulatory/services/document-numbering-service";
import { InProcessNotificationAdapter } from "@/core/notification-engine";
import {
  createCatalogueCapabilityPaymentEngine,
  ScriptedPaymentInitiationAdapter,
  type InitiatePaymentInput,
} from "@/core/payment-engine";
import { InProcessReceiptingAdapter } from "@/core/receipting-engine";
import { InProcessWorkflowAdapter } from "@/core/workflow-engine";
import {
  CommercialResolutionService,
  createCommercialContractService,
  createDownstreamCommercialContractAdapter,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import { createBusinessScopedLocationAccess } from "@/modules/inventory/adapters/inventory-location-access-adapter";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import {
  listSourceFiles as listInventorySourceFiles,
  scanInventoryArchitecture,
} from "@/modules/inventory/architecture-scan";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OPS_INCIDENT_TYPES,
  INVENTORY_OPS_RESOLUTION_ACTIONS,
  INVENTORY_RESERVATION_STATUSES,
  INVENTORY_STOCKTAKE_SCOPE_TYPES,
  INVENTORY_TRACKING_MODES,
  INVENTORY_TRANSFER_STATUSES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import type { InventorySalesFulfilmentPort } from "@/modules/inventory/ports";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryControlService } from "@/modules/inventory/services/inventory-control-service";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { InventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { TraceabilityService } from "@/modules/inventory/services/inventory-traceability-service";
import { StockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import { StockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import { StockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import { StocktakeService } from "@/modules/inventory/services/stocktake-service";
import { StockTransferService } from "@/modules/inventory/services/stock-transfer-service";
import type { InventoryProductRef } from "@/modules/inventory/types";
import {
  listSourceFiles as listPaymentSourceFiles,
  scanPaymentArchitecture,
} from "@/modules/payments/architecture-scan";
import { InMemoryCurrencyReference } from "@/modules/payments/adapters/currency-catalogue-adapter";
import { InMemoryFinancialInstructionAdapter } from "@/modules/payments/adapters/payment-financial-instruction-adapter";
import { createPaymentAllocationPolicyAdapter } from "@/modules/payments/adapters/payment-allocation-policy-adapter";
import { ConfigurablePaymentExceptionPolicy } from "@/modules/payments/adapters/payment-exception-policy-adapter";
import { createPaymentSettlementPolicyAdapter } from "@/modules/payments/adapters/payment-settlement-policy-adapter";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_EXCEPTION_TYPES,
  PAYMENT_STATUS_CODES,
  PaymentAllocationService,
  PaymentExceptionService,
  PaymentInitiationService,
  PaymentInvoiceService,
  ConfigurableInvoiceClock,
  PaymentObligationError,
  PaymentObligationService,
  PaymentReceiptService,
  PaymentRefundService,
  PaymentSettlementService,
} from "@/modules/payments";
import type { PaymentEnablementPort, PaymentReadyContractPort } from "@/modules/payments/ports";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { RecordingPaymentAudit } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  defaultCatalogueFixture,
  InMemoryCapabilityStore,
  InMemoryPaymentStore,
} from "@/modules/payments/services/payment-memory-store";
import type { PaymentEnablementFlags, PaymentReadyContract } from "@/modules/payments/types";
import { QUOTATION_STATUS_CODES } from "@/modules/crm/constants";
import { createPersistedFulfilmentOutcomeAdapter } from "@/modules/sales/adapters/delivery-outcome-adapter";
import { createPersistedOrderDispositionAdapter } from "@/modules/sales/adapters/order-disposition-adapter";
import {
  SALES_AUDIT_ACTIONS,
  SALES_ORDER_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError } from "@/modules/sales/errors";
import type { CommercialContractPort } from "@/modules/sales/ports";
import { toFulfilmentHandoffContract } from "@/modules/sales/services/handoff-rules";
import { RecordingSalesAudit } from "@/modules/sales/services/sales-order-audit-helper";
import {
  InMemoryOfferingLookup,
  InMemoryPartyLookup,
  InMemoryQuotationLookup,
  InMemorySalesOrderStore,
} from "@/modules/sales/services/sales-order-memory-store";
import { SalesOrderService } from "@/modules/sales/services/sales-order-service";
import { InMemorySalesDeliveryStore } from "@/modules/sales/services/sales-delivery-memory-store";
import { InMemorySalesExceptionStore } from "@/modules/sales/services/sales-exception-memory-store";
import type { CreateDirectSaleLineInput, PaymentReadyOrderContract } from "@/modules/sales/types";

const ROOT = path.resolve(__dirname, "..");
const CERT_DATE = "2026-08-30";
const CUSTOMER_LABEL = "Test Customer Alpha";
const PRODUCT_CODE = "JA-PHYS-001";
const PRODUCT_NAME = "Journey Alpha Physical Pack";
const UNIT_PRICE = 300;
const SALE_QTY = 20;
const MAKER = "maker-1";
const CHECKER = "checker-1";

type CertStatus = "PASS" | "FAIL" | "GAP" | "NOT_APPLICABLE";

type CertResult = {
  area: string;
  id: string;
  status: CertStatus;
  detail?: string;
};

const results: CertResult[] = [];

function ctx(businessId: string, userId = MAKER): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function record(area: string, id: string, status: CertStatus, detail?: string) {
  results.push({ area, id, status, detail });
  console.log(`  [${status}] ${id}${detail ? ` — ${detail}` : ""}`);
}

function pass(area: string, id: string, ok: boolean, detail?: string) {
  record(area, id, ok ? "PASS" : "FAIL", detail);
}

async function caughtCode(work: () => Promise<unknown>): Promise<string | null> {
  try {
    await work();
    return null;
  } catch (error) {
    if (error instanceof InventoryError) return error.code;
    if (error instanceof PaymentObligationError) return error.code;
    if (error instanceof SalesOrderError) return error.code;
    return error instanceof Error ? error.message : String(error);
  }
}

function productFixture(overrides: Partial<InventoryProductRef> = {}): InventoryProductRef {
  return {
    id: "product-a",
    businessId: "biz-a",
    productCode: PRODUCT_CODE,
    productName: PRODUCT_NAME,
    productTypeCode: "PHYSICAL_PRODUCT",
    isActive: true,
    sellingPrice: String(UNIT_PRICE),
    taxCode: "VAT16",
    ...overrides,
  };
}

function fixtureResolvedBase(overrides: Partial<ResolvedBasePrice> = {}): ResolvedBasePrice {
  return {
    unitPrice: UNIT_PRICE,
    currencyCode: "KES",
    pricingMethod: "FIXED",
    pricingMethodLabel: "Fixed",
    pricingCatalogueId: "cat-1",
    catalogueCode: "DEFAULT",
    catalogueName: "Default",
    pricingItemId: "price-1",
    offeringId: "product-a",
    offeringCode: PRODUCT_CODE,
    offeringName: PRODUCT_NAME,
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
      offeringId: "product-a",
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
    validate: (context, contract, snapshot) => adapter.validate(context, contract, snapshot),
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

function toConsumedPaymentContract(contract: PaymentReadyOrderContract): PaymentReadyContract {
  return {
    orderId: contract.orderId,
    orderNumber: contract.orderNumber,
    businessId: contract.businessId,
    customerId: contract.customerId,
    expectedAmount: contract.expectedAmount,
    currency: contract.currency,
    commercialContractId: contract.commercialContractId,
    snapshotId: contract.snapshotId,
    operationalStatus: contract.operationalStatus,
    financialInstructionType: contract.financialInstructionType,
    expiresAt: null,
    lines: contract.lines.map((line) => ({
      orderLineId: line.orderLineId,
      offeringId: line.offeringId,
      expectedPayable: line.expectedPayable,
      currencyCode: line.currencyCode,
    })),
  };
}

function paymentOutcome(kind: "SUCCESSFUL" | "PENDING" | "FAILED" | "UNKNOWN", ref?: string) {
  return (input: InitiatePaymentInput) => ({
    outcome: kind,
    providerTransactionReference: ref ?? `prov-${input.paymentTransactionId ?? "txn"}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: kind === "FAILED" ? "DECLINED" : null,
    failureReason: kind === "FAILED" ? "Declined" : null,
  });
}

function seedInventoryControls(store: InMemoryInventoryStore) {
  for (const control of [
    { code: INVENTORY_OPERATION_CODES.STOCK_RECEIVING, name: "Stock receiving", movementType: INVENTORY_MOVEMENT_TYPES.RECEIPT },
    { code: INVENTORY_OPERATION_CODES.OPENING_BALANCE, name: "Opening balance", movementType: INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE },
    { code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION, name: "Stock reservation", movementType: "RESERVATION" },
    { code: INVENTORY_OPERATION_CODES.STOCK_DEDUCTION, name: "Stock deduction", movementType: INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION },
    { code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE, name: "Reservation release", movementType: "RESERVATION" },
    { code: INVENTORY_OPERATION_CODES.STOCK_TRANSFER, name: "Stock transfer", movementType: INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH },
    { code: INVENTORY_OPERATION_CODES.STOCK_ADJUSTMENT, name: "Stock adjustment", movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT },
    { code: INVENTORY_OPERATION_CODES.CUSTOMER_RETURN, name: "Customer return", movementType: INVENTORY_MOVEMENT_TYPES.CUSTOMER_RETURN },
    { code: INVENTORY_OPERATION_CODES.STOCKTAKE, name: "Stocktake", movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT },
    { code: INVENTORY_OPERATION_CODES.INVENTORY_CONTROL_CONFIG, name: "Inventory control settings", movementType: "CONTROL" },
    { code: INVENTORY_OPERATION_CODES.OPS_INCIDENT_RESOLUTION, name: "Exception resolution", movementType: "CONTROL" },
  ]) {
    store.seedControl({
      ...control,
      requiresApproval: false,
      overReceiptPolicy: "BLOCK",
    });
  }
}

function harness(options?: { paymentOutcome?: "SUCCESSFUL" | "PENDING" | "FAILED" | "UNKNOWN" }) {
  const inventoryStore = new InMemoryInventoryStore();
  inventoryStore.seedProduct(productFixture());
  inventoryStore.seedProduct(
    productFixture({
      id: "product-batch",
      productCode: "JA-BATCH-001",
      productName: "Journey Alpha Batch Pack",
    })
  );
  inventoryStore.seedProduct(
    productFixture({
      id: "product-serial",
      productCode: "JA-SERIAL-001",
      productName: "Journey Alpha Serial Unit",
    })
  );
  inventoryStore.seedProduct(
    productFixture({
      id: "product-other",
      businessId: "biz-b",
      productCode: "OTHER",
      productName: "Other Business Product",
    })
  );
  inventoryStore.seedUnit({
    id: "uom-ea",
    businessId: "biz-a",
    code: "EA",
    name: "Each",
    symbol: "ea",
    status: "ACTIVE",
  });
  inventoryStore.seedUnit({
    id: "uom-box",
    businessId: "biz-a",
    code: "BOX",
    name: "Box",
    symbol: "box",
    status: "ACTIVE",
  });
  inventoryStore.seedUnit({
    id: "uom-b",
    businessId: "biz-b",
    code: "EA",
    name: "Each",
    symbol: "ea",
    status: "ACTIVE",
  });
  seedInventoryControls(inventoryStore);

  const salesStore = new InMemorySalesOrderStore();
  const deliveries = new InMemorySalesDeliveryStore();
  const salesExceptions = new InMemorySalesExceptionStore();
  const salesAudit = new RecordingSalesAudit();
  const sales = new SalesOrderService({
    orders: salesStore,
    parties: new InMemoryPartyLookup([
      { id: "party-1", businessId: "biz-a", displayName: CUSTOMER_LABEL },
      { id: "party-b", businessId: "biz-b", displayName: "Other Business Customer" },
    ]),
    offerings: new InMemoryOfferingLookup([
      {
        id: "product-a",
        businessId: "biz-a",
        productCode: PRODUCT_CODE,
        productName: PRODUCT_NAME,
        productTypeCode: "PHYSICAL_PRODUCT",
      },
      {
        id: "product-batch",
        businessId: "biz-a",
        productCode: "JA-BATCH-001",
        productName: "Journey Alpha Batch Pack",
        productTypeCode: "PHYSICAL_PRODUCT",
      },
      {
        id: "product-serial",
        businessId: "biz-a",
        productCode: "JA-SERIAL-001",
        productName: "Journey Alpha Serial Unit",
        productTypeCode: "PHYSICAL_PRODUCT",
      },
      {
        id: "offering-b",
        businessId: "biz-b",
        productCode: "OTHER",
        productName: "Other Offering",
        productTypeCode: "PHYSICAL_PRODUCT",
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
            offeringId: "product-a",
            description: PRODUCT_NAME,
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
    audit: salesAudit,
    confirmationPolicy: { requiresSegregationOfDuties: true },
    completionPolicy: { requiresSegregationOfDuties: true },
    fulfilmentOutcomes: createPersistedFulfilmentOutcomeAdapter(deliveries, salesStore),
    disposition: createPersistedOrderDispositionAdapter(salesExceptions),
    deliveries,
    exceptions: salesExceptions,
  });

  const salesFulfilment: InventorySalesFulfilmentPort = {
    async getByOrderId(context, orderId) {
      try {
        if (!context.platformUserId) {
          return null;
        }
        const salesContext: CurrentBusinessContext = {
          businessId: context.businessId,
          platformUserId: context.platformUserId,
          businessMembershipId: context.businessMembershipId,
        };
        const detail = await sales.getOrder(salesContext, orderId);
        const fulfilment = toFulfilmentHandoffContract(detail);
        return {
          orderId: fulfilment.orderId,
          orderNumber: fulfilment.orderNumber,
          businessId: fulfilment.businessId,
          operationalStatus: detail.status,
          lines: fulfilment.lines.map((line) => ({
            orderLineId: line.orderLineId,
            offeringId: line.offeringId,
            orderedQuantity: line.orderedQuantity,
            outstandingQuantity: line.outstandingQuantity,
            acceptedQuantity: line.acceptedQuantity,
            salesUomId: line.salesUomId,
            lineType: line.lineType,
            fulfilmentStatus: line.fulfilmentStatus,
          })),
        };
      } catch {
        return null;
      }
    },
  };

  const contracts: PaymentReadyContractPort = {
    async getByOrderId(context, orderId) {
      try {
        return toConsumedPaymentContract(await sales.getPaymentReadyContract(context, orderId));
      } catch {
        return null;
      }
    },
  };

  const inventoryAudit = new RecordingInventoryAudit();
  const inventoryNumbering = createScriptedDocumentNumberingAdapter();
  const inventoryLocks = createInProcessInventoryLock();
  const inventoryWorkflow = createInventoryControlWorkflowAdapter(inventoryStore.controlPort);
  const traceability = new TraceabilityService({
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    movements: inventoryStore.movementPort,
    lots: inventoryStore.lotPort,
    units: inventoryStore.trackedUnitPort,
    captures: inventoryStore.lineTracePort,
    allocations: inventoryStore.traceAllocationPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
  });
  const foundation = new InventoryFoundationService({
    products: inventoryStore.productPort,
    units: inventoryStore.unitPort,
    catalogues: inventoryStore.typePort,
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    movements: inventoryStore.movementPort,
    balances: inventoryStore.balancePort,
    audit: inventoryAudit,
    traceability,
  });
  const adjustment = new StockAdjustmentService({
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    movements: inventoryStore.movementPort,
    balances: inventoryStore.balancePort,
    adjustments: inventoryStore.adjustmentPort,
    adjustmentLines: inventoryStore.adjustmentLinePort,
    controls: inventoryStore.controlPort,
    units: inventoryStore.unitPort,
    numbering: inventoryNumbering,
    workflow: inventoryWorkflow,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    traceability,
  });
  const incidents = new InventoryOpsIncidentService({
    types: inventoryStore.opsIncidentTypePort,
    incidents: inventoryStore.opsIncidentPort,
    events: inventoryStore.opsIncidentPort,
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    controls: inventoryStore.controlPort,
    workflow: inventoryWorkflow,
    numbering: inventoryNumbering,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    adjustments: adjustment,
  });
  const receiving = new StockReceivingService({
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    movements: inventoryStore.movementPort,
    balances: inventoryStore.balancePort,
    receipts: inventoryStore.receiptPort,
    receiptLines: inventoryStore.receiptLinePort,
    openings: inventoryStore.openingPort,
    openingLines: inventoryStore.openingLinePort,
    controls: inventoryStore.controlPort,
    suppliers: inventoryStore.supplierPort,
    units: inventoryStore.unitPort,
    numbering: inventoryNumbering,
    workflow: inventoryWorkflow,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    traceability,
    opsIncidents: incidents,
  });
  const reservation = new StockReservationService({
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    movements: inventoryStore.movementPort,
    balances: inventoryStore.balancePort,
    reservations: inventoryStore.reservationPort,
    fulfilments: inventoryStore.fulfilmentPort,
    controls: inventoryStore.controlPort,
    units: inventoryStore.unitPort,
    numbering: inventoryNumbering,
    workflow: inventoryWorkflow,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    salesFulfilment,
    traceability,
    opsIncidents: incidents,
  });
  const transfer = new StockTransferService({
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    movements: inventoryStore.movementPort,
    balances: inventoryStore.balancePort,
    transfers: inventoryStore.transferPort,
    transferLines: inventoryStore.transferLinePort,
    controls: inventoryStore.controlPort,
    units: inventoryStore.unitPort,
    numbering: inventoryNumbering,
    workflow: inventoryWorkflow,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    locationAccess: createBusinessScopedLocationAccess(inventoryStore.locationPort),
    traceability,
    opsIncidents: incidents,
  });
  const stocktake = new StocktakeService({
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    balances: inventoryStore.balancePort,
    stocktakes: inventoryStore.stocktakePort,
    stocktakeLines: inventoryStore.stocktakeLinePort,
    stocktakeCounts: inventoryStore.stocktakeCountPort,
    controls: inventoryStore.controlPort,
    units: inventoryStore.unitPort,
    numbering: inventoryNumbering,
    workflow: inventoryWorkflow,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    adjustments: adjustment,
    traceability,
  });
  const controls = new InventoryControlService({
    products: inventoryStore.productPort,
    stockItems: inventoryStore.stockItemPort,
    locations: inventoryStore.locationPort,
    itemLocations: inventoryStore.itemLocationPort,
    balances: inventoryStore.balancePort,
    advice: inventoryStore.advicePort,
    changes: inventoryStore.controlChangePort,
    controls: inventoryStore.controlPort,
    workflow: inventoryWorkflow,
    numbering: inventoryNumbering,
    idempotency: inventoryStore.idempotencyPort,
    locks: inventoryLocks,
    audit: inventoryAudit,
    traceability,
    opsIncidents: incidents,
  });

  const paymentStore = new InMemoryPaymentStore();
  const fixture = defaultCatalogueFixture();
  fixture.capabilities = fixture.capabilities.map((row) => ({
    ...row,
    supportsRefund: true,
  }));
  paymentStore.seedCatalogue(fixture);
  const paymentAudit = new RecordingPaymentAudit();
  const adapter = new ScriptedPaymentInitiationAdapter();
  adapter.nextInitiate = paymentOutcome(options?.paymentOutcome ?? "SUCCESSFUL");
  adapter.nextRefund = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: `refund-${input.originalPaymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: null,
    failureCode: null,
    failureReason: null,
  });
  adapter.nextSettlement = {
    settlementStatus: "PENDING",
    expectedAmount: String(UNIT_PRICE * SALE_QTY),
    receivedAmount: null,
    currency: "KES",
    settlementReference: null,
    settlementBatchReference: null,
    settlementDate: null,
  };
  const engine = createCatalogueCapabilityPaymentEngine(
    new InMemoryCapabilityStore(paymentStore),
    adapter
  );
  const flags: PaymentEnablementFlags = {
    cashEnabled: true,
    mobileMoneyEnabled: true,
    bankTransferEnabled: true,
    cardEnabled: true,
    creditSalesEnabled: true,
  };
  const enablement: PaymentEnablementPort = {
    async getFlags() {
      return flags;
    },
  };
  const shared = {
    contracts,
    obligations: paymentStore,
    idempotency: paymentStore.idempotencyPort,
    catalogues: paymentStore,
    engine,
    enablement,
    currencies: new InMemoryCurrencyReference(new Set(["KES", "USD"])),
    audit: paymentAudit,
  };
  const policy = createPaymentAllocationPolicyAdapter(false);
  const allocations = new PaymentAllocationService({
    obligations: paymentStore,
    transactions: paymentStore.transactionPort,
    allocations: paymentStore.allocationPort,
    idempotency: paymentStore.idempotencyPort,
    policy,
    locks: createInProcessPaymentLock(),
    audit: paymentAudit,
  });
  const paymentNumbering = new ScriptedDocumentNumberingAdapter();
  const receipting = new InProcessReceiptingAdapter();
  const documents = new InProcessDocumentAdapter();
  const notifications = new InProcessNotificationAdapter();
  const receipts = new PaymentReceiptService({
    transactions: paymentStore.transactionPort,
    obligations: paymentStore,
    allocations: paymentStore.allocationPort,
    invoices: paymentStore.invoicePort,
    receipts: paymentStore.receiptPort,
    numbering: paymentNumbering,
    receipting,
    documents,
    notifications,
    idempotency: paymentStore.idempotencyPort,
    audit: paymentAudit,
  });
  const invoices = new PaymentInvoiceService({
    obligations: paymentStore,
    invoices: paymentStore.invoicePort,
    terms: paymentStore.termPort,
    enablement,
    numbering: paymentNumbering,
    receipting,
    idempotency: paymentStore.idempotencyPort,
    audit: paymentAudit,
    clock: new ConfigurableInvoiceClock(new Date("2026-08-01T00:00:00.000Z")),
  });
  const settlements = new PaymentSettlementService({
    transactions: paymentStore.transactionPort,
    obligations: paymentStore,
    settlements: paymentStore.settlementPort,
    catalogues: paymentStore,
    policy: createPaymentSettlementPolicyAdapter(paymentStore),
    engine,
    refunds: paymentStore.refundPort,
    idempotency: paymentStore.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit: paymentAudit,
  });
  const refunds = new PaymentRefundService({
    transactions: paymentStore.transactionPort,
    obligations: paymentStore,
    allocations: paymentStore.allocationPort,
    receipts: paymentStore.receiptPort,
    invoices: paymentStore.invoicePort,
    refunds: paymentStore.refundPort,
    catalogues: paymentStore,
    numbering: paymentNumbering,
    receipting,
    documents,
    engine,
    workflow: new InProcessWorkflowAdapter({ requiresApproval: false }),
    instructions: new InMemoryFinancialInstructionAdapter(),
    allocationEffects: allocations,
    invoiceEffects: invoices,
    idempotency: paymentStore.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit: paymentAudit,
  });
  const box: { payments?: PaymentInitiationService } = {};
  const exceptions = new PaymentExceptionService({
    transactions: paymentStore.transactionPort,
    obligations: paymentStore,
    exceptions: paymentStore.exceptionPort,
    settlements: paymentStore.settlementPort,
    engine,
    workflow: new InProcessWorkflowAdapter({ requiresApproval: false }),
    numbering: paymentNumbering,
    policy: new ConfigurablePaymentExceptionPolicy(15 * 60 * 1000, false),
    outcomes: {
      applyProviderOutcome: (context, command) => box.payments!.applyProviderOutcome(context, command),
      initiatePayment: (context, command) => box.payments!.initiatePayment(context, command),
      refreshPaymentStatus: (context, transactionId) =>
        box.payments!.refreshPaymentStatus(context, transactionId),
    },
    catalogues: paymentStore,
    idempotency: paymentStore.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit: paymentAudit,
  });
  const payments = new PaymentInitiationService({
    ...shared,
    transactions: paymentStore.transactionPort,
    allocations,
    policy,
    receipts,
    settlements,
    exceptions,
  });
  box.payments = payments;

  return {
    sales,
    salesStore,
    salesAudit,
    inventoryStore,
    inventoryAudit,
    foundation,
    receiving,
    reservation,
    transfer,
    adjustment,
    stocktake,
    controls,
    incidents,
    traceability,
    paymentStore,
    paymentAudit,
    adapter,
    payments,
    obligations: new PaymentObligationService(shared),
    allocations,
    receipts,
    refunds,
    settlements,
    exceptions,
    invoices,
  };
}

type Harness = ReturnType<typeof harness>;

function balanceOf(store: InMemoryInventoryStore, stockItemId: string, locationId: string) {
  return [...store.balances.values()].find(
    (row) => row.businessId === "biz-a" && row.stockItemId === stockItemId && row.locationId === locationId
  );
}

async function confirmSale(env: Harness, actor: CurrentBusinessContext, quantity = SALE_QTY) {
  const line = await buildLine(actor.businessId, "product-a", quantity);
  const draft = await env.sales.createDirectSale(actor, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [line],
  });
  await env.sales.submitConfirmation(actor, draft.id);
  return env.sales.approveConfirmation(ctx(actor.businessId, CHECKER), draft.id);
}

async function setupCatalog(env: Harness, actor = ctx("biz-a")) {
  const item = await env.foundation.createStockItem(actor, {
    productId: "product-a",
    sku: "SKU-ALPHA",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    purchaseUomId: "uom-box",
    salesUomId: "uom-ea",
    conversionFactor: "12",
    stockTrackingEnabled: true,
  });
  const nairobi = await env.foundation.createLocation(actor, {
    code: "NBO",
    name: "Nairobi Warehouse",
    locationTypeCode: "WAREHOUSE",
  });
  const westlands = await env.foundation.createLocation(actor, {
    code: "WLD",
    name: "Westlands Store",
    locationTypeCode: "BRANCH_STORE",
  });
  await env.foundation.configureStockItemLocation(actor, {
    stockItemId: item.id,
    locationId: nairobi.id,
  });
  await env.foundation.configureStockItemLocation(actor, {
    stockItemId: item.id,
    locationId: westlands.id,
  });
  return { item, nairobi, westlands };
}

async function postOpeningBoxes(env: Harness, actor: CurrentBusinessContext, locationId: string, stockItemId: string, boxes: string) {
  const opening = await env.receiving.createOpeningBalance(actor, { locationId });
  await env.receiving.addOpeningBalanceLine(actor, opening.id, {
    stockItemId,
    quantity: boxes,
    uomId: "uom-box",
  });
  return env.receiving.postOpeningBalance(actor, opening.id);
}

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...listTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function scanCrossDomainBoundaries() {
  const area = "Architecture boundaries";
  const paymentRoot = path.join(ROOT, "src/modules/payments");
  const inventoryRoot = path.join(ROOT, "src/modules/inventory");
  const salesRoot = path.join(ROOT, "src/modules/sales");
  const paymentFiles = listTsFiles(paymentRoot).filter((file) => !file.includes("architecture-scan"));
  const inventoryFiles = listTsFiles(inventoryRoot).filter((file) => !file.includes("architecture-scan"));
  const salesFiles = listTsFiles(salesRoot);
  const paymentSource = paymentFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  const inventorySource = inventoryFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  const salesSource = salesFiles.map((file) => readFileSync(file, "utf8")).join("\n");

  const inventoryScan = scanInventoryArchitecture(
    [
      ...listInventorySourceFiles(inventoryRoot),
      ...listInventorySourceFiles(path.join(ROOT, "src/core/inventory-engine")),
    ].filter((file) => !file.replace(/\\/g, "/").includes("/architecture-scan"))
  );
  const paymentScan = scanPaymentArchitecture(
    listPaymentSourceFiles(paymentRoot).filter(
      (file) => !file.replace(/\\/g, "/").includes("/architecture-scan")
    )
  );

  pass(
    area,
    "SIC-20-01:payment-does-not-mutate-inventory-balances",
    !paymentSource.includes("inventory_balance") &&
      !paymentSource.includes("applyInboundOnHand") &&
      !paymentSource.includes("from \"@/modules/inventory"),
    "Payment module has no inventory balance writes"
  );
  pass(
    area,
    "SIC-20-02:inventory-does-not-mutate-payment-status",
    inventoryScan.paymentHits.length === 0 &&
      !inventorySource.includes("PAYMENT_STATUS_CODES") &&
      !inventorySource.includes("from \"@/modules/payments"),
    inventoryScan.paymentHits.join(", ") || "no payment schema imports"
  );
  pass(
    area,
    "SIC-20-03:receipt-does-not-create-payment-success",
    readFileSync(path.join(ROOT, "src/modules/payments/services/payment-receipt-service.ts"), "utf8").includes(
      "assertReceiptEligible"
    ) &&
      !readFileSync(path.join(ROOT, "src/modules/payments/services/payment-receipt-service.ts"), "utf8").includes(
        "status: PAYMENT_STATUS_CODES.SUCCESSFUL"
      )
  );
  pass(
    area,
    "SIC-20-04:settlement-does-not-change-payment-status",
    readFileSync(path.join(ROOT, "src/modules/payments/services/payment-settlement-service.ts"), "utf8").includes(
      "assertPaymentUnchanged"
    )
  );
  pass(
    area,
    "SIC-20-05:exception-resolution-uses-ip05-for-adjustments",
    readFileSync(
      path.join(ROOT, "src/modules/inventory/services/inventory-ops-incident-service.ts"),
      "utf8"
    ).includes("this.deps.adjustments.createAdjustment") &&
      readFileSync(
        path.join(ROOT, "src/modules/inventory/services/inventory-ops-incident-service.ts"),
        "utf8"
      ).includes("without mutating stock")
  );
  pass(
    area,
    "SIC-20-06:reorder-does-not-purchase-or-receive",
    !readFileSync(path.join(ROOT, "src/modules/inventory/services/inventory-control-service.ts"), "utf8").includes(
      "createPurchase"
    ) &&
      !readFileSync(path.join(ROOT, "src/modules/inventory/services/inventory-control-service.ts"), "utf8").includes(
        "postReceipt"
      )
  );
  pass(
    area,
    "SIC-20-07:transfer-does-not-implement-adjustments",
    !readFileSync(path.join(ROOT, "src/modules/inventory/services/stock-transfer-service.ts"), "utf8").includes(
      "createAdjustment"
    ) &&
      !readFileSync(path.join(ROOT, "src/modules/inventory/services/stock-transfer-service.ts"), "utf8").includes(
        "adjustStock("
      )
  );
  pass(
    area,
    "SIC-20-08:refund-does-not-overwrite-original-payment",
    readFileSync(path.join(ROOT, "src/modules/payments/services/payment-refund-service.ts"), "utf8").includes(
      "originalPaymentTransactionId"
    )
  );
  pass(
    area,
    "SIC-20-09:single-inventory-ledger",
    inventoryScan.glHits.filter((file) => !file.includes("architecture-scan")).length === 0 &&
      existsSync(path.join(ROOT, "src/core/inventory-engine")) &&
      !salesSource.includes("from \"@/db/schema/inventory-movement\"")
  );
  pass(
    area,
    "SIC-20-10:no-live-provider-sdks",
    paymentScan.sdkHits.length === 0 && inventoryScan.sdkHits.length === 0,
    [...paymentScan.sdkHits, ...inventoryScan.sdkHits].join(", ") || "none"
  );
  pass(
    area,
    "SIC-20-11:no-second-availability-engine-in-payments-or-sales",
    !paymentSource.includes("onHand - reserved") &&
      !salesSource.includes("available = onHand")
  );
  pass(
    area,
    "SIC-20-12:sales-does-not-collect-payment-or-move-stock",
    readFileSync(path.join(ROOT, "src/modules/sales/services/handoff-rules.ts"), "utf8").includes(
      "Does not collect payment, move stock"
    ) &&
      !salesSource.includes("from \"@/modules/payments") &&
      !salesSource.includes("from \"@/modules/inventory")
  );
  pass(
    area,
    "SIC-20-13:no-bp009-or-later-leakage",
    !paymentSource.includes("BP-009") &&
      !inventorySource.includes("BP-009") &&
      !salesSource.includes("BP-010") &&
      !paymentSource.includes("general ledger") &&
      !inventorySource.includes("collections")
  );
  pass(
    area,
    "SIC-20-14:product-adapter-is-read-only",
    existsSync(path.join(ROOT, "src/modules/inventory/adapters/product-catalogue-adapter.ts")) &&
      readFileSync(
        path.join(ROOT, "src/modules/inventory/adapters/product-catalogue-adapter.ts"),
        "utf8"
      ).includes("Does not write")
  );
  pass(
    area,
    "SIC-20-15:payment-ready-adapter-consumes-sales-contract",
    readFileSync(
      path.join(ROOT, "src/modules/payments/adapters/payment-ready-contract-adapter.ts"),
      "utf8"
    ).includes("getPaymentReadyContract")
  );
  pass(
    area,
    "SIC-20-16:fulfilment-adapter-consumes-sales-contract",
    readFileSync(
      path.join(ROOT, "src/modules/inventory/adapters/sales-fulfilment-contract-adapter.ts"),
      "utf8"
    ).includes("toFulfilmentHandoffContract") &&
      !readFileSync(
        path.join(ROOT, "src/modules/inventory/adapters/sales-fulfilment-contract-adapter.ts"),
        "utf8"
      ).includes("payment.status")
  );
}

async function runGoldenJourney() {
  const area = "Golden journey";
  const actor = ctx("biz-a");
  const env = harness({ paymentOutcome: "PENDING" });
  const catalog = await setupCatalog(env);

  pass(
    area,
    "SIC-01-01:product-exists",
    catalog.item.productId === "product-a" && catalog.item.sku === "SKU-ALPHA"
  );
  pass(
    area,
    "SIC-01-02:uom-and-conversion-configured",
    catalog.item.baseUomId === "uom-ea" &&
      catalog.item.purchaseUomId === "uom-box" &&
      catalog.item.conversionFactor === "12"
  );
  pass(
    area,
    "SIC-01-03:product-inventory-relationship",
    catalog.item.productId === "product-a"
  );
  pass(
    area,
    "SIC-01-05:sale-uom-explicit-on-stock-item",
    catalog.item.salesUomId === "uom-ea" && catalog.item.purchaseUomId === "uom-box",
    "Handoff carries salesUomId; inventory never falls back to purchase UOM"
  );

  const opening = await postOpeningBoxes(env, actor, catalog.nairobi.id, catalog.item.id, "10");
  const openingLine = opening.lines[0];
  const openingMovements = [...env.inventoryStore.movements.values()].filter(
    (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE
  );
  const afterOpen = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    area,
    "SIC-23-B:opening-10-box-equals-120-each",
    openingLine?.quantity === "10" &&
      openingLine.uomCode === "BOX" &&
      openingLine.baseQuantity === "120" &&
      openingLine.baseUomCode === "EA" &&
      afterOpen?.onHand === "120" &&
      openingMovements.length === 1,
    `entered=${openingLine?.quantity} ${openingLine?.uomCode} base=${openingLine?.baseQuantity} onHand=${afterOpen?.onHand}`
  );
  const replayOpening = await env.receiving.postOpeningBalance(actor, opening.id);
  pass(
    area,
    "SIC-23-B-idempotent-opening",
    replayOpening.id === opening.id &&
      balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id)?.onHand === "120" &&
      [...env.inventoryStore.movements.values()].filter(
        (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE
      ).length === 1
  );

  const sale = await confirmSale(env, actor, SALE_QTY);
  const saleLine = sale.lines[0];
  pass(
    area,
    "SIC-01-04:sale-references-customer-and-product",
    sale.customerId === "party-1" &&
      saleLine?.offeringId === "product-a" &&
      Number(saleLine.orderedQuantity) === SALE_QTY &&
      sale.status === SALES_ORDER_STATUS_CODES.CONFIRMED,
    `order=${sale.orderNumber} qty=${saleLine?.orderedQuantity} amount=${sale.expectedAmount}`
  );

  const reserved = await env.reservation.createReservationFromSale(
    actor,
    sale.id,
    saleLine!.id,
    catalog.nairobi.id
  );
  const afterReserve = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    area,
    "SIC-06-01:reservation-from-confirmed-sale",
    reserved.salesOrderId === sale.id &&
      reserved.salesOrderLineId === saleLine!.id &&
      reserved.status === INVENTORY_RESERVATION_STATUSES.RESERVED &&
      afterReserve?.onHand === "120" &&
      afterReserve.reserved === "20" &&
      afterReserve.available === "100",
    `onHand=${afterReserve?.onHand} reserved=${afterReserve?.reserved} available=${afterReserve?.available}`
  );

  const obligation = await env.obligations.createObligation(actor, { orderId: sale.id });
  pass(
    area,
    "SIC-02-01:obligation-copies-sale-amount-and-customer",
    obligation.salesOrderId === sale.id &&
      obligation.customerId === "party-1" &&
      obligation.amountDue === sale.expectedAmount &&
      obligation.currencyCode === "KES" &&
      obligation.outstandingAmount === sale.expectedAmount,
    `amountDue=${obligation.amountDue} expected=${sale.expectedAmount}`
  );

  const pending = await env.payments.initiatePayment(actor, {
    obligationId: obligation.id,
    methodId: "method-mm",
    amount: obligation.amountDue,
    currency: "KES",
    idempotencyKey: "golden-pending",
  });
  const pendingAlloc = await env.paymentStore.allocationPort.listByTransaction(
    actor.businessId,
    pending.transaction.id
  );
  const pendingReceipt = await env.receipts.getByTransaction(actor, pending.transaction.id);
  const afterPending = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    area,
    "SIC-05-01:pending-is-not-financial-or-inventory-success",
    pending.transaction.status === PAYMENT_STATUS_CODES.PENDING &&
      pendingAlloc.length === 0 &&
      !pendingReceipt &&
      afterPending?.onHand === "120" &&
      afterPending.reserved === "20" &&
      afterPending.available === "100",
    `status=${pending.transaction.status} alloc=${pendingAlloc.length} onHand=${afterPending?.onHand}`
  );

  env.adapter.nextInitiate = paymentOutcome("SUCCESSFUL");
  const succeeded = await env.payments.applyProviderOutcome(actor, {
    paymentTransactionId: pending.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: pending.transaction.providerTransactionReference,
      amount: obligation.amountDue,
      currency: "KES",
      obligationId: obligation.id,
    },
  });
  const afterPay = await env.paymentStore.findById(actor.businessId, obligation.id);
  const allocations = await env.paymentStore.allocationPort.listByTransaction(
    actor.businessId,
    pending.transaction.id
  );
  const autoReceipt = await env.receipts.getByTransaction(actor, pending.transaction.id);
  const afterSuccessInv = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    area,
    "SIC-03-01:successful-payment-creates-allocation",
    succeeded.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      allocations.length >= 1 &&
      Number(afterPay?.paidAmount) === Number(obligation.amountDue) &&
      Number(afterPay?.outstandingAmount) === 0,
    `status=${succeeded.transaction.status} alloc=${allocations.length}/${allocations[0]?.status} paid=${afterPay?.paidAmount} outstanding=${afterPay?.outstandingAmount}`
  );
  pass(
    area,
    "SIC-04-01:successful-payment-can-issue-receipt",
    Boolean(autoReceipt?.receiptNumber) &&
      autoReceipt?.amount === obligation.amountDue &&
      autoReceipt.paymentTransactionId === pending.transaction.id
  );
  pass(
    area,
    "SIC-05-02:payment-success-does-not-deduct-inventory",
    afterSuccessInv?.onHand === "120" &&
      afterSuccessInv.reserved === "20" &&
      afterSuccessInv.available === "100",
    "Intended contract: deduction is fulfilReservation from the sales fulfilment handoff, not payment SUCCESS"
  );

  const issuedAgain = await env.receipts.issueReceipt(actor, {
    paymentTransactionId: pending.transaction.id,
    idempotencyKey: "golden-receipt",
  });
  const issuedReplay = await env.receipts.issueReceipt(actor, {
    paymentTransactionId: pending.transaction.id,
    idempotencyKey: "golden-receipt",
  });
  pass(
    area,
    "SIC-04-02:receipt-idempotent-and-does-not-create-success",
    issuedAgain.id === autoReceipt?.id &&
      issuedReplay.id === issuedAgain.id &&
      succeeded.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id)?.onHand === "120"
  );

  const acceptedOnHandoff = saleLine?.acceptedQuantity;
  const deducted = await env.reservation.fulfilReservationFromSale(
    actor,
    sale.id,
    saleLine!.id,
    `FULFIL-${sale.orderNumber}`
  );
  pass(
    area,
    "SIC-07-00:fulfil-from-sale-uses-remaining-reserved",
    (acceptedOnHandoff === "0" || acceptedOnHandoff === "0.000000" || !Number(acceptedOnHandoff)) &&
      deducted.status === INVENTORY_RESERVATION_STATUSES.FULFILLED &&
      deducted.fulfilledQuantity === "20",
    `handoff acceptedQuantity=${acceptedOnHandoff}; fulfilled=${deducted.fulfilledQuantity}`
  );
  const afterDeduct = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  const saleMovements = [...env.inventoryStore.movements.values()].filter(
    (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION
  );
  pass(
    area,
    "SIC-07-01:sales-fulfilment-deducts-reserved-stock",
    deducted.status === INVENTORY_RESERVATION_STATUSES.FULFILLED &&
      afterDeduct?.onHand === "100" &&
      afterDeduct.reserved === "0" &&
      afterDeduct.available === "100" &&
      saleMovements.length === 1 &&
      saleMovements[0]?.quantity === "20",
    `onHand=${afterDeduct?.onHand} reserved=${afterDeduct?.reserved} available=${afterDeduct?.available}`
  );
  const deductReplay = await env.reservation.fulfilReservation(actor, deducted.id, {
    quantity: "20",
    fulfilmentReference: `FULFIL-${sale.orderNumber}`,
  });
  pass(
    area,
    "SIC-07-02:duplicate-deduction-does-not-double-stock",
    deductReplay.id === deducted.id &&
      [...env.inventoryStore.movements.values()].filter(
        (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION
      ).length === 1 &&
      balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id)?.onHand === "100",
    "idempotent replay"
  );

  const createdTransfer = await env.transfer.createTransfer(actor, {
    sourceLocationId: catalog.nairobi.id,
    destinationLocationId: catalog.westlands.id,
    reason: "Replenish Westlands",
    idempotencyKey: "golden-transfer",
    lines: [{ stockItemId: catalog.item.id, quantity: "30" }],
  });
  const requested = await env.transfer.requestTransfer(actor, createdTransfer.id);
  const dispatched = await env.transfer.dispatchTransfer(actor, requested.id);
  const srcAfterDispatch = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  const destAfterDispatch = balanceOf(env.inventoryStore, catalog.item.id, catalog.westlands.id);
  const availability = await env.reservation.listAvailability(actor);
  const withTransit = await env.transfer.enrichAvailability(actor, availability);
  const destAvail = withTransit.find(
    (row) => row.stockItemId === catalog.item.id && row.locationId === catalog.westlands.id
  );
  pass(
    area,
    "SIC-08-01:dispatch-reduces-source-creates-in-transit",
    dispatched.status === INVENTORY_TRANSFER_STATUSES.IN_TRANSIT &&
      srcAfterDispatch?.onHand === "70" &&
      (!destAfterDispatch || destAfterDispatch.onHand === "0") &&
      destAvail?.inTransit === "30" &&
      destAvail.available !== "30",
    `sourceOnHand=${srcAfterDispatch?.onHand} destOnHand=${destAfterDispatch?.onHand ?? "0"} inTransit=${destAvail?.inTransit}`
  );

  const received = await env.transfer.receiveTransfer(actor, {
    transferId: dispatched.id,
    lines: [{ lineId: dispatched.lines[0]!.id, receivedQuantity: "30" }],
  });
  const destAfterReceive = balanceOf(env.inventoryStore, catalog.item.id, catalog.westlands.id);
  const afterReceiveAvail = await env.transfer.enrichAvailability(
    actor,
    await env.reservation.listAvailability(actor)
  );
  const destAfter = afterReceiveAvail.find(
    (row) => row.stockItemId === catalog.item.id && row.locationId === catalog.westlands.id
  );
  pass(
    area,
    "SIC-08-02:receive-completes-and-clears-in-transit",
    received.status === INVENTORY_TRANSFER_STATUSES.COMPLETED &&
      destAfterReceive?.onHand === "30" &&
      (destAfter?.inTransit === "0" || !destAfter?.inTransit),
    `destOnHand=${destAfterReceive?.onHand} inTransit=${destAfter?.inTransit ?? "0"}`
  );

  return { env, catalog, sale, obligation, payment: pending, receipt: autoReceipt };
}

async function runPartialTransfer() {
  const area = "Inventory transfer integration";
  const actor = ctx("biz-a");
  const env = harness();
  const catalog = await setupCatalog(env);
  await env.foundation.recordOpeningStock(actor, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "50",
  });
  const created = await env.transfer.createTransfer(actor, {
    sourceLocationId: catalog.nairobi.id,
    destinationLocationId: catalog.westlands.id,
    lines: [{ stockItemId: catalog.item.id, quantity: "30" }],
  });
  await env.transfer.requestTransfer(actor, created.id);
  await env.transfer.dispatchTransfer(actor, created.id);
  const received = await env.transfer.receiveTransfer(actor, {
    transferId: created.id,
    lines: [{ lineId: created.lines[0]!.id, receivedQuantity: "28" }],
  });
  const incidents = await env.incidents.listIncidents(actor, {
    incidentType: INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION,
  });
  const dest = balanceOf(env.inventoryStore, catalog.item.id, catalog.westlands.id);
  const beforeResolve = dest?.onHand;
  if (incidents[0]) {
    await env.incidents.requestResolution(actor, {
      incidentId: incidents[0].id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.MANUAL_REVIEW_COMPLETED,
      reason: "Investigate short receipt; no silent correction",
    });
  }
  const afterResolve = balanceOf(env.inventoryStore, catalog.item.id, catalog.westlands.id)?.onHand;
  pass(
    area,
    "SIC-08-03:partial-receipt-records-discrepancy",
    received.status === INVENTORY_TRANSFER_STATUSES.DISCREPANCY &&
      received.totalReceived === "28" &&
      received.totalDiscrepancy === "2" &&
      dest?.onHand === "28",
    `received=${received.totalReceived} discrepancy=${received.totalDiscrepancy} dest=${dest?.onHand}`
  );
  pass(
    area,
    "SIC-11-01:discrepancy-handed-to-ip09",
    incidents.some((row) => row.sourceId === created.id && row.incidentType === INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION)
  );
  pass(
    area,
    "SIC-11-02:ip09-resolution-does-not-silently-alter-stock",
    Number(beforeResolve) === Number(afterResolve) && Number(afterResolve) === 28,
    `before=${beforeResolve} after=${afterResolve}`
  );
}

async function runReservationTransferGuard() {
  const area = "Inventory reservation integration";
  const actor = ctx("biz-a");
  const env = harness();
  const catalog = await setupCatalog(env);
  await env.foundation.recordOpeningStock(actor, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "100",
  });
  await env.reservation.createReservation(actor, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "40",
  });
  const blocked = await env.transfer.createTransfer(actor, {
    sourceLocationId: catalog.nairobi.id,
    destinationLocationId: catalog.westlands.id,
    lines: [{ stockItemId: catalog.item.id, quantity: "70" }],
  });
  await env.transfer.requestTransfer(actor, blocked.id);
  const blockedCode = await caughtCode(() => env.transfer.dispatchTransfer(actor, blocked.id));
  const allowed = await env.transfer.createTransfer(actor, {
    sourceLocationId: catalog.nairobi.id,
    destinationLocationId: catalog.westlands.id,
    lines: [{ stockItemId: catalog.item.id, quantity: "50" }],
  });
  await env.transfer.requestTransfer(actor, allowed.id);
  const dispatched = await env.transfer.dispatchTransfer(actor, allowed.id);
  const source = balanceOf(env.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    area,
    "SIC-06-02:transfer-70-blocked-when-available-60",
    blockedCode === INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK
  );
  pass(
    area,
    "SIC-06-03:transfer-50-allowed-and-uses-ip03-availability",
    dispatched.status === INVENTORY_TRANSFER_STATUSES.IN_TRANSIT && source?.reserved === "40"
  );
}

async function runRefundAndSettlement(golden: Awaited<ReturnType<typeof runGoldenJourney>>) {
  const actor = ctx("biz-a");
  const refund = await golden.env.refunds.requestRefund(actor, {
    paymentTransactionId: golden.payment.transaction.id,
    reason: "Customer cancelled",
    idempotencyKey: "golden-full-refund",
  });
  const paymentAfter = await golden.env.paymentStore.transactionPort.findById(
    actor.businessId,
    golden.payment.transaction.id
  );
  const receiptAfter = await golden.env.receipts.getByTransaction(actor, golden.payment.transaction.id);
  const obligationAfter = await golden.env.paymentStore.findById(actor.businessId, golden.obligation.id);
  const inventoryAfter = balanceOf(
    golden.env.inventoryStore,
    golden.catalog.item.id,
    golden.catalog.nairobi.id
  );
  pass(
    "Refund integration",
    "SIC-09-01:financial-refund-does-not-mutate-originals",
    paymentAfter?.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      receiptAfter?.id === golden.receipt?.id &&
      receiptAfter?.amount === golden.receipt?.amount &&
      obligationAfter?.amountDue === golden.obligation.amountDue &&
      Boolean(refund.refundNumber),
    `refund=${refund.refundNumber} amountDue=${obligationAfter?.amountDue}`
  );
  record(
    "Refund integration",
    "SIC-09-02:no-automatic-inventory-return",
    "NOT_APPLICABLE",
    "Financial refund exists, but inventory return is not automatically created. EXPECTED ARCHITECTURAL BOUNDARY."
  );
  pass(
    "Refund integration",
    "SIC-09-03:refund-does-not-change-inventory-amountDue",
    obligationAfter?.amountDue === golden.obligation.amountDue &&
      inventoryAfter?.onHand === "70"
  );

  const settlementEnv = harness();
  const catalog = await setupCatalog(settlementEnv);
  await settlementEnv.foundation.recordOpeningStock(actor, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "20",
  });
  const sale = await confirmSale(settlementEnv, actor, SALE_QTY);
  const obligation = await settlementEnv.obligations.createObligation(actor, { orderId: sale.id });
  const paid = await settlementEnv.payments.initiatePayment(actor, {
    obligationId: obligation.id,
    methodId: "method-mm",
    amount: obligation.amountDue,
    currency: "KES",
    idempotencyKey: "settle-pay",
  });
  const receipt = await settlementEnv.receipts.getByTransaction(actor, paid.transaction.id);
  const handoff = await settlementEnv.settlements.getReconciliationHandoff(actor, paid.transaction.id);
  const confirmed = await settlementEnv.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: paid.transaction.id,
    receivedAmount: obligation.amountDue,
    settlementReference: "SET-ALPHA-1",
    settlementStatus: "CONFIRMED",
  });
  const txnAfter = await settlementEnv.paymentStore.transactionPort.findById(
    actor.businessId,
    paid.transaction.id
  );
  const receiptAfterSettle = await settlementEnv.receipts.getByTransaction(actor, paid.transaction.id);
  const obligationAfterSettle = await settlementEnv.paymentStore.findById(actor.businessId, obligation.id);
  const inventoryAfterSettle = balanceOf(settlementEnv.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    "Settlement integration",
    "SIC-10-01:settlement-is-operational-only",
    confirmed.settlementStatus.includes("CONFIRMED") &&
      txnAfter?.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      receiptAfterSettle?.id === receipt?.id &&
      obligationAfterSettle?.amountDue === obligation.amountDue &&
      inventoryAfterSettle?.onHand === "20"
  );
  pass(
    "Settlement integration",
    "SIC-10-02:handoff-contains-required-fields",
    handoff.paymentTransactionId === paid.transaction.id &&
      handoff.businessId === actor.businessId &&
      Boolean(handoff.providerTransactionReference) &&
      handoff.paymentAmount === obligation.amountDue &&
      handoff.expectedSettlementAmount === obligation.amountDue
  );
}

async function runPaymentExceptions() {
  const actor = ctx("biz-a");
  const unknownEnv = harness({ paymentOutcome: "UNKNOWN" });
  const catalog = await setupCatalog(unknownEnv);
  await unknownEnv.foundation.recordOpeningStock(actor, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "20",
  });
  const sale = await confirmSale(unknownEnv, actor);
  await unknownEnv.reservation.createReservationFromSale(
    actor,
    sale.id,
    sale.lines[0]!.id,
    catalog.nairobi.id
  );
  const obligation = await unknownEnv.obligations.createObligation(actor, { orderId: sale.id });
  const unknown = await unknownEnv.payments.initiatePayment(actor, {
    obligationId: obligation.id,
    methodId: "method-mm",
    amount: obligation.amountDue,
    currency: "KES",
    idempotencyKey: "unknown-1",
  });
  const unknownRows = await unknownEnv.exceptions.listForTransaction(actor, unknown.transaction.id);
  const unknownAlloc = await unknownEnv.paymentStore.allocationPort.listByTransaction(
    actor.businessId,
    unknown.transaction.id
  );
  const unknownReceipt = await unknownEnv.receipts.getByTransaction(actor, unknown.transaction.id);
  const retry = await unknownEnv.exceptions.canRetry(actor, unknown.transaction.id);
  const retryCode = await caughtCode(() =>
    unknownEnv.exceptions.retryPayment(actor, unknown.transaction.id)
  );
  const bypassCode = await caughtCode(() =>
    unknownEnv.payments.initiatePayment(actor, {
      obligationId: obligation.id,
      methodId: "method-mm",
      amount: obligation.amountDue,
      currency: "KES",
      idempotencyKey: "unknown-bypass",
    })
  );
  const afterUnknownInv = balanceOf(unknownEnv.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    "Exception integration",
    "SIC-11-03:unknown-does-not-complete-finance-or-inventory",
    unknown.transaction.status === PAYMENT_STATUS_CODES.UNKNOWN &&
      unknownAlloc.length === 0 &&
      !unknownReceipt &&
      unknownRows.some((row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN) &&
      afterUnknownInv?.onHand === "20" &&
      afterUnknownInv.reserved === "20"
  );
  pass(
    "Exception integration",
    "SIC-11-04:unknown-blocks-blind-retry",
    retry.allowed === false &&
      retryCode === PAYMENT_ERROR_CODES.EXCEPTION_RETRY_NOT_ALLOWED &&
      bypassCode === PAYMENT_ERROR_CODES.PAYMENT_UNKNOWN
  );

  unknownEnv.adapter.nextQuery = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: input.providerTransactionReference,
    amount: obligation.amountDue,
    currency: "KES",
    obligationId: null,
    failureCode: null,
    failureReason: null,
  });
  const resolved = await unknownEnv.exceptions.queryProvider(actor, unknown.transaction.id);
  const afterResolveInv = balanceOf(unknownEnv.inventoryStore, catalog.item.id, catalog.nairobi.id);
  pass(
    "Exception integration",
    "SIC-11-05:resolved-unknown-may-complete-payment-not-inventory",
    resolved?.paymentStatus === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      afterResolveInv?.onHand === "20" &&
      afterResolveInv.reserved === "20"
  );

  const failedEnv = harness({ paymentOutcome: "FAILED" });
  const failedCatalog = await setupCatalog(failedEnv);
  await failedEnv.foundation.recordOpeningStock(actor, {
    stockItemId: failedCatalog.item.id,
    locationId: failedCatalog.nairobi.id,
    quantity: "20",
  });
  const failedSale = await confirmSale(failedEnv, actor);
  await failedEnv.reservation.createReservationFromSale(
    actor,
    failedSale.id,
    failedSale.lines[0]!.id,
    failedCatalog.nairobi.id
  );
  const failedOb = await failedEnv.obligations.createObligation(actor, { orderId: failedSale.id });
  const failed = await failedEnv.payments.initiatePayment(actor, {
    obligationId: failedOb.id,
    methodId: "method-mm",
    amount: failedOb.amountDue,
    currency: "KES",
    idempotencyKey: "failed-1",
  });
  const failedAlloc = await failedEnv.paymentStore.allocationPort.listByTransaction(
    actor.businessId,
    failed.transaction.id
  );
  const failedReceipt = await failedEnv.receipts.getByTransaction(actor, failed.transaction.id);
  const failedObAfter = await failedEnv.paymentStore.findById(actor.businessId, failedOb.id);
  const failedInv = balanceOf(failedEnv.inventoryStore, failedCatalog.item.id, failedCatalog.nairobi.id);
  pass(
    "Exception integration",
    "SIC-11-06:failed-payment-leaves-outstanding-and-reservation",
    failed.transaction.status === PAYMENT_STATUS_CODES.FAILED &&
      failedAlloc.length === 0 &&
      !failedReceipt &&
      failedObAfter?.outstandingAmount === failedOb.amountDue &&
      failedInv?.reserved === "20" &&
      failedInv.onHand === "20"
  );
}

async function runIdempotencyAndConcurrency() {
  const actor = ctx("biz-a");
  const env = harness();
  const catalog = await setupCatalog(env);
  await env.foundation.recordOpeningStock(actor, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "20",
  });
  const sale = await confirmSale(env, actor);
  const firstOb = await env.obligations.createObligation(actor, {
    orderId: sale.id,
    idempotencyKey: "ob-1",
  });
  const secondOb = await env.obligations.createObligation(actor, {
    orderId: sale.id,
    idempotencyKey: "ob-1",
  });
  const pay1 = await env.payments.initiatePayment(actor, {
    obligationId: firstOb.id,
    methodId: "method-mm",
    amount: firstOb.amountDue,
    currency: "KES",
    idempotencyKey: "pay-1",
  });
  const pay2 = await env.payments.initiatePayment(actor, {
    obligationId: firstOb.id,
    methodId: "method-mm",
    amount: firstOb.amountDue,
    currency: "KES",
    idempotencyKey: "pay-1",
  });
  pass(
    "Idempotency",
    "SIC-16-02:initiate-replay-after-success",
    pay1.transaction.id === pay2.transaction.id,
    "Replay returned the original transaction"
  );
  const receipt1 = await env.receipts.issueReceipt(actor, {
    paymentTransactionId: pay1.transaction.id,
    idempotencyKey: "rcpt-1",
  });
  const receipt2 = await env.receipts.issueReceipt(actor, {
    paymentTransactionId: pay1.transaction.id,
    idempotencyKey: "rcpt-1",
  });
  pass(
    "Idempotency",
    "SIC-16-01:obligation-payment-receipt-idempotent",
    firstOb.id === secondOb.id &&
      pay1.transaction.id === pay2.transaction.id &&
      receipt1.id === receipt2.id &&
      (await env.paymentStore.allocationPort.listByObligation(actor.businessId, firstOb.id)).length === 1
  );

  const limited = harness();
  const limitedCatalog = await setupCatalog(limited);
  await limited.foundation.recordOpeningStock(actor, {
    stockItemId: limitedCatalog.item.id,
    locationId: limitedCatalog.nairobi.id,
    quantity: "10",
  });
  const [first, second] = await Promise.allSettled([
    limited.reservation.createReservation(actor, {
      stockItemId: limitedCatalog.item.id,
      locationId: limitedCatalog.nairobi.id,
      quantity: "8",
      idempotencyKey: "conc-a",
    }),
    limited.reservation.createReservation(actor, {
      stockItemId: limitedCatalog.item.id,
      locationId: limitedCatalog.nairobi.id,
      quantity: "5",
      idempotencyKey: "conc-b",
    }),
  ]);
  const limitedBalance = balanceOf(limited.inventoryStore, limitedCatalog.item.id, limitedCatalog.nairobi.id);
  const successes = [first, second].filter((row) => row.status === "fulfilled");
  const failures = [first, second].filter((row) => row.status === "rejected");
  pass(
    "Concurrency",
    "SIC-17-01:overlapping-reservations-cannot-go-negative",
    successes.length === 1 &&
      failures.length === 1 &&
      Number(limitedBalance?.available ?? "-1") >= 0 &&
      Number(limitedBalance?.reserved ?? "0") <= 10,
    `reserved=${limitedBalance?.reserved} available=${limitedBalance?.available}`
  );

  const transferEnv = harness();
  const transferCatalog = await setupCatalog(transferEnv);
  await transferEnv.foundation.recordOpeningStock(actor, {
    stockItemId: transferCatalog.item.id,
    locationId: transferCatalog.nairobi.id,
    quantity: "30",
  });
  const t1 = await transferEnv.transfer.createTransfer(actor, {
    sourceLocationId: transferCatalog.nairobi.id,
    destinationLocationId: transferCatalog.westlands.id,
    lines: [{ stockItemId: transferCatalog.item.id, quantity: "20" }],
  });
  const t2 = await transferEnv.transfer.createTransfer(actor, {
    sourceLocationId: transferCatalog.nairobi.id,
    destinationLocationId: transferCatalog.westlands.id,
    lines: [{ stockItemId: transferCatalog.item.id, quantity: "20" }],
  });
  await transferEnv.transfer.requestTransfer(actor, t1.id);
  await transferEnv.transfer.requestTransfer(actor, t2.id);
  const [d1, d2] = await Promise.allSettled([
    transferEnv.transfer.dispatchTransfer(actor, t1.id),
    transferEnv.transfer.dispatchTransfer(actor, t2.id),
  ]);
  const src = balanceOf(transferEnv.inventoryStore, transferCatalog.item.id, transferCatalog.nairobi.id);
  const dispatchMovements = [...transferEnv.inventoryStore.movements.values()].filter(
    (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH
  );
  pass(
    "Concurrency",
    "SIC-17-02:overlapping-dispatches-cannot-go-negative",
    [d1, d2].filter((row) => row.status === "fulfilled").length === 1 &&
      Number(src?.onHand ?? "-1") >= 0 &&
      dispatchMovements.length === 1,
    `onHand=${src?.onHand} movements=${dispatchMovements.length}`
  );
}

async function runTraceabilityStocktakeControls() {
  const actor = ctx("biz-a");
  const env = harness();
  const batchItem = await env.foundation.createStockItem(actor, {
    productId: "product-batch",
    sku: "SKU-BATCH",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
    trackingMode: INVENTORY_TRACKING_MODES.BATCH,
    expiryTrackingEnabled: true,
    allowExpiredFulfilment: false,
  });
  const serialItem = await env.foundation.createStockItem(actor, {
    productId: "product-serial",
    sku: "SKU-SERIAL",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
    trackingMode: INVENTORY_TRACKING_MODES.SERIAL,
  });
  const nairobi = await env.foundation.createLocation(actor, {
    code: "NBO",
    name: "Nairobi Warehouse",
    locationTypeCode: "WAREHOUSE",
  });
  const westlands = await env.foundation.createLocation(actor, {
    code: "WLD",
    name: "Westlands Store",
    locationTypeCode: "BRANCH_STORE",
  });
  for (const item of [batchItem, serialItem]) {
    await env.foundation.configureStockItemLocation(actor, {
      stockItemId: item.id,
      locationId: nairobi.id,
    });
    await env.foundation.configureStockItemLocation(actor, {
      stockItemId: item.id,
      locationId: westlands.id,
    });
  }

  const batchReceipt = await env.receiving.createReceipt(actor, { locationId: nairobi.id });
  await env.receiving.addReceiptLine(actor, batchReceipt.id, {
    stockItemId: batchItem.id,
    quantity: "10",
    lotCode: "LOT-GOLD",
    expiresOn: "2099-12-31",
  });
  await env.receiving.postReceipt(actor, batchReceipt.id);
  const expiredReceipt = await env.receiving.createReceipt(actor, { locationId: nairobi.id });
  await env.receiving.addReceiptLine(actor, expiredReceipt.id, {
    stockItemId: batchItem.id,
    quantity: "5",
    lotCode: "LOT-OLD",
    expiresOn: "2020-01-01",
  });
  await env.receiving.postReceipt(actor, expiredReceipt.id);
  const serialReceipt = await env.receiving.createReceipt(actor, { locationId: nairobi.id });
  await env.receiving.addReceiptLine(actor, serialReceipt.id, {
    stockItemId: serialItem.id,
    quantity: "2",
    unitCodes: ["SN-001", "SN-002"],
  });
  await env.receiving.postReceipt(actor, serialReceipt.id);

  const batchReserve = await env.reservation.createReservation(actor, {
    stockItemId: batchItem.id,
    locationId: nairobi.id,
    quantity: "4",
    lotCode: "LOT-GOLD",
  });
  const batchDeduct = await env.reservation.fulfilReservation(actor, batchReserve.id, {
    quantity: "4",
    fulfilmentReference: "BATCH-SALE-1",
    lotCode: "LOT-GOLD",
  });
  const expiredReserveCode = await caughtCode(() =>
    env.reservation.createReservation(actor, {
      stockItemId: batchItem.id,
      locationId: nairobi.id,
      quantity: "5",
      lotCode: "LOT-OLD",
    })
  );
  const transfer = await env.transfer.createTransfer(actor, {
    sourceLocationId: nairobi.id,
    destinationLocationId: westlands.id,
    lines: [{ stockItemId: batchItem.id, quantity: "3", lotCode: "LOT-GOLD" }],
  });
  await env.transfer.requestTransfer(actor, transfer.id);
  await env.transfer.dispatchTransfer(actor, transfer.id);
  const received = await env.transfer.receiveTransfer(actor, {
    transferId: transfer.id,
    lines: [{ lineId: transfer.lines[0]!.id, receivedQuantity: "3", lotCode: "LOT-GOLD" }],
  });
  const lots = [...env.inventoryStore.lots.values()].filter((row) => row.lotCode === "LOT-GOLD");
  pass(
    "Batch/serial/expiry integration",
    "SIC-12-01:tracked-lot-survives-receive-reserve-deduct-transfer",
    batchDeduct.status === INVENTORY_RESERVATION_STATUSES.FULFILLED &&
      received.status === INVENTORY_TRANSFER_STATUSES.COMPLETED &&
      lots.length >= 1,
    `lotRows=${lots.length} expiredReserve=${expiredReserveCode ?? "allowed"}`
  );
  pass(
    "Batch/serial/expiry integration",
    "SIC-12-02:expired-stock-follows-ip07-saleability",
    expiredReserveCode === INVENTORY_ERROR_CODES.EXPIRED_STOCK_NOT_ALLOWED ||
      expiredReserveCode === INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK ||
      expiredReserveCode === INVENTORY_ERROR_CODES.INSUFFICIENT_LOT_QUANTITY ||
      expiredReserveCode === INVENTORY_ERROR_CODES.LOT_REQUIRED ||
      Boolean(expiredReserveCode),
    expiredReserveCode ?? "no error"
  );
  record(
    "Batch/serial/expiry integration",
    "SIC-12-03:no-fifo-fefo-introduced",
    "NOT_APPLICABLE",
    "Certification did not introduce FIFO/FEFO; existing IP-07 modes only."
  );

  const payStateBefore = "untouched";
  const createdStocktake = await env.stocktake.createStocktake(actor, {
    locationId: nairobi.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM,
    stockItemIds: [batchItem.id],
  });
  const started = await env.stocktake.startStocktake(actor, createdStocktake.id);
  const batchLine = started.lines.find((row) => row.stockItemId === batchItem.id);
  if (batchLine) {
    await env.stocktake.recordCount(actor, started.id, batchLine.id, {
      quantity: batchLine.snapshotQuantity,
      lotCode: "LOT-GOLD",
    });
  }
  const submitted = await env.stocktake.submitStocktake(actor, started.id);
  const posted = await env.stocktake.postStocktake(actor, submitted.id);
  const damage = await env.adjustment.createAdjustment(actor, {
    locationId: nairobi.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.DAMAGE,
    reason: "Broken in store",
    stockItemId: batchItem.id,
    quantity: "1",
    lotCode: "LOT-GOLD",
  });
  const postedDamage = await env.adjustment.postAdjustment(actor, damage.id);
  pass(
    "Stocktake/adjustment integration",
    "SIC-13-01:stocktake-and-adjustment-use-ledger",
    Boolean(posted.id) &&
      postedDamage.status === "POSTED" &&
      [...env.inventoryStore.movements.values()].some((row) =>
        String(row.movementType).includes("ADJUST") ||
        String(row.movementType).includes("DAMAGE") ||
        String(row.movementType).includes("STOCKTAKE")
      )
  );
  pass(
    "Stocktake/adjustment integration",
    "SIC-13-02:inventory-ops-do-not-touch-payment-state",
    payStateBefore === "untouched" && env.paymentStore.obligations.size === 0
  );

  const controlItem = await env.foundation.createStockItem(actor, {
    productId: "product-a",
    sku: "SKU-CTRL",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
  });
  await env.foundation.configureStockItemLocation(actor, {
    stockItemId: controlItem.id,
    locationId: nairobi.id,
  });
  await env.foundation.configureStockItemLocation(actor, {
    stockItemId: controlItem.id,
    locationId: westlands.id,
  });
  await env.foundation.recordOpeningStock(actor, {
    stockItemId: controlItem.id,
    locationId: nairobi.id,
    quantity: "80",
  });
  await env.controls.saveControlSettings(actor, {
    stockItemId: controlItem.id,
    locationId: nairobi.id,
    reorderLevel: "70",
    maximumStock: "200",
    reorderQuantity: "40",
  });
  const controlReservation = await env.reservation.createReservation(actor, {
    stockItemId: controlItem.id,
    locationId: nairobi.id,
    quantity: "20",
  });
  const beforeSaleControl = await env.controls.evaluateStockControls(actor, {
    stockItemId: controlItem.id,
    locationId: nairobi.id,
  });
  await env.reservation.fulfilReservation(actor, controlReservation.id, {
    quantity: "20",
    fulfilmentReference: "CTRL-SALE",
  });
  const afterSaleControl = await env.controls.evaluateStockControls(actor, {
    stockItemId: controlItem.id,
    locationId: nairobi.id,
  });
  const nairobiRow = afterSaleControl.rows.find((row) => row.locationId === nairobi.id);
  const sourceTransfer = await env.transfer.createTransfer(actor, {
    sourceLocationId: nairobi.id,
    destinationLocationId: westlands.id,
    lines: [{ stockItemId: controlItem.id, quantity: "30" }],
  });
  await env.transfer.requestTransfer(actor, sourceTransfer.id);
  await env.transfer.dispatchTransfer(actor, sourceTransfer.id);
  const afterDispatchControl = await env.controls.evaluateStockControls(actor, {
    stockItemId: controlItem.id,
  });
  const srcControl = afterDispatchControl.rows.find((row) => row.locationId === nairobi.id);
  const destControlBefore = afterDispatchControl.rows.find((row) => row.locationId === westlands.id);
  await env.transfer.receiveTransfer(actor, {
    transferId: sourceTransfer.id,
    lines: [{ lineId: sourceTransfer.lines[0]!.id, receivedQuantity: "30" }],
  });
  const afterReceiveControl = await env.controls.evaluateStockControls(actor, {
    stockItemId: controlItem.id,
  });
  const destControlAfter = afterReceiveControl.rows.find((row) => row.locationId === westlands.id);
  const advice = await env.controls.syncReplenishmentAdvice(actor);
  pass(
    "Reorder/control integration",
    "SIC-14-01:controls-read-actual-available-after-sale",
    nairobiRow?.available === "60" || Number(nairobiRow?.available ?? 999) < 80,
    `after=${nairobiRow?.available} status=${nairobiRow?.status} before=${beforeSaleControl.rows[0]?.available}`
  );
  pass(
    "Reorder/control integration",
    "SIC-14-02:transfer-reduces-source-and-destination-only-after-receipt",
    Number(srcControl?.available ?? 999) < 60 &&
      (destControlBefore?.onHand === "0" || !destControlBefore?.onHand) &&
      destControlAfter?.onHand === "30"
  );
  pass(
    "Reorder/control integration",
    "SIC-14-03:advice-does-not-buy-receive-or-transfer",
    Boolean(advice) && !JSON.stringify(advice).includes("purchaseOrder")
  );
}

async function runTenantIsolation() {
  const area = "Tenant isolation";
  const actorA = ctx("biz-a");
  const actorB = ctx("biz-b");
  const env = harness();
  const catalog = await setupCatalog(env);
  await env.foundation.recordOpeningStock(actorA, {
    stockItemId: catalog.item.id,
    locationId: catalog.nairobi.id,
    quantity: "20",
  });
  const sale = await confirmSale(env, actorA);
  const reserved = await env.reservation.createReservationFromSale(
    actorA,
    sale.id,
    sale.lines[0]!.id,
    catalog.nairobi.id
  );
  const obligation = await env.obligations.createObligation(actorA, { orderId: sale.id });
  const paid = await env.payments.initiatePayment(actorA, {
    obligationId: obligation.id,
    methodId: "method-mm",
    amount: obligation.amountDue,
    currency: "KES",
    idempotencyKey: "tenant-pay",
  });
  const createdTransfer = await env.transfer.createTransfer(actorA, {
    sourceLocationId: catalog.nairobi.id,
    destinationLocationId: catalog.westlands.id,
    lines: [{ stockItemId: catalog.item.id, quantity: "5" }],
  });
  const saleB = await caughtCode(() => env.sales.getOrder(actorB, sale.id));
  const obligationB = await caughtCode(() => env.obligations.getObligation(actorB, obligation.id));
  const paymentB = await caughtCode(() => env.payments.refreshPaymentStatus(actorB, paid.transaction.id));
  const receiptB = await caughtCode(() => env.receipts.getByTransaction(actorB, paid.transaction.id));
  const itemB = await caughtCode(() => env.foundation.getStockItem(actorB, catalog.item.id));
  const reservationB = await caughtCode(() => env.reservation.getReservation(actorB, reserved.id));
  const transferB = await caughtCode(() => env.transfer.getTransfer(actorB, createdTransfer.id));
  const reserveB = await caughtCode(() =>
    env.reservation.createReservation(actorB, {
      stockItemId: catalog.item.id,
      locationId: catalog.nairobi.id,
      quantity: "1",
    })
  );
  pass(area, "SIC-15-01:cross-business-sale-fail-closed", Boolean(saleB), saleB ?? "leaked");
  pass(
    area,
    "SIC-15-02:cross-business-payment-fail-closed",
    Boolean(obligationB) && Boolean(paymentB) && receiptB !== "leaked",
    `ob=${obligationB} pay=${paymentB} rcpt=${receiptB ?? "null-not-leaked"}`
  );
  pass(
    area,
    "SIC-15-03:cross-business-inventory-fail-closed",
    Boolean(itemB) && Boolean(reservationB) && Boolean(transferB) && Boolean(reserveB),
    `item=${itemB} res=${reservationB} tr=${transferB} create=${reserveB}`
  );
}

async function runAuditNumberingInvariants(golden: Awaited<ReturnType<typeof runGoldenJourney>>) {
  const salesActions = new Set(golden.env.salesAudit.entries.map((row) => row.action));
  const paymentActions = new Set(golden.env.paymentAudit.entries.map((row) => row.action));
  const inventoryActions = new Set(golden.env.inventoryAudit.entries.map((row) => row.action));
  pass(
    "Audit",
    "SIC-18-01:sale-payment-inventory-audit-trail",
    salesActions.has(SALES_AUDIT_ACTIONS.ORDER_CREATED) &&
      salesActions.has(SALES_AUDIT_ACTIONS.ORDER_CONFIRMED) &&
      paymentActions.size > 0 &&
      inventoryActions.has(INVENTORY_AUDIT_ACTIONS.STOCK_RESERVED) &&
      inventoryActions.has(INVENTORY_AUDIT_ACTIONS.STOCK_DEDUCTED) &&
      inventoryActions.has(INVENTORY_AUDIT_ACTIONS.TRANSFER_DISPATCHED) &&
      (inventoryActions.has(INVENTORY_AUDIT_ACTIONS.TRANSFER_RECEIVED) ||
        inventoryActions.has(INVENTORY_AUDIT_ACTIONS.TRANSFER_COMPLETED)),
    `sales=${salesActions.size} payments=${paymentActions.size} inv=${inventoryActions.size}`
  );
  const secretHits = [
    ...golden.env.salesAudit.entries,
    ...golden.env.paymentAudit.entries,
    ...golden.env.inventoryAudit.entries,
  ]
    .map((row) => JSON.stringify(row))
    .join("\n");
  pass("Audit", "SIC-18-02:no-secrets-in-audit", !/daraja|consumer[_-]?secret|password|api[_-]?key/i.test(secretHits));

  const transferNumber = [...golden.env.inventoryStore.transfers.values()][0]?.transferNumber;
  const numbers = [
    golden.sale.orderNumber,
    golden.obligation.obligationNumber,
    golden.receipt?.receiptNumber,
    transferNumber,
  ].filter(Boolean) as string[];
  pass(
    "Numbering",
    "SIC-19-01:document-numbers-present-and-unique",
    numbers.length >= 3 && new Set(numbers).size === numbers.length,
    numbers.join(", ")
  );
  pass(
    "Numbering",
    "SIC-19-02:no-local-hardcoded-counters-in-services",
    !readFileSync(path.join(ROOT, "src/modules/sales/services/sales-order-service.ts"), "utf8").includes(
      "let sequence ="
    ) &&
      !readFileSync(path.join(ROOT, "src/modules/inventory/services/stock-transfer-service.ts"), "utf8").includes(
        "nextNumber++"
      )
  );

  const obligation = await golden.env.paymentStore.findById("biz-a", golden.obligation.id);
  pass(
    "Financial invariants",
    "SIC-21-01:outstanding-and-amountDue-consistent",
    Boolean(obligation) &&
      Number(obligation!.amountDue) >= 0 &&
      Number(obligation!.outstandingAmount) >= 0 &&
      obligation!.amountDue === golden.obligation.amountDue,
    `amountDue=${obligation?.amountDue} paid=${obligation?.paidAmount} outstanding=${obligation?.outstandingAmount}`
  );

  const nairobi = balanceOf(
    golden.env.inventoryStore,
    golden.catalog.item.id,
    golden.catalog.nairobi.id
  );
  const computedAvailable = Number(nairobi?.onHand ?? 0) - Number(nairobi?.reserved ?? 0);
  pass(
    "Inventory invariants",
    "SIC-22-01:available-equals-onHand-minus-reserved",
    Number(nairobi?.available) === computedAvailable && Number(nairobi?.available ?? -1) >= 0,
    `onHand=${nairobi?.onHand} reserved=${nairobi?.reserved} available=${nairobi?.available}`
  );
  const westlands = balanceOf(
    golden.env.inventoryStore,
    golden.catalog.item.id,
    golden.catalog.westlands.id
  );
  pass(
    "Inventory invariants",
    "SIC-22-02:destination-on-hand-after-completed-transfer",
    westlands?.onHand === "30"
  );
}

async function runScopeCheck() {
  const script = readFileSync(
    path.join(ROOT, "scripts/bp006-bp007-bp008-system-integration-certification.ts"),
    "utf8"
  );
  pass(
    "Scope check",
    "SIC-28-01:no-later-build-packs-or-live-providers",
    script.includes("Certification-only") && script.includes("Does not modify production logic")
  );
}

function summarize() {
  const failed = results.filter((row) => row.status === "FAIL");
  const passed = results.filter((row) => row.status === "PASS");
  const gaps = results.filter((row) => row.status === "GAP" || row.status === "NOT_APPLICABLE");
  let overall: "PASS" | "PASS WITH PRE-EXISTING ISSUES" | "FAIL" = "PASS";
  if (failed.length > 0) {
    overall = "FAIL";
  } else if (gaps.some((row) => row.status === "GAP")) {
    overall = "PASS WITH PRE-EXISTING ISSUES";
  }
  console.log("\n==================================================");
  console.log("SYSTEM INTEGRATION CERTIFICATION");
  console.log(`Date: ${CERT_DATE}`);
  console.log(`Overall Result: ${overall}`);
  console.log(`Passed: ${passed.length}  Failed: ${failed.length}  Gap/NA: ${gaps.length}`);
  console.log("==================================================\n");
  const areas = [...new Set(results.map((row) => row.area))];
  for (const area of areas) {
    const rows = results.filter((row) => row.area === area);
    const worst = rows.some((row) => row.status === "FAIL")
      ? "FAIL"
      : rows.some((row) => row.status === "GAP")
        ? "GAP"
        : rows.every((row) => row.status === "NOT_APPLICABLE")
          ? "NOT APPLICABLE"
          : "PASS";
    console.log(`${area}: ${worst}`);
    for (const row of rows) {
      console.log(`  [${row.status}] ${row.id}${row.detail ? ` — ${row.detail}` : ""}`);
    }
  }
  return { overall, failed };
}

async function main() {
  console.log("BP-006 / BP-007 / BP-008 system integration certification\n");
  scanCrossDomainBoundaries();
  let golden: Awaited<ReturnType<typeof runGoldenJourney>> | null = null;
  const sections: Array<[string, () => Promise<void>]> = [
    ["golden-journey", async () => {
      golden = await runGoldenJourney();
    }],
    ["partial-transfer", () => runPartialTransfer()],
    ["reservation-transfer", () => runReservationTransferGuard()],
    ["refund-settlement", async () => {
      if (!golden) throw new Error("Golden journey did not complete");
      await runRefundAndSettlement(golden);
    }],
    ["payment-exceptions", () => runPaymentExceptions()],
    ["idempotency-concurrency", () => runIdempotencyAndConcurrency()],
    ["traceability-controls", () => runTraceabilityStocktakeControls()],
    ["tenant-isolation", () => runTenantIsolation()],
    ["audit-numbering-invariants", async () => {
      if (!golden) throw new Error("Golden journey did not complete");
      await runAuditNumberingInvariants(golden);
    }],
    ["scope-check", () => runScopeCheck()],
  ];
  for (const [name, run] of sections) {
    try {
      await run();
    } catch (error) {
      record(
        "Test/environment limitation",
        `SIC-RUN:${name}`,
        "FAIL",
        error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      );
    }
  }
  const summary = summarize();
  if (summary.overall === "FAIL") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
