/**
 * Purpose:
 * Smoke-validate BP-008 / IP-03 Stock Reservation & Sales Deduction.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip03-stock-reservation-sales-deduction-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { INVENTORY_MOVEMENT_TYPES } from "@/core/inventory-engine";
import { createInProcessWorkflowAdapter } from "@/core/workflow-engine";
import { createScriptedDocumentNumberingAdapter } from "@/core/localization-regulatory/services/document-numbering-service";
import {
  listSourceFiles,
  scanInventoryArchitecture,
} from "@/modules/inventory/architecture-scan";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  INVENTORY_RESERVATION_STATUSES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import type { InventorySalesFulfilmentPort } from "@/modules/inventory/ports";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { StockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import type {
  InventoryProductRef,
  InventorySalesFulfilmentContract,
} from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0072_bp008_ip003_stock_reservation_sales_deduction.sql",
  "src/db/schema/inventory-reservation.ts",
  "src/modules/inventory/services/stock-reservation-service.ts",
  "src/modules/inventory/services/inventory-reservation-posting.ts",
  "src/modules/inventory/adapters/sales-fulfilment-contract-adapter.ts",
  "src/app/(authenticated)/(app)/inventory/availability/page.tsx",
  "src/app/(authenticated)/(app)/inventory/reservations/page.tsx",
  "src/app/(authenticated)/(app)/inventory/reservations/new/page.tsx",
];

function ctx(businessId: string, userId = "maker-1"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function productFixture(overrides: Partial<InventoryProductRef> = {}): InventoryProductRef {
  return {
    id: "product-a",
    businessId: "biz-a",
    productCode: "PRD-A",
    productName: "Product A",
    productTypeCode: "PHYSICAL_PRODUCT",
    isActive: true,
    sellingPrice: "1500",
    taxCode: "VAT16",
    ...overrides,
  };
}

class FakeSalesFulfilmentPort implements InventorySalesFulfilmentPort {
  readonly contracts = new Map<string, InventorySalesFulfilmentContract>();

  seed(contract: InventorySalesFulfilmentContract) {
    this.contracts.set(`${contract.businessId}:${contract.orderId}`, contract);
  }

  async getByOrderId(context: CurrentBusinessContext, orderId: string) {
    return this.contracts.get(`${context.businessId}:${orderId}`) ?? null;
  }
}

function saleContract(
  overrides: Partial<InventorySalesFulfilmentContract> & {
    line?: Partial<InventorySalesFulfilmentContract["lines"][number]>;
  } = {}
): InventorySalesFulfilmentContract {
  const { line, ...rest } = overrides;
  return {
    orderId: "so-1",
    orderNumber: "SO-000001",
    businessId: "biz-a",
    operationalStatus: "CONFIRMED",
    lines: [
      {
        orderLineId: "line-1",
        offeringId: "product-a",
        orderedQuantity: "10",
        outstandingQuantity: "10",
        acceptedQuantity: "10",
        lineType: "PHYSICAL",
        fulfilmentStatus: "OPEN",
        ...line,
      },
    ],
    ...rest,
  };
}

function harness(options?: {
  reservationApproval?: boolean;
  deductionApproval?: boolean;
  releaseApproval?: boolean;
  sales?: FakeSalesFulfilmentPort;
}) {
  const store = new InMemoryInventoryStore();
  store.seedProduct(productFixture());
  store.seedProduct(
    productFixture({
      id: "product-b",
      productCode: "PRD-B",
      productName: "Product B",
    })
  );
  store.seedProduct(
    productFixture({
      id: "product-c",
      productCode: "PRD-C",
      productName: "Product C",
    })
  );
  store.seedProduct(
    productFixture({
      id: "product-other",
      businessId: "biz-b",
      productCode: "PRD-X",
      productName: "Other",
    })
  );
  store.seedUnit({
    id: "uom-ea",
    businessId: "biz-a",
    code: "EA",
    name: "Each",
    symbol: "ea",
    status: "ACTIVE",
  });
  store.seedUnit({
    id: "uom-box",
    businessId: "biz-a",
    code: "BOX",
    name: "Box",
    symbol: "box",
    status: "ACTIVE",
  });
  store.seedUnit({
    id: "uom-b",
    businessId: "biz-b",
    code: "EA",
    name: "Each",
    symbol: "ea",
    status: "ACTIVE",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION,
    name: "Stock reservation",
    movementType: "RESERVATION",
    requiresApproval: options?.reservationApproval ?? false,
    overReceiptPolicy: "BLOCK",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_DEDUCTION,
    name: "Stock deduction",
    movementType: INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION,
    requiresApproval: options?.deductionApproval ?? false,
    overReceiptPolicy: "BLOCK",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE,
    name: "Reservation release",
    movementType: "RESERVATION",
    requiresApproval: options?.releaseApproval ?? false,
    overReceiptPolicy: "BLOCK",
  });
  const audit = new RecordingInventoryAudit();
  const sales = options?.sales ?? new FakeSalesFulfilmentPort();
  const foundation = new InventoryFoundationService({
    products: store.productPort,
    units: store.unitPort,
    catalogues: store.typePort,
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    movements: store.movementPort,
    balances: store.balancePort,
    audit,
  });
  const reservation = new StockReservationService({
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    movements: store.movementPort,
    balances: store.balancePort,
    reservations: store.reservationPort,
    fulfilments: store.fulfilmentPort,
    controls: store.controlPort,
    units: store.unitPort,
    numbering: createScriptedDocumentNumberingAdapter(),
    workflow: createInProcessWorkflowAdapter({
      requiresApprovalByOperation: {
        [INVENTORY_OPERATION_CODES.STOCK_RESERVATION]: options?.reservationApproval ?? false,
        [INVENTORY_OPERATION_CODES.STOCK_DEDUCTION]: options?.deductionApproval ?? false,
        [INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE]:
          options?.releaseApproval ?? false,
      },
    }),
    idempotency: store.idempotencyPort,
    locks: createInProcessInventoryLock(),
    audit,
    salesFulfilment: sales,
  });
  return { store, audit, foundation, reservation, sales };
}

async function setupStock(
  foundation: InventoryFoundationService,
  actor = ctx("biz-a"),
  options?: { opening?: string; salesUom?: boolean; missingConversion?: boolean }
) {
  const itemA = await foundation.createStockItem(actor, {
    productId: "product-a",
    sku: "SKU-A",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
    ...(options?.salesUom
      ? {
          salesUomId: "uom-box",
          conversionFactor: options.missingConversion ? null : "12",
        }
      : {}),
  });
  const itemB = await foundation.createStockItem(actor, {
    productId: "product-b",
    sku: "SKU-B",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
  });
  const location = await foundation.createLocation(actor, {
    code: "MAIN",
    name: "Main Warehouse",
    locationTypeCode: "MAIN_STORE",
  });
  await foundation.configureStockItemLocation(actor, {
    stockItemId: itemA.id,
    locationId: location.id,
  });
  await foundation.configureStockItemLocation(actor, {
    stockItemId: itemB.id,
    locationId: location.id,
  });
  if (options?.opening !== "0") {
    await foundation.recordOpeningStock(actor, {
      stockItemId: itemA.id,
      locationId: location.id,
      quantity: options?.opening ?? "100",
    });
  }
  return { itemA, itemB, location };
}

async function caughtCode(work: () => Promise<unknown>): Promise<string | null> {
  try {
    await work();
    return null;
  } catch (error) {
    return error instanceof InventoryError ? error.code : String(error);
  }
}

function availabilityFor(
  rows: Awaited<ReturnType<StockReservationService["listAvailability"]>>,
  stockItemId: string,
  locationId: string
) {
  return rows.find((row) => row.stockItemId === stockItemId && row.locationId === locationId);
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkUxLanguage(): SmokeResult[] {
  const files = [
    "src/modules/inventory/components/inventory-workspace.tsx",
    "src/modules/inventory/components/inventory-availability-list.tsx",
    "src/modules/inventory/components/reservation-list.tsx",
    "src/modules/inventory/components/reservation-create-form.tsx",
    "src/modules/inventory/components/reservation-detail.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-03") &&
        !visible.includes("ENG-005") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok:
        visible.includes("Available") &&
        visible.includes("Reserved") &&
        visible.includes("On Hand") &&
        visible.includes("Partially fulfilled") &&
        visible.includes("Reservation released") &&
        visible.includes("Stock deducted"),
    },
  ];
}

function checkArchitecture(): SmokeResult[] {
  const inventoryRoot = path.join(ROOT, "src/modules/inventory");
  const engineRoot = path.join(ROOT, "src/core/inventory-engine");
  const files = [
    ...listSourceFiles(inventoryRoot),
    ...listSourceFiles(engineRoot),
  ].filter((file) => {
    const rel = file.replace(/\\/g, "/");
    return !rel.includes("/architecture-scan.ts");
  });
  const scan = scanInventoryArchitecture(files);
  const service = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/stock-reservation-service.ts"),
    "utf8"
  );
  const posting = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-reservation-posting.ts"),
    "utf8"
  );
  const adapter = readFileSync(
    path.join(ROOT, "src/modules/inventory/adapters/sales-fulfilment-contract-adapter.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0072_bp008_ip003_stock_reservation_sales_deduction.sql"),
    "utf8"
  );
  const inventorySource = files
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  return [
    {
      name: "tc-34:no-direct-bp006-database-writes",
      ok:
        !inventorySource.includes('from "@/db/schema/sales-order"') &&
        !inventorySource.includes("from '@/db/schema/sales-order'") &&
        !inventorySource.includes(".insert(salesOrder") &&
        adapter.includes("toFulfilmentHandoffContract") &&
        adapter.includes("getOrder"),
    },
    {
      name: "tc-35:no-ip04-ip09-implementation",
      ok:
        scan.futureIpHits.length === 0 &&
        !migration.includes("inventory_transfer") &&
        !migration.includes("inventory_adjustment") &&
        !migration.includes("inventory_stocktake") &&
        !service.includes("transferStock(") &&
        !service.includes("adjustStock(") &&
        !service.includes("returnStock("),
      detail: scan.futureIpHits.join(", "),
    },
    {
      name: "tc-36:no-duplicate-ledger-engine",
      ok:
        posting.includes("params.movements.insert") &&
        posting.includes("applySaleDeduction") &&
        posting.indexOf("params.movements.insert") < posting.indexOf("applySaleDeduction") &&
        !service.includes("applyInboundOnHand") &&
        migration.includes("inventory_reservation") &&
        migration.includes("inventory_fulfilment"),
    },
    {
      name: "tc-37:no-payment-status-shortcut",
      ok:
        !service.includes("payment.status") &&
        !adapter.includes("payment.status") &&
        !service.includes("SUCCESSFUL") &&
        !adapter.includes("SUCCESSFUL") &&
        scan.paymentHits.length === 0,
      detail: scan.paymentHits.join(", "),
    },
    {
      name: "tc-38:no-hard-coded-uom-conversion",
      ok:
        service.includes("resolveInboundBaseQuantity") &&
        scan.uomRoutingHits.length === 0,
      detail: scan.uomRoutingHits.join(", "),
    },
    {
      name: "tc-39:no-hard-coded-maker-checker",
      ok:
        service.includes("evaluateOperationApproval") &&
        !service.includes("requiresApproval: true") &&
        !service.includes("requiresApproval:true"),
    },
    {
      name: "arch:createReservation-not-reserveStock",
      ok: service.includes("createReservation") && !service.includes("reserveStock("),
    },
    {
      name: "arch:fulfilReservation-not-deductSale",
      ok: service.includes("fulfilReservation") && !service.includes("deductSale("),
    },
    {
      name: "arch:in-process-lock",
      ok: service.includes("createInProcessInventoryLock") || service.includes("locks.runExclusive"),
    },
    {
      name: "arch:no-client-authoritative-businessId",
      ok: scan.clientBusinessIdHits.length === 0,
      detail: scan.clientBusinessIdHits.join(", "),
    },
    {
      name: "arch:no-gl",
      ok: scan.glHits.length === 0,
      detail: scan.glHits.join(", "),
    },
  ];
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const maker = ctx("biz-a");
  const { store, audit, foundation, reservation } = harness();
  const stock = await setupStock(foundation);

  const before = availabilityFor(
    await reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-01:on-hand-calculation",
    ok: before?.onHand === "100",
    detail: before?.onHand,
  });
  results.push({
    name: "tc-02:reserved-calculation",
    ok: before?.reserved === "0",
    detail: before?.reserved,
  });
  results.push({
    name: "tc-03:available-equals-on-hand-minus-reserved",
    ok: before?.available === "100" && before?.availabilityLabel === "Available",
    detail: before?.available,
  });

  const reserved = await reservation.createReservation(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    quantity: "30",
  });
  const afterReserve = availabilityFor(
    await reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-04:successful-reservation",
    ok:
      reserved.status === INVENTORY_RESERVATION_STATUSES.RESERVED &&
      reserved.reservedQuantity === "30" &&
      afterReserve?.onHand === "100" &&
      afterReserve?.reserved === "30" &&
      afterReserve?.available === "70",
    detail: `${reserved.status} reserved=${afterReserve?.reserved} available=${afterReserve?.available}`,
  });

  const insufficient = await caughtCode(() =>
    reservation.createReservation(maker, {
      stockItemId: stock.itemA.id,
      locationId: stock.location.id,
      quantity: "80",
    })
  );
  results.push({
    name: "tc-05:insufficient-stock",
    ok: insufficient === INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK,
    detail: insufficient ?? undefined,
  });

  const second = await reservation.createReservation(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    quantity: "20",
    salesOrderId: "so-dup",
    salesOrderLineId: "line-dup",
    idempotencyKey: "CREATE_RESERVATION:line-dup",
  });
  const afterSecond = availabilityFor(
    await reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-06:multiple-reservations",
    ok:
      second.id !== reserved.id &&
      afterSecond?.reserved === "50" &&
      afterSecond?.available === "50" &&
      afterSecond?.onHand === "100",
    detail: `reserved=${afterSecond?.reserved}`,
  });

  const again = await reservation.createReservation(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    quantity: "20",
    salesOrderId: "so-dup",
    salesOrderLineId: "line-dup",
    idempotencyKey: "CREATE_RESERVATION:line-dup",
  });
  results.push({
    name: "tc-07:reservation-idempotency",
    ok: again.id === second.id && afterSecond?.reserved === "50",
    detail: again.id,
  });

  const duplicate = await caughtCode(() =>
    reservation.createReservation(maker, {
      stockItemId: stock.itemA.id,
      locationId: stock.location.id,
      quantity: "5",
      salesOrderLineId: "line-dup",
      idempotencyKey: "CREATE_RESERVATION:other-key",
    })
  );
  results.push({
    name: "tc-08:duplicate-reservation-blocked",
    ok: duplicate === INVENTORY_ERROR_CODES.DUPLICATE_RESERVATION,
    detail: duplicate ?? undefined,
  });

  const released = await reservation.releaseReservation(maker, second.id);
  const afterRelease = availabilityFor(
    await reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-09:reservation-release",
    ok:
      released.status === INVENTORY_RESERVATION_STATUSES.RELEASED &&
      afterRelease?.onHand === "100" &&
      afterRelease?.reserved === "30" &&
      afterRelease?.available === "70",
    detail: `${released.status} reserved=${afterRelease?.reserved}`,
  });

  const deducted = await reservation.fulfilReservation(maker, reserved.id, {
    quantity: "20",
    fulfilmentReference: "FUL-000001",
  });
  const afterDeduct = availabilityFor(
    await reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );
  const movements = await store.movementPort.listByStockItem(maker.businessId, stock.itemA.id);
  const saleMovements = movements.filter(
    (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION
  );
  results.push({
    name: "tc-13:successful-deduction",
    ok:
      deducted.fulfilledQuantity === "20" &&
      deducted.status === INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED,
    detail: deducted.status,
  });
  results.push({
    name: "tc-14:reservation-reduced-after-deduction",
    ok: deducted.reservedQuantity === "10" && deducted.remainingQuantity === "10",
    detail: `reserved=${deducted.reservedQuantity} remaining=${deducted.remainingQuantity}`,
  });
  results.push({
    name: "tc-15:on-hand-reduced-through-ledger",
    ok:
      afterDeduct?.onHand === "80" &&
      saleMovements.length === 1 &&
      saleMovements[0]?.quantity === "20" &&
      deducted.fulfilments[0]?.movementId === saleMovements[0]?.id,
    detail: `onHand=${afterDeduct?.onHand} movements=${saleMovements.length}`,
  });

  const secondFulfil = await reservation.fulfilReservation(maker, reserved.id, {
    quantity: "5",
    fulfilmentReference: "FUL-000002",
  });
  results.push({
    name: "tc-16:partial-fulfilment",
    ok:
      secondFulfil.status === INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED &&
      secondFulfil.fulfilledQuantity === "25" &&
      secondFulfil.remainingQuantity === "5",
    detail: secondFulfil.status,
  });

  const full = await reservation.fulfilReservation(maker, reserved.id, {
    quantity: "5",
    fulfilmentReference: "FUL-000003",
  });
  results.push({
    name: "tc-17:full-fulfilment",
    ok:
      full.status === INVENTORY_RESERVATION_STATUSES.FULFILLED &&
      full.remainingQuantity === "0" &&
      full.fulfilledQuantity === "30",
    detail: full.status,
  });

  const leftover = await reservation.createReservation(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    quantity: "10",
  });
  const over = await caughtCode(() =>
    reservation.fulfilReservation(maker, leftover.id, {
      quantity: "11",
      fulfilmentReference: "FUL-OVER",
    })
  );
  results.push({
    name: "tc-18:over-deduction-blocked",
    ok: over === INVENTORY_ERROR_CODES.DEDUCTION_EXCEEDS_RESERVATION,
    detail: over ?? undefined,
  });

  const duplicateFulfil = await reservation.fulfilReservation(maker, leftover.id, {
    quantity: "4",
    fulfilmentReference: "FUL-DUP",
  });
  const duplicateFulfilAgain = await reservation.fulfilReservation(maker, leftover.id, {
    quantity: "4",
    fulfilmentReference: "FUL-DUP",
  });
  const afterDup = availabilityFor(
    await reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-22:duplicate-fulfilment-cannot-deduct-twice",
    ok:
      duplicateFulfilAgain.id === duplicateFulfil.id &&
      duplicateFulfilAgain.fulfilledQuantity === "4" &&
      duplicateFulfilAgain.fulfilments.length === 1,
    detail: `fulfilled=${duplicateFulfilAgain.fulfilledQuantity} onHand=${afterDup?.onHand}`,
  });

  results.push({
    name: "tc-31:reservation-audited",
    ok: audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.STOCK_RESERVED),
  });
  results.push({
    name: "tc-32:deduction-audited",
    ok: audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.STOCK_DEDUCTED),
  });
  results.push({
    name: "tc-33:release-audited",
    ok: audit.entries.some(
      (row) => row.action === INVENTORY_AUDIT_ACTIONS.STOCK_RESERVATION_RELEASED
    ),
  });

  results.push(...(await runUomCases()));
  results.push(...(await runSalesCases()));
  results.push(...(await runConcurrencyCases()));
  results.push(...(await runApprovalCases()));
  results.push(...(await runTenantCases()));
  return results;
}

async function runUomCases(): Promise<SmokeResult[]> {
  const maker = ctx("biz-a");
  const base = harness();
  const baseStock = await setupStock(base.foundation, maker, { opening: "60" });
  const baseReservation = await base.reservation.createReservation(maker, {
    stockItemId: baseStock.itemA.id,
    locationId: baseStock.location.id,
    quantity: "12",
    uomId: "uom-ea",
  });

  const converted = harness();
  const convertedStock = await setupStock(converted.foundation, maker, {
    opening: "120",
    salesUom: true,
  });
  const boxReservation = await converted.reservation.createReservation(maker, {
    stockItemId: convertedStock.itemA.id,
    locationId: convertedStock.location.id,
    quantity: "5",
  });

  const missing = harness();
  const missingStock = await setupStock(missing.foundation, maker, {
    opening: "120",
    salesUom: true,
    missingConversion: true,
  });
  const missingCode = await caughtCode(() =>
    missing.reservation.createReservation(maker, {
      stockItemId: missingStock.itemA.id,
      locationId: missingStock.location.id,
      quantity: "1",
    })
  );

  return [
    {
      name: "tc-10:base-uom-reservation",
      ok:
        baseReservation.baseQuantity === "12" &&
        baseReservation.conversionFactor === "1" &&
        baseReservation.reservedQuantity === "12",
      detail: baseReservation.baseQuantity,
    },
    {
      name: "tc-11:sales-uom-conversion",
      ok:
        boxReservation.requestedQuantity === "5" &&
        boxReservation.baseQuantity === "60" &&
        boxReservation.conversionFactor === "12" &&
        boxReservation.reservedQuantity === "60",
      detail: `requested=${boxReservation.requestedQuantity} base=${boxReservation.baseQuantity}`,
    },
    {
      name: "tc-12:invalid-missing-conversion",
      ok:
        missingCode === INVENTORY_ERROR_CODES.CONVERSION_REQUIRED ||
        missingCode === INVENTORY_ERROR_CODES.INVALID_CONVERSION_FACTOR,
      detail: missingCode ?? undefined,
    },
  ];
}

async function runSalesCases(): Promise<SmokeResult[]> {
  const maker = ctx("biz-a");
  const sales = new FakeSalesFulfilmentPort();
  sales.seed(saleContract());
  const env = harness({ sales });
  const stock = await setupStock(env.foundation);
  const created = await env.reservation.createReservationFromSale(
    maker,
    "so-1",
    "line-1",
    stock.location.id
  );
  const fulfilled = await env.reservation.fulfilReservationFromSale(
    maker,
    "so-1",
    "line-1",
    "FUL-SALE-1",
    "10"
  );
  const after = availabilityFor(
    await env.reservation.listAvailability(maker),
    stock.itemA.id,
    stock.location.id
  );

  const draftSales = new FakeSalesFulfilmentPort();
  draftSales.seed(saleContract({ operationalStatus: "DRAFT" }));
  const draftEnv = harness({ sales: draftSales });
  const draftStock = await setupStock(draftEnv.foundation);
  const draftCreate = await caughtCode(() =>
    draftEnv.reservation.createReservationFromSale(
      maker,
      "so-1",
      "line-1",
      draftStock.location.id
    )
  );
  await draftEnv.reservation.createReservation(maker, {
    stockItemId: draftStock.itemA.id,
    locationId: draftStock.location.id,
    quantity: "8",
    salesOrderId: "so-1",
    salesOrderLineId: "line-1",
  });
  const draftDeduct = await caughtCode(() =>
    draftEnv.reservation.fulfilReservationFromSale(
      maker,
      "so-1",
      "line-1",
      "FUL-DRAFT",
      "8"
    )
  );
  const draftAfter = availabilityFor(
    await draftEnv.reservation.listAvailability(maker),
    draftStock.itemA.id,
    draftStock.location.id
  );

  const cancelSales = new FakeSalesFulfilmentPort();
  cancelSales.seed(saleContract());
  const cancelEnv = harness({ sales: cancelSales });
  const cancelStock = await setupStock(cancelEnv.foundation);
  await cancelEnv.reservation.createReservationFromSale(
    maker,
    "so-1",
    "line-1",
    cancelStock.location.id,
    "15"
  );
  cancelSales.seed(saleContract({ operationalStatus: "CANCELLED" }));
  const released = await cancelEnv.reservation.releaseReservationsForCancelledSale(maker, "so-1");
  const cancelAfter = availabilityFor(
    await cancelEnv.reservation.listAvailability(maker),
    cancelStock.itemA.id,
    cancelStock.location.id
  );

  return [
    {
      name: "tc-19:confirmed-sale-can-create-consume-reservation",
      ok:
        created.status === INVENTORY_RESERVATION_STATUSES.RESERVED &&
        created.salesOrderNumber === "SO-000001" &&
        fulfilled.status === INVENTORY_RESERVATION_STATUSES.FULFILLED &&
        after?.onHand === "90",
      detail: `${created.status} -> ${fulfilled.status} onHand=${after?.onHand}`,
    },
    {
      name: "tc-20:draft-sale-cannot-deduct",
      ok:
        draftCreate === INVENTORY_ERROR_CODES.SALE_NOT_FULFILLABLE &&
        draftDeduct === INVENTORY_ERROR_CODES.SALE_NOT_FULFILLABLE &&
        draftAfter?.onHand === "100" &&
        draftAfter?.reserved === "8",
      detail: `create=${draftCreate} deduct=${draftDeduct}`,
    },
    {
      name: "tc-21:cancelled-sale-releases-reservation",
      ok:
        released.length === 1 &&
        released[0]?.status === INVENTORY_RESERVATION_STATUSES.RELEASED &&
        cancelAfter?.onHand === "100" &&
        cancelAfter?.reserved === "0" &&
        cancelAfter?.available === "100",
      detail: `released=${released.length} reserved=${cancelAfter?.reserved}`,
    },
    {
      name: "tc-23:payment-status-not-used-as-inventory-shortcut",
      ok:
        created.salesOrderId === "so-1" &&
        !JSON.stringify(saleContract()).includes("paymentStatus") &&
        fulfilled.status === INVENTORY_RESERVATION_STATUSES.FULFILLED,
    },
  ];
}

async function runConcurrencyCases(): Promise<SmokeResult[]> {
  const maker = ctx("biz-a");
  const reserveEnv = harness();
  const reserveStock = await setupStock(reserveEnv.foundation, maker, { opening: "10" });
  const [firstReserve, secondReserve] = await Promise.allSettled([
    reserveEnv.reservation.createReservation(maker, {
      stockItemId: reserveStock.itemA.id,
      locationId: reserveStock.location.id,
      quantity: "7",
    }),
    reserveEnv.reservation.createReservation(maker, {
      stockItemId: reserveStock.itemA.id,
      locationId: reserveStock.location.id,
      quantity: "7",
    }),
  ]);
  const reserveOk = [firstReserve, secondReserve].filter((row) => row.status === "fulfilled");
  const reserveFail = [firstReserve, secondReserve].filter((row) => row.status === "rejected");
  const reserveAvail = availabilityFor(
    await reserveEnv.reservation.listAvailability(maker),
    reserveStock.itemA.id,
    reserveStock.location.id
  );
  const reserveFailCode =
    reserveFail[0]?.status === "rejected" && reserveFail[0].reason instanceof InventoryError
      ? reserveFail[0].reason.code
      : null;

  const deductEnv = harness();
  const deductStock = await setupStock(deductEnv.foundation, maker, { opening: "10" });
  const held = await deductEnv.reservation.createReservation(maker, {
    stockItemId: deductStock.itemA.id,
    locationId: deductStock.location.id,
    quantity: "10",
  });
  const [firstDeduct, secondDeduct] = await Promise.allSettled([
    deductEnv.reservation.fulfilReservation(maker, held.id, {
      quantity: "7",
      fulfilmentReference: "FUL-A",
    }),
    deductEnv.reservation.fulfilReservation(maker, held.id, {
      quantity: "7",
      fulfilmentReference: "FUL-B",
    }),
  ]);
  const deductOk = [firstDeduct, secondDeduct].filter((row) => row.status === "fulfilled");
  const deductFail = [firstDeduct, secondDeduct].filter((row) => row.status === "rejected");
  const deductAvail = availabilityFor(
    await deductEnv.reservation.listAvailability(maker),
    deductStock.itemA.id,
    deductStock.location.id
  );
  const deductFailCode =
    deductFail[0]?.status === "rejected" && deductFail[0].reason instanceof InventoryError
      ? deductFail[0].reason.code
      : null;

  return [
    {
      name: "tc-24:concurrent-reservations",
      ok:
        reserveOk.length === 1 &&
        reserveFail.length === 1 &&
        reserveFailCode === INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK &&
        reserveAvail?.onHand === "10" &&
        reserveAvail?.reserved === "7" &&
        reserveAvail?.available === "3",
      detail: `ok=${reserveOk.length} fail=${reserveFailCode} reserved=${reserveAvail?.reserved}`,
    },
    {
      name: "tc-25:concurrent-deduction",
      ok:
        deductOk.length === 1 &&
        deductFail.length === 1 &&
        deductFailCode === INVENTORY_ERROR_CODES.DEDUCTION_EXCEEDS_RESERVATION &&
        deductAvail?.onHand === "3" &&
        deductAvail?.reserved === "3",
      detail: `ok=${deductOk.length} fail=${deductFailCode} onHand=${deductAvail?.onHand}`,
    },
  ];
}

async function runApprovalCases(): Promise<SmokeResult[]> {
  const maker = ctx("biz-a");
  const checker = ctx("biz-a", "checker-1");
  const open = harness();
  const openStock = await setupStock(open.foundation);
  const executed = await open.reservation.createReservation(maker, {
    stockItemId: openStock.itemA.id,
    locationId: openStock.location.id,
    quantity: "6",
  });
  const fulfilled = await open.reservation.fulfilReservation(maker, executed.id, {
    quantity: "6",
    fulfilmentReference: "FUL-OPEN",
  });

  const gated = harness({ reservationApproval: true, deductionApproval: true });
  const gatedStock = await setupStock(gated.foundation);
  const requested = await gated.reservation.createReservation(maker, {
    stockItemId: gatedStock.itemA.id,
    locationId: gatedStock.location.id,
    quantity: "8",
  });
  const makerApprove = await caughtCode(() =>
    gated.reservation.approveReservation(maker, requested.id)
  );
  const makerDeduct = await caughtCode(() =>
    gated.reservation.fulfilReservation(maker, requested.id, {
      quantity: "8",
      fulfilmentReference: "FUL-MAKER",
    })
  );
  const gatedAvail = availabilityFor(
    await gated.reservation.listAvailability(maker),
    gatedStock.itemA.id,
    gatedStock.location.id
  );
  const approved = await gated.reservation.approveReservation(checker, requested.id);
  const checkerDeduct = await gated.reservation.fulfilReservation(checker, requested.id, {
    quantity: "8",
    fulfilmentReference: "FUL-CHECKER",
  });

  return [
    {
      name: "tc-26:approval-not-required-executes",
      ok:
        executed.status === INVENTORY_RESERVATION_STATUSES.RESERVED &&
        fulfilled.status === INVENTORY_RESERVATION_STATUSES.FULFILLED,
      detail: `${executed.status}/${fulfilled.status}`,
    },
    {
      name: "tc-27:approval-required-maker-cannot-approve",
      ok:
        requested.status === INVENTORY_RESERVATION_STATUSES.REQUESTED &&
        makerApprove === INVENTORY_ERROR_CODES.SELF_APPROVAL &&
        makerDeduct === INVENTORY_ERROR_CODES.SELF_APPROVAL &&
        gatedAvail?.reserved === "0" &&
        gatedAvail?.onHand === "100",
      detail: `approve=${makerApprove} deduct=${makerDeduct}`,
    },
    {
      name: "tc-28:checker-approval-executes",
      ok:
        approved.status === INVENTORY_RESERVATION_STATUSES.RESERVED &&
        checkerDeduct.status === INVENTORY_RESERVATION_STATUSES.FULFILLED &&
        checkerDeduct.fulfilledQuantity === "8",
      detail: `${approved.status}/${checkerDeduct.status}`,
    },
  ];
}

async function runTenantCases(): Promise<SmokeResult[]> {
  const makerA = ctx("biz-a");
  const makerB = ctx("biz-b");
  const env = harness();
  const stock = await setupStock(env.foundation);
  const row = await env.reservation.createReservation(makerA, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    quantity: "4",
  });
  const lookup = await caughtCode(() => env.reservation.getReservation(makerB, row.id));
  const deduct = await caughtCode(() =>
    env.reservation.fulfilReservation(makerB, row.id, {
      quantity: "4",
      fulfilmentReference: "FUL-X",
    })
  );
  return [
    {
      name: "tc-29:cross-business-reservation-lookup-fails",
      ok: lookup === INVENTORY_ERROR_CODES.RESERVATION_NOT_FOUND,
      detail: lookup ?? undefined,
    },
    {
      name: "tc-30:cross-business-deduction-fails",
      ok: deduct === INVENTORY_ERROR_CODES.RESERVATION_NOT_FOUND,
      detail: deduct ?? undefined,
    },
  ];
}

function runExternal(script: string, extraEnv?: Record<string, string>): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
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
    ...checkArchitecture(),
    ...(await runCoreCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP03_SKIP_REGRESSION !== "1") {
    regressionResults.push(
      runExternal("scripts/bp008-ip01-inventory-foundation-smoke-validation.ts", {
        IP01_SKIP_REGRESSION: "1",
      })
    );
    regressionResults.push(
      runExternal("scripts/bp008-ip02-stock-receiving-opening-balances-smoke-validation.ts", {
        IP02_SKIP_REGRESSION: "1",
        IP01_SKIP_REGRESSION: "1",
      })
    );
    if (
      existsSync(path.join(ROOT, "scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts"))
    ) {
      regressionResults.push(
        runExternal("scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts", {
          IP02_SKIP_REGRESSION: "1",
          IP03_SKIP_REGRESSION: "1",
        })
      );
    }
  }
  const results = [...coreResults, ...regressionResults];
  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    console.log(
      `[${item.ok ? "PASS" : "FAIL"}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`
    );
  }
  console.log(
    `\nCore: ${coreResults.filter((item) => item.ok).length}/${coreResults.length} passed. All checks: ${results.length - failed.length}/${results.length} passed.`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
