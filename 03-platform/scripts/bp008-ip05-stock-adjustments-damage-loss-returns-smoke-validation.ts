/**
 * Purpose:
 * Smoke-validate BP-008 / IP-05 Stock Adjustments, Damage, Loss & Returns.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip05-stock-adjustments-damage-loss-returns-smoke-validation.ts
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
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import type { InventorySalesFulfilmentPort } from "@/modules/inventory/ports";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { StockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import { StockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import type {
  InventoryProductRef,
  InventorySalesFulfilmentContract,
} from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0073_bp008_ip005_stock_adjustments_damage_loss_returns.sql",
  "src/db/schema/inventory-adjustment.ts",
  "src/modules/inventory/services/stock-adjustment-service.ts",
  "src/modules/inventory/services/inventory-adjustment-posting.ts",
  "src/modules/inventory/services/inventory-adjustment-rules.ts",
  "src/app/(authenticated)/(app)/inventory/adjustments/page.tsx",
  "src/app/(authenticated)/(app)/inventory/adjustments/new/page.tsx",
  "src/app/(authenticated)/(app)/inventory/adjustments/[adjustmentId]/page.tsx",
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
  adjustmentApproval?: boolean;
  customerReturnApproval?: boolean;
  supplierReturnApproval?: boolean;
  allowNegative?: boolean;
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
  const policy = options?.allowNegative ? "ALLOW" : "BLOCK";
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_ADJUSTMENT,
    name: "Stock adjustment",
    movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT,
    requiresApproval: options?.adjustmentApproval ?? false,
    overReceiptPolicy: policy,
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.CUSTOMER_RETURN,
    name: "Customer return",
    movementType: INVENTORY_MOVEMENT_TYPES.CUSTOMER_RETURN,
    requiresApproval: options?.customerReturnApproval ?? false,
    overReceiptPolicy: policy,
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.SUPPLIER_RETURN,
    name: "Supplier return",
    movementType: INVENTORY_MOVEMENT_TYPES.SUPPLIER_RETURN,
    requiresApproval: options?.supplierReturnApproval ?? false,
    overReceiptPolicy: policy,
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION,
    name: "Stock reservation",
    movementType: "RESERVATION",
    requiresApproval: false,
    overReceiptPolicy: "BLOCK",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_DEDUCTION,
    name: "Stock deduction",
    movementType: INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION,
    requiresApproval: false,
    overReceiptPolicy: "BLOCK",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE,
    name: "Reservation release",
    movementType: "RESERVATION",
    requiresApproval: false,
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
        [INVENTORY_OPERATION_CODES.STOCK_RESERVATION]: false,
        [INVENTORY_OPERATION_CODES.STOCK_DEDUCTION]: false,
        [INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE]: false,
      },
    }),
    idempotency: store.idempotencyPort,
    locks: createInProcessInventoryLock(),
    audit,
    salesFulfilment: sales,
  });
  const adjustment = new StockAdjustmentService({
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    movements: store.movementPort,
    balances: store.balancePort,
    adjustments: store.adjustmentPort,
    adjustmentLines: store.adjustmentLinePort,
    controls: store.controlPort,
    units: store.unitPort,
    numbering: createScriptedDocumentNumberingAdapter(),
    workflow: createInventoryControlWorkflowAdapter(store.controlPort),
    idempotency: store.idempotencyPort,
    locks: createInProcessInventoryLock(),
    audit,
  });
  return { store, audit, foundation, reservation, adjustment, sales };
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
  const location = await foundation.createLocation(actor, {
    code: "MAIN",
    name: "Main Warehouse",
    locationTypeCode: "MAIN_STORE",
  });
  await foundation.configureStockItemLocation(actor, {
    stockItemId: itemA.id,
    locationId: location.id,
  });
  if (options?.opening !== "0") {
    await foundation.recordOpeningStock(actor, {
      stockItemId: itemA.id,
      locationId: location.id,
      quantity: options?.opening ?? "100",
    });
  }
  return { itemA, location };
}

async function caughtCode(work: () => Promise<unknown>): Promise<string | null> {
  try {
    await work();
    return null;
  } catch (error) {
    return error instanceof InventoryError ? error.code : String(error);
  }
}

async function postType(
  adjustment: StockAdjustmentService,
  actor: CurrentBusinessContext,
  params: {
    stockItemId: string;
    locationId: string;
    adjustmentType: string;
    quantity: string;
    reason?: string;
    originId?: string | null;
    originType?: string | null;
    uomId?: string | null;
    externalReference?: string | null;
    idempotencyKey?: string | null;
  }
) {
  const created = await adjustment.createAdjustment(actor, {
    stockItemId: params.stockItemId,
    locationId: params.locationId,
    adjustmentType: params.adjustmentType,
    quantity: params.quantity,
    reason: params.reason ?? "Count correction",
    originId: params.originId,
    originType: params.originType,
    uomId: params.uomId,
    externalReference: params.externalReference,
    idempotencyKey: params.idempotencyKey,
  });
  return adjustment.postAdjustment(actor, created.id);
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
    "src/modules/inventory/components/adjustment-list.tsx",
    "src/modules/inventory/components/adjustment-create-form.tsx",
    "src/modules/inventory/components/adjustment-detail.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-05") &&
        !visible.includes("ENG-005") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok:
        visible.includes("Stock adjustment") &&
        visible.includes("Damaged") &&
        visible.includes("Lost") &&
        visible.includes("Customer return") &&
        visible.includes("Supplier return") &&
        visible.includes("Approved") &&
        visible.includes("Posted") &&
        visible.includes("Rejected"),
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
    path.join(ROOT, "src/modules/inventory/services/stock-adjustment-service.ts"),
    "utf8"
  );
  const posting = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-adjustment-posting.ts"),
    "utf8"
  );
  const reservation = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/stock-reservation-service.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0073_bp008_ip005_stock_adjustments_damage_loss_returns.sql"),
    "utf8"
  );
  const schemaFiles = listSourceFiles(path.join(ROOT, "src/db/schema")).join("\n");
  return [
    {
      name: "arch:reuses-inventory-ledger",
      ok:
        posting.includes("params.movements.insert") &&
        posting.includes("applyInboundOnHand") &&
        posting.includes("applyOutboundOnHand") &&
        posting.indexOf("params.movements.insert") < posting.indexOf("applyOutboundOnHand") &&
        !posting.includes(".onHand =") &&
        !service.includes("balances.update"),
    },
    {
      name: "arch:no-direct-balance-overwrite",
      ok: !service.includes("onHand:") || service.includes("onHandBefore"),
      detail: "service may mention on-hand snapshots, not overwrite",
    },
    {
      name: "arch:no-duplicate-uom-engine",
      ok:
        service.includes("resolveInboundBaseQuantity") &&
        scan.uomRoutingHits.length === 0,
      detail: scan.uomRoutingHits.join(", "),
    },
    {
      name: "arch:no-duplicate-approval-engine",
      ok:
        service.includes("evaluateOperationApproval") &&
        service.includes("assertDistinctActors") &&
        !service.includes("class AdjustmentApproval"),
    },
    {
      name: "arch:no-forbidden-method-names",
      ok:
        !service.includes("adjustStock(") &&
        !service.includes("returnStock(") &&
        !service.includes("transferStock(") &&
        scan.futureIpHits.length === 0,
      detail: scan.futureIpHits.join(", "),
    },
    {
      name: "arch:no-ip06-stocktake",
      ok:
        !migration.toLowerCase().includes("stocktake") &&
        !service.includes("createStocktake") &&
        !service.includes("inventory_stocktake"),
    },
    {
      name: "arch:no-ip07-batch-serial",
      ok:
        !schemaFiles.includes("inventory-batch") &&
        !schemaFiles.includes("inventory-serial") &&
        !migration.includes("serial_number") &&
        !migration.includes("batch_number"),
    },
    {
      name: "arch:no-ip08-reorder",
      ok:
        !schemaFiles.includes("inventory-reorder") &&
        !service.includes("createReorder") &&
        !migration.includes("inventory_reorder"),
    },
    {
      name: "arch:no-ip09-exception",
      ok:
        !schemaFiles.includes("inventory-exception") &&
        !service.includes("raiseInventoryException") &&
        !migration.includes("inventory_exception"),
    },
    {
      name: "arch:no-ip04-transfer-tables",
      ok: !migration.includes("inventory_transfer") && !service.includes("transferStock("),
    },
    {
      name: "arch:no-partial-reservation-cancel",
      ok:
        !service.includes("releaseReservation") &&
        reservation.includes("async releaseReservation(") &&
        !reservation.includes("releaseReservation(context, reservationId,") &&
        !reservation.includes("partialRelease"),
    },
    {
      name: "arch:no-payment-status-shortcut",
      ok: scan.paymentHits.length === 0 && !service.includes("payment.status"),
      detail: scan.paymentHits.join(", "),
    },
  ];
}

async function runAdjustmentCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const env = harness();
  const maker = ctx("biz-a");
  const stock = await setupStock(env.foundation);

  const positive = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT,
    quantity: "5",
    reason: "Found stock",
  });
  const afterPositive = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const movementsAfterPositive = await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  );
  results.push({
    name: "tc-01:positive-adjustment",
    ok:
      positive.status === INVENTORY_DOCUMENT_STATUSES.POSTED &&
      afterPositive?.onHand === "105" &&
      movementsAfterPositive.some(
        (row) =>
          row.movementType === INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT &&
          row.quantity === "5"
      ),
    detail: afterPositive?.onHand,
  });

  const negative = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.NEGATIVE_ADJUSTMENT,
    quantity: "8",
    reason: "Count correction",
  });
  const afterNegative = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-02:negative-adjustment",
    ok: negative.status === INVENTORY_DOCUMENT_STATUSES.POSTED && afterNegative?.onHand === "97",
    detail: afterNegative?.onHand,
  });

  const damage = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.DAMAGE,
    quantity: "10",
    reason: "Broken in store",
  });
  const afterDamage = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const damageMovements = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.DAMAGE);
  results.push({
    name: "tc-03:damage",
    ok:
      damage.status === INVENTORY_DOCUMENT_STATUSES.POSTED &&
      afterDamage?.onHand === "87" &&
      damageMovements.length === 1 &&
      damageMovements[0]?.quantity === "10",
    detail: afterDamage?.onHand,
  });

  const loss = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.LOSS,
    quantity: "7",
    reason: "Shrinkage",
  });
  const afterLoss = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const lossMovements = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.LOSS);
  results.push({
    name: "tc-04:loss",
    ok:
      loss.status === INVENTORY_DOCUMENT_STATUSES.POSTED &&
      afterLoss?.onHand === "80" &&
      lossMovements.length === 1 &&
      lossMovements[0]?.quantity === "7",
    detail: afterLoss?.onHand,
  });

  const insufficient = await caughtCode(() =>
    postType(env.adjustment, maker, {
      stockItemId: stock.itemA.id,
      locationId: stock.location.id,
      adjustmentType: INVENTORY_ADJUSTMENT_TYPES.LOSS,
      quantity: "81",
      reason: "Too much",
    })
  );
  const still80 = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-05:insufficient-stock",
    ok: insufficient === INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT,
    detail: insufficient ?? undefined,
  });
  results.push({
    name: "tc-06:no-negative-stock",
    ok: still80?.onHand === "80",
    detail: still80?.onHand,
  });

  const postedLines = damage.lines[0];
  const openingCount = movementsAfterPositive.filter(
    (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_STOCK
  ).length;
  results.push({
    name: "tc-07:posted-creates-ledger-movement",
    ok:
      Boolean(postedLines?.movementId) &&
      damageMovements[0]?.id === postedLines?.movementId &&
      openingCount === 1,
  });

  const editPosted = await caughtCode(() =>
    env.adjustment.addAdjustmentLine(maker, damage.id, {
      stockItemId: stock.itemA.id,
      quantity: "1",
    })
  );
  results.push({
    name: "tc-08:posted-cannot-be-edited",
    ok: editPosted === INVENTORY_ERROR_CODES.DOCUMENT_NOT_EDITABLE,
    detail: editPosted ?? undefined,
  });

  const duplicateCreate = await env.adjustment.createAdjustment(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT,
    quantity: "2",
    reason: "Found again",
    externalReference: "ADJ-DUP-1",
  });
  const duplicateAgain = await env.adjustment.createAdjustment(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT,
    quantity: "9",
    reason: "Found again",
    externalReference: "ADJ-DUP-1",
  });
  results.push({
    name: "tc-09:duplicate-adjustment-idempotent",
    ok: duplicateCreate.id === duplicateAgain.id && duplicateAgain.totalQuantity === "2",
    detail: `${duplicateCreate.id} ${duplicateAgain.id}`,
  });

  results.push({
    name: "tc-10:adjustment-lifecycle-audited",
    ok:
      env.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_CREATED) &&
      env.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_POSTED) &&
      env.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.DAMAGE_RECORDED) &&
      env.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.LOSS_RECORDED),
  });

  return results;
}

async function runReturnCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const sales = new FakeSalesFulfilmentPort();
  sales.seed(saleContract());
  const env = harness({ sales });
  const maker = ctx("biz-a");
  const stock = await setupStock(env.foundation);
  const reserved = await env.reservation.createReservation(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    quantity: "10",
    salesOrderId: "so-1",
    salesOrderLineId: "line-1",
    salesOrderNumber: "SO-000001",
  });
  await env.reservation.fulfilReservation(maker, reserved.id, {
    quantity: "10",
    fulfilmentReference: "FUL-000001",
  });
  const afterSale = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const saleBefore = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION);

  const customerReturn = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN,
    quantity: "3",
    reason: "Customer brought goods back",
    originType: "SALE",
    originId: "so-1",
    externalReference: "RET-CUST-1",
  });
  const afterReturn = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const saleAfter = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION);
  const returnMovements = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.CUSTOMER_RETURN);
  results.push({
    name: "tc-11:customer-return-increases-stock",
    ok:
      afterSale?.onHand === "90" &&
      afterReturn?.onHand === "93" &&
      customerReturn.status === INVENTORY_DOCUMENT_STATUSES.POSTED,
    detail: `before=${afterSale?.onHand} after=${afterReturn?.onHand}`,
  });
  results.push({
    name: "tc-12:return-does-not-overwrite-sale",
    ok:
      saleBefore.length === 1 &&
      saleAfter.length === 1 &&
      saleAfter[0]?.id === saleBefore[0]?.id &&
      saleAfter[0]?.quantity === "10" &&
      returnMovements.length === 1 &&
      returnMovements[0]?.quantity === "3",
  });

  const exceed = await caughtCode(() =>
    postType(env.adjustment, maker, {
      stockItemId: stock.itemA.id,
      locationId: stock.location.id,
      adjustmentType: INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN,
      quantity: "8",
      reason: "Too many returned",
      originType: "SALE",
      originId: "so-1",
    })
  );
  results.push({
    name: "tc-13:return-exceeds-returnable-blocked",
    ok: exceed === INVENTORY_ERROR_CODES.RETURN_QUANTITY_EXCEEDS_RETURNABLE,
    detail: exceed ?? undefined,
  });

  const duplicateReturn = await env.adjustment.createAdjustment(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN,
    quantity: "1",
    reason: "Customer brought goods back",
    originType: "SALE",
    originId: "so-1",
    externalReference: "RET-CUST-1",
  });
  results.push({
    name: "tc-14:duplicate-return-idempotent",
    ok: duplicateReturn.id === customerReturn.id,
    detail: duplicateReturn.id,
  });

  await env.store.movementPort.insert({
    businessId: maker.businessId,
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    movementType: INVENTORY_MOVEMENT_TYPES.RECEIPT,
    quantity: "20",
    uomId: "uom-ea",
    reason: "Supplier delivery",
    metadata: { direction: "IN", sourceType: "STOCK_RECEIPT", sourceId: "receipt-1" },
    createdBy: maker.platformUserId,
  });
  await env.store.balancePort.applyInboundOnHand(
    maker.businessId,
    stock.itemA.id,
    stock.location.id,
    "20",
    maker.platformUserId
  );
  const receiptsBefore = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT);
  const supplierReturn = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN,
    quantity: "5",
    reason: "Returned to supplier",
    originType: "RECEIPT",
    originId: "receipt-1",
  });
  const afterSupplier = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const receiptsAfter = (await env.store.movementPort.listByStockItem(
    maker.businessId,
    stock.itemA.id
  )).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT);
  results.push({
    name: "tc-15:supplier-return-decreases-stock",
    ok: supplierReturn.status === INVENTORY_DOCUMENT_STATUSES.POSTED && afterSupplier?.onHand === "108",
    detail: afterSupplier?.onHand,
  });
  results.push({
    name: "tc-16:supplier-return-does-not-overwrite-receipt",
    ok:
      receiptsBefore.length === 1 &&
      receiptsAfter.length === 1 &&
      receiptsAfter[0]?.id === receiptsBefore[0]?.id &&
      receiptsAfter[0]?.quantity === "20",
  });

  const exceedSupplier = await caughtCode(() =>
    postType(env.adjustment, maker, {
      stockItemId: stock.itemA.id,
      locationId: stock.location.id,
      adjustmentType: INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN,
      quantity: "16",
      reason: "Too many to supplier",
      originType: "RECEIPT",
      originId: "receipt-1",
    })
  );
  results.push({
    name: "tc-17:supplier-return-exceeds-returnable-blocked",
    ok: exceedSupplier === INVENTORY_ERROR_CODES.RETURN_QUANTITY_EXCEEDS_RETURNABLE,
    detail: exceedSupplier ?? undefined,
  });

  results.push({
    name: "tc-18:return-lifecycle-audited",
    ok:
      env.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.CUSTOMER_RETURN_POSTED) &&
      env.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.SUPPLIER_RETURN_POSTED),
  });

  return results;
}

async function runUomCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const env = harness();
  const maker = ctx("biz-a");
  const stock = await setupStock(env.foundation, maker, { salesUom: true, opening: "100" });
  const converted = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT,
    quantity: "2",
    uomId: "uom-box",
    reason: "Found boxes",
  });
  const after = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-19:converted-uom",
    ok:
      converted.lines[0]?.baseQuantity === "24" &&
      converted.lines[0]?.quantity === "2" &&
      after?.onHand === "124",
    detail: `base=${converted.lines[0]?.baseQuantity} onHand=${after?.onHand}`,
  });

  const base = await postType(env.adjustment, maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.NEGATIVE_ADJUSTMENT,
    quantity: "4",
    uomId: "uom-ea",
    reason: "Base unit correction",
  });
  results.push({
    name: "tc-20:base-uom",
    ok: base.lines[0]?.baseQuantity === "4" && base.lines[0]?.conversionFactor === "1",
    detail: base.lines[0]?.baseQuantity,
  });

  const missing = harness();
  const missingStock = await setupStock(missing.foundation, maker, {
    salesUom: true,
    missingConversion: true,
    opening: "100",
  });
  const invalid = await caughtCode(() =>
    missing.adjustment.createAdjustment(maker, {
      stockItemId: missingStock.itemA.id,
      locationId: missingStock.location.id,
      adjustmentType: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT,
      quantity: "1",
      uomId: "uom-box",
      reason: "Missing conversion",
    })
  );
  results.push({
    name: "tc-21:invalid-conversion",
    ok: invalid === INVENTORY_ERROR_CODES.CONVERSION_REQUIRED,
    detail: invalid ?? undefined,
  });
  return results;
}

async function runApprovalCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const off = harness({ adjustmentApproval: false });
  const maker = ctx("biz-a");
  const stockOff = await setupStock(off.foundation);
  const direct = await postType(off.adjustment, maker, {
    stockItemId: stockOff.itemA.id,
    locationId: stockOff.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT,
    quantity: "1",
    reason: "Direct post",
  });
  results.push({
    name: "tc-22:approval-disabled-direct-post",
    ok: direct.status === INVENTORY_DOCUMENT_STATUSES.POSTED,
    detail: direct.status,
  });

  const on = harness({ adjustmentApproval: true });
  const stockOn = await setupStock(on.foundation);
  const draft = await on.adjustment.createAdjustment(maker, {
    stockItemId: stockOn.itemA.id,
    locationId: stockOn.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.DAMAGE,
    quantity: "1",
    reason: "Needs checker",
  });
  const postedDraft = await caughtCode(() => on.adjustment.postAdjustment(maker, draft.id));
  results.push({
    name: "tc-23:approval-enabled-blocks-direct-post",
    ok: postedDraft === INVENTORY_ERROR_CODES.APPROVAL_REQUIRED,
    detail: postedDraft ?? undefined,
  });
  await on.adjustment.submitAdjustment(maker, draft.id);
  const selfApprove = await caughtCode(() => on.adjustment.approveAdjustment(maker, draft.id));
  results.push({
    name: "tc-24:maker-cannot-self-approve",
    ok: selfApprove === INVENTORY_ERROR_CODES.SELF_APPROVAL,
    detail: selfApprove ?? undefined,
  });
  const checker = ctx("biz-a", "checker-1");
  const approved = await on.adjustment.approveAdjustment(checker, draft.id);
  const posted = await on.adjustment.postAdjustment(checker, draft.id);
  results.push({
    name: "tc-25:checker-required-then-posted",
    ok:
      approved.status === INVENTORY_DOCUMENT_STATUSES.APPROVED &&
      posted.status === INVENTORY_DOCUMENT_STATUSES.POSTED &&
      on.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_APPROVAL_REQUESTED) &&
      on.audit.entries.some((row) => row.action === INVENTORY_AUDIT_ACTIONS.ADJUSTMENT_APPROVED),
    detail: posted.status,
  });
  return results;
}

async function runConcurrencyCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const env = harness();
  const maker = ctx("biz-a");
  const stock = await setupStock(env.foundation, maker, { opening: "10" });
  const first = await env.adjustment.createAdjustment(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.LOSS,
    quantity: "7",
    reason: "Concurrent A",
  });
  const second = await env.adjustment.createAdjustment(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.LOSS,
    quantity: "7",
    reason: "Concurrent B",
  });
  const settled = await Promise.allSettled([
    env.adjustment.postAdjustment(maker, first.id),
    env.adjustment.postAdjustment(maker, second.id),
  ]);
  const codes = settled.map((row) =>
    row.status === "fulfilled"
      ? "POSTED"
      : row.reason instanceof InventoryError
        ? row.reason.code
        : String(row.reason)
  );
  const after = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  results.push({
    name: "tc-26:concurrent-adjustments",
    ok:
      codes.includes("POSTED") &&
      codes.includes(INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT) &&
      after?.onHand === "3",
    detail: `${codes.join(",")} onHand=${after?.onHand}`,
  });

  const returns = harness();
  const returnStock = await setupStock(returns.foundation, maker, { opening: "10" });
  await returns.store.movementPort.insert({
    businessId: maker.businessId,
    stockItemId: returnStock.itemA.id,
    locationId: returnStock.location.id,
    movementType: INVENTORY_MOVEMENT_TYPES.RECEIPT,
    quantity: "10",
    uomId: "uom-ea",
    reason: "Supplier delivery",
    metadata: { direction: "IN", sourceType: "STOCK_RECEIPT", sourceId: "receipt-conc" },
    createdBy: maker.platformUserId,
  });
  const retA = await returns.adjustment.createAdjustment(maker, {
    stockItemId: returnStock.itemA.id,
    locationId: returnStock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN,
    quantity: "7",
    reason: "Concurrent return A",
    originId: "receipt-conc",
    originType: "RECEIPT",
  });
  const retB = await returns.adjustment.createAdjustment(maker, {
    stockItemId: returnStock.itemA.id,
    locationId: returnStock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN,
    quantity: "7",
    reason: "Concurrent return B",
    originId: "receipt-conc",
    originType: "RECEIPT",
  });
  const returnSettled = await Promise.allSettled([
    returns.adjustment.postAdjustment(maker, retA.id),
    returns.adjustment.postAdjustment(maker, retB.id),
  ]);
  const returnCodes = returnSettled.map((row) =>
    row.status === "fulfilled"
      ? "POSTED"
      : row.reason instanceof InventoryError
        ? row.reason.code
        : String(row.reason)
  );
  const afterReturns = await returns.store.balancePort.findByItemAndLocation(
    maker.businessId,
    returnStock.itemA.id,
    returnStock.location.id
  );
  results.push({
    name: "tc-27:concurrent-returns",
    ok:
      returnCodes.includes("POSTED") &&
      (returnCodes.includes(INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT) ||
        returnCodes.includes(INVENTORY_ERROR_CODES.RETURN_QUANTITY_EXCEEDS_RETURNABLE)) &&
      afterReturns?.onHand === "3",
    detail: `${returnCodes.join(",")} onHand=${afterReturns?.onHand}`,
  });
  return results;
}

async function runTenantCases(): Promise<SmokeResult[]> {
  const env = harness();
  const maker = ctx("biz-a");
  const other = ctx("biz-b");
  const stock = await setupStock(env.foundation);
  const created = await env.adjustment.createAdjustment(maker, {
    stockItemId: stock.itemA.id,
    locationId: stock.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.LOSS,
    quantity: "1",
    reason: "Tenant check",
  });
  const lookup = await caughtCode(() => env.adjustment.getAdjustment(other, created.id));
  const post = await caughtCode(() => env.adjustment.postAdjustment(other, created.id));
  return [
    {
      name: "tc-28:cross-business-read-blocked",
      ok: lookup === INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND,
      detail: lookup ?? undefined,
    },
    {
      name: "tc-29:cross-business-post-blocked",
      ok: post === INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND,
      detail: post ?? undefined,
    },
  ];
}

function runExternal(script: string, extraEnv?: Record<string, string>): SmokeResult {
  if (!existsSync(path.join(ROOT, script))) {
    return {
      name: `regression:${path.basename(script)}`,
      ok: true,
      detail: "skipped — script not present",
    };
  }
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
        ? extraEnv && extraEnv.IP04_NOTE
          ? extraEnv.IP04_NOTE
          : undefined
        : (result.stdout || result.stderr || `exit=${result.status}`).slice(-800),
  };
}

async function main() {
  const coreResults: SmokeResult[] = [
    ...checkFiles(),
    ...checkUxLanguage(),
    ...checkArchitecture(),
    ...(await runAdjustmentCases()),
    ...(await runReturnCases()),
    ...(await runUomCases()),
    ...(await runApprovalCases()),
    ...(await runConcurrencyCases()),
    ...(await runTenantCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP05_SKIP_REGRESSION !== "1") {
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
    regressionResults.push(
      runExternal("scripts/bp008-ip03-stock-reservation-sales-deduction-smoke-validation.ts", {
        IP03_SKIP_REGRESSION: "1",
        IP02_SKIP_REGRESSION: "1",
        IP01_SKIP_REGRESSION: "1",
      })
    );
    const ip04 = "scripts/bp008-ip04-stock-transfers-multi-location-smoke-validation.ts";
    if (existsSync(path.join(ROOT, ip04))) {
      regressionResults.push(
        runExternal(ip04, {
          IP04_SKIP_REGRESSION: "1",
          IP03_SKIP_REGRESSION: "1",
          IP02_SKIP_REGRESSION: "1",
          IP01_SKIP_REGRESSION: "1",
        })
      );
    } else {
      regressionResults.push({
        name: "regression:bp008-ip04-stock-transfers-multi-location-smoke-validation.ts",
        ok: true,
        detail: "skipped — IP-04 is not implemented on this branch",
      });
    }
    if (
      existsSync(
        path.join(ROOT, "scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts")
      )
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
