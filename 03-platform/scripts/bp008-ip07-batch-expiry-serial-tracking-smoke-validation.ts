/**
 * Purpose:
 * Smoke-validate BP-008 / IP-07 Batch, Expiry & Serial Resource Tracking.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip07-batch-expiry-serial-tracking-smoke-validation.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { INVENTORY_MOVEMENT_TYPES } from "@/core/inventory-engine";
import { createScriptedDocumentNumberingAdapter } from "@/core/localization-regulatory/services/document-numbering-service";
import {
  listSourceFiles,
  scanInventoryArchitecture,
} from "@/modules/inventory/architecture-scan";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_STOCKTAKE_SCOPE_TYPES,
  INVENTORY_TRACKING_MODES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { TraceabilityService } from "@/modules/inventory/services/inventory-traceability-service";
import { StockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import { StockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import { StockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import { StocktakeService } from "@/modules/inventory/services/stocktake-service";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0075_bp008_ip007_batch_expiry_serial_tracking.sql",
  "src/db/schema/inventory-lot.ts",
  "src/db/schema/inventory-tracked-unit.ts",
  "src/db/schema/inventory-line-trace.ts",
  "src/db/schema/inventory-trace-allocation.ts",
  "src/modules/inventory/services/inventory-traceability-service.ts",
  "src/app/(authenticated)/(app)/inventory/traceability/page.tsx",
  "src/app/(authenticated)/(app)/inventory/traceability/batches/[lotId]/page.tsx",
  "src/app/(authenticated)/(app)/inventory/traceability/serials/[unitId]/page.tsx",
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

async function expectError(work: () => Promise<unknown>, code: string): Promise<boolean> {
  try {
    await work();
    return false;
  } catch (error) {
    return error instanceof InventoryError && error.code === code;
  }
}

function harness() {
  const store = new InMemoryInventoryStore();
  store.seedProduct(productFixture());
  store.seedProduct(
    productFixture({ id: "product-b", productCode: "PRD-B", productName: "Product B" })
  );
  store.seedProduct(
    productFixture({ id: "product-c", productCode: "PRD-C", productName: "Product C" })
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
    id: "uom-b",
    businessId: "biz-b",
    code: "EA",
    name: "Each",
    symbol: "ea",
    status: "ACTIVE",
  });
  for (const control of [
    {
      code: INVENTORY_OPERATION_CODES.STOCK_RECEIVING,
      name: "Stock receiving",
      movementType: INVENTORY_MOVEMENT_TYPES.RECEIPT,
    },
    {
      code: INVENTORY_OPERATION_CODES.OPENING_BALANCE,
      name: "Opening balance",
      movementType: INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE,
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION,
      name: "Stock reservation",
      movementType: "RESERVATION",
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCK_DEDUCTION,
      name: "Stock deduction",
      movementType: INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION,
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE,
      name: "Reservation release",
      movementType: "RESERVATION",
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCK_ADJUSTMENT,
      name: "Stock adjustment",
      movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT,
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCKTAKE,
      name: "Stocktake",
      movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT,
    },
  ]) {
    store.seedControl({
      ...control,
      requiresApproval: false,
      overReceiptPolicy: "BLOCK",
    });
  }
  const audit = new RecordingInventoryAudit();
  const numbering = createScriptedDocumentNumberingAdapter();
  const locks = createInProcessInventoryLock();
  const workflow = createInventoryControlWorkflowAdapter(store.controlPort);
  const traceability = new TraceabilityService({
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    movements: store.movementPort,
    lots: store.lotPort,
    units: store.trackedUnitPort,
    captures: store.lineTracePort,
    allocations: store.traceAllocationPort,
    locks,
    audit,
  });
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
    traceability,
  });
  const receiving = new StockReceivingService({
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    movements: store.movementPort,
    balances: store.balancePort,
    receipts: store.receiptPort,
    receiptLines: store.receiptLinePort,
    openings: store.openingPort,
    openingLines: store.openingLinePort,
    controls: store.controlPort,
    suppliers: store.supplierPort,
    units: store.unitPort,
    numbering,
    workflow,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    traceability,
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
    numbering,
    workflow,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    traceability,
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
    numbering,
    workflow,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    traceability,
  });
  const stocktake = new StocktakeService({
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    balances: store.balancePort,
    stocktakes: store.stocktakePort,
    stocktakeLines: store.stocktakeLinePort,
    stocktakeCounts: store.stocktakeCountPort,
    controls: store.controlPort,
    units: store.unitPort,
    numbering,
    workflow,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    adjustments: adjustment,
    traceability,
  });
  return { store, audit, traceability, foundation, receiving, reservation, adjustment, stocktake };
}

async function setupCatalog(foundation: InventoryFoundationService, actor = ctx("biz-a")) {
  const noneItem = await foundation.createStockItem(actor, {
    productId: "product-a",
    sku: "SKU-NONE",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    trackingMode: INVENTORY_TRACKING_MODES.NONE,
  });
  const batchItem = await foundation.createStockItem(actor, {
    productId: "product-b",
    sku: "SKU-BATCH",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    trackingMode: INVENTORY_TRACKING_MODES.BATCH,
    expiryTrackingEnabled: true,
  });
  const serialItem = await foundation.createStockItem(actor, {
    productId: "product-c",
    sku: "SKU-SERIAL",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    trackingMode: INVENTORY_TRACKING_MODES.SERIAL,
  });
  const location = await foundation.createLocation(actor, {
    code: "MAIN",
    name: "Main Warehouse",
    locationTypeCode: "MAIN_STORE",
  });
  for (const item of [noneItem, batchItem, serialItem]) {
    await foundation.configureStockItemLocation(actor, {
      stockItemId: item.id,
      locationId: location.id,
    });
  }
  return { noneItem, batchItem, serialItem, location };
}

async function postReceipt(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  locationId: string,
  stockItemId: string,
  quantity: string,
  capture: { lotCode?: string; expiresOn?: string; unitCodes?: string[] }
) {
  const receipt = await env.receiving.createReceipt(actor, { locationId });
  await env.receiving.addReceiptLine(actor, receipt.id, {
    stockItemId,
    quantity,
    ...capture,
  });
  return env.receiving.postReceipt(actor, receipt.id);
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkUxLanguage(): SmokeResult[] {
  const files = [
    "src/modules/inventory/components/inventory-traceability-workspace.tsx",
    "src/modules/inventory/components/lot-trace-detail.tsx",
    "src/modules/inventory/components/unit-trace-detail.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-07") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok: visible.includes("Traceability") && visible.includes("Batch") && visible.includes("Serial"),
    },
  ];
}

function checkArchitecture(): SmokeResult[] {
  const inventoryRoot = path.join(ROOT, "src/modules/inventory");
  const engineRoot = path.join(ROOT, "src/core/inventory-engine");
  const files = [...listSourceFiles(inventoryRoot), ...listSourceFiles(engineRoot)].filter((file) => {
    const rel = file.replace(/\\/g, "/");
    return !rel.includes("/architecture-scan.ts");
  });
  const scan = scanInventoryArchitecture(files);
  const service = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-traceability-service.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0075_bp008_ip007_batch_expiry_serial_tracking.sql"),
    "utf8"
  );
  const schemaDir = path.join(ROOT, "src/db/schema");
  const schemaFiles = readdirSync(schemaDir);
  return [
    {
      name: "arch:no-future-ip-methods",
      ok: scan.futureIpHits.length === 0,
      detail: scan.futureIpHits.join(", "),
    },
    {
      name: "arch:no-second-ledger",
      ok:
        !migration.toLowerCase().includes("on_hand") &&
        !service.includes("applyInboundOnHand") &&
        !service.includes("adjustStock("),
    },
    {
      name: "arch:no-ip08-reorder",
      ok:
        !schemaFiles.includes("inventory-reorder.ts") &&
        !service.includes("createReorder") &&
        !migration.includes("inventory_reorder"),
    },
    {
      name: "arch:no-ip09-exception",
      ok:
        !schemaFiles.includes("inventory-exception.ts") &&
        !service.includes("raiseInventoryException") &&
        !migration.includes("inventory_exception"),
    },
    {
      name: "arch:no-ip04-transfer-engine",
      ok: !migration.includes("inventory_transfer") && !service.includes("transferStock("),
    },
    {
      name: "arch:no-fifo",
      ok: !service.toLowerCase().includes("fifo") && !service.toLowerCase().includes("fefo"),
    },
    {
      name: "arch:no-client-authoritative-businessId",
      ok: scan.clientBusinessIdHits.length === 0,
      detail: scan.clientBusinessIdHits.join(", "),
    },
  ];
}

async function runCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const maker = ctx("biz-a");

  const configEnv = harness();
  const catalog = await setupCatalog(configEnv.foundation);
  results.push({
    name: "tc-01:none-requires-no-trace",
    ok: catalog.noneItem.trackingMode === INVENTORY_TRACKING_MODES.NONE,
  });
  const noneReceipt = await postReceipt(
    configEnv,
    maker,
    catalog.location.id,
    catalog.noneItem.id,
    "10",
    {}
  );
  results.push({ name: "tc-02:none-receive-without-batch", ok: noneReceipt.status === "POSTED" });
  results.push({
    name: "tc-03:batch-requires-lot",
    ok: await expectError(
      () =>
        postReceipt(configEnv, maker, catalog.location.id, catalog.batchItem.id, "10", {}),
      INVENTORY_ERROR_CODES.LOT_REQUIRED
    ),
  });
  results.push({
    name: "tc-04:serial-requires-codes",
    ok: await expectError(
      () =>
        postReceipt(configEnv, maker, catalog.location.id, catalog.serialItem.id, "2", {}),
      INVENTORY_ERROR_CODES.UNIT_CODES_REQUIRED
    ),
  });
  results.push({
    name: "tc-05:invalid-tracking-mode",
    ok: await expectError(
      () =>
        harness().foundation.createStockItem(maker, {
          productId: "product-a",
          sku: "SKU-BAD",
          itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
          baseUomId: "uom-ea",
          trackingMode: "BATCH_AND_SERIAL",
        }),
      INVENTORY_ERROR_CODES.INVALID_TRACKING_MODE
    ),
  });
  results.push({
    name: "tc-06:mode-locked-with-stock",
    ok: await expectError(
      () =>
        configEnv.foundation.updateStockItem(maker, catalog.noneItem.id, {
          trackingMode: INVENTORY_TRACKING_MODES.BATCH,
        }),
      INVENTORY_ERROR_CODES.TRACKING_MODE_LOCKED
    ),
  });

  const batchEnv = harness();
  const batchCatalog = await setupCatalog(batchEnv.foundation);
  await postReceipt(batchEnv, maker, batchCatalog.location.id, batchCatalog.batchItem.id, "100", {
    lotCode: "B-2026-001",
    expiresOn: "2027-08-31",
  });
  const lots = await batchEnv.traceability.search(maker, { stockItemId: batchCatalog.batchItem.id });
  results.push({
    name: "tc-07:batch-receive-quantity",
    ok: lots.lots[0]?.quantity === "100" && lots.lots[0]?.lotCode === "B-2026-001",
    detail: lots.lots[0]?.quantity,
  });
  results.push({
    name: "tc-08:duplicate-lot",
    ok: await expectError(
      () =>
        batchEnv.store.lotPort.insert({
          businessId: "biz-a",
          stockItemId: batchCatalog.batchItem.id,
          lotCode: "B-2026-001",
          manufacturedOn: null,
          expiresOn: null,
          status: "ACTIVE",
          notes: null,
          createdBy: null,
          updatedBy: null,
        }),
      INVENTORY_ERROR_CODES.DUPLICATE_LOT
    ),
  });
  await batchEnv.reservation.createReservation(maker, {
    stockItemId: batchCatalog.batchItem.id,
    locationId: batchCatalog.location.id,
    quantity: "20",
    lotCode: "B-2026-001",
  });
  const reserved = await batchEnv.reservation.listReservations(maker);
  await batchEnv.reservation.fulfilReservation(maker, reserved[0].id, {
    quantity: "20",
    fulfilmentReference: "FUL-1",
    lotCode: "B-2026-001",
  });
  const afterSale = await batchEnv.traceability.search(maker, {
    stockItemId: batchCatalog.batchItem.id,
  });
  results.push({
    name: "tc-09:batch-deduction-preserves-identity",
    ok: afterSale.lots[0]?.quantity === "80" && afterSale.lots[0]?.lotCode === "B-2026-001",
    detail: afterSale.lots[0]?.quantity,
  });
  const balance = await batchEnv.store.balancePort.findByItemAndLocation(
    "biz-a",
    batchCatalog.batchItem.id,
    batchCatalog.location.id
  );
  results.push({
    name: "tc-10:batch-qty-agrees-with-ledger",
    ok: balance?.onHand === "80" && afterSale.lots[0]?.quantity === "80",
    detail: `onHand=${balance?.onHand} lot=${afterSale.lots[0]?.quantity}`,
  });

  const serialEnv = harness();
  const serialCatalog = await setupCatalog(serialEnv.foundation);
  results.push({
    name: "tc-11:serial-qty-mismatch",
    ok: await expectError(
      () =>
        postReceipt(serialEnv, maker, serialCatalog.location.id, serialCatalog.serialItem.id, "3", {
          unitCodes: ["SN001", "SN002"],
        }),
      INVENTORY_ERROR_CODES.UNIT_COUNT_MISMATCH
    ),
  });
  await postReceipt(serialEnv, maker, serialCatalog.location.id, serialCatalog.serialItem.id, "3", {
    unitCodes: ["SN001", "SN002", "SN003"],
  });
  const serials = await serialEnv.traceability.search(maker, {
    stockItemId: serialCatalog.serialItem.id,
  });
  results.push({
    name: "tc-12:serial-create-and-location",
    ok:
      serials.units.length === 3 &&
      serials.units.every((row) => row.status === "AVAILABLE" && row.locationId === serialCatalog.location.id),
  });
  results.push({
    name: "tc-13:duplicate-serial-receive",
    ok: await expectError(
      () =>
        postReceipt(serialEnv, maker, serialCatalog.location.id, serialCatalog.serialItem.id, "1", {
          unitCodes: ["SN001"],
        }),
      INVENTORY_ERROR_CODES.DUPLICATE_TRACKED_UNIT
    ),
  });
  await serialEnv.reservation.createReservation(maker, {
    stockItemId: serialCatalog.serialItem.id,
    locationId: serialCatalog.location.id,
    quantity: "1",
    unitCodes: ["SN001"],
  });
  results.push({
    name: "tc-14:serial-reservation-conflict",
    ok: await expectError(
      () =>
        serialEnv.reservation.createReservation(maker, {
          stockItemId: serialCatalog.serialItem.id,
          locationId: serialCatalog.location.id,
          quantity: "1",
          unitCodes: ["SN001"],
        }),
      INVENTORY_ERROR_CODES.TRACKED_UNIT_CONFLICT
    ),
  });
  const serialReservations = await serialEnv.reservation.listReservations(maker);
  await serialEnv.reservation.fulfilReservation(maker, serialReservations[0].id, {
    quantity: "1",
    fulfilmentReference: "FUL-SN",
    unitCodes: ["SN001"],
  });
  results.push({
    name: "tc-15:serial-cannot-sell-twice",
    ok: await expectError(
      () =>
        serialEnv.reservation.createReservation(maker, {
          stockItemId: serialCatalog.serialItem.id,
          locationId: serialCatalog.location.id,
          quantity: "1",
          unitCodes: ["SN001"],
        }),
      INVENTORY_ERROR_CODES.TRACKED_UNIT_CONFLICT
    ),
  });
  const sold = await serialEnv.traceability.search(maker, { unitCode: "SN001" });
  results.push({
    name: "tc-16:serial-sold-state",
    ok: sold.units[0]?.status === "SOLD",
    detail: sold.units[0]?.status,
  });

  const expiryEnv = harness();
  const expiryCatalog = await setupCatalog(expiryEnv.foundation);
  await postReceipt(expiryEnv, maker, expiryCatalog.location.id, expiryCatalog.batchItem.id, "10", {
    lotCode: "EXPIRED-1",
    expiresOn: "2020-01-01",
  });
  const expiredLots = await expiryEnv.traceability.search(maker, {
    stockItemId: expiryCatalog.batchItem.id,
  });
  results.push({
    name: "tc-17:expired-status-visible",
    ok: expiredLots.lots[0]?.expiryStatus === "EXPIRED" && expiredLots.lots[0]?.quantity === "10",
  });
  results.push({
    name: "tc-18:expired-cannot-reserve",
    ok: await expectError(
      () =>
        expiryEnv.reservation.createReservation(maker, {
          stockItemId: expiryCatalog.batchItem.id,
          locationId: expiryCatalog.location.id,
          quantity: "1",
          lotCode: "EXPIRED-1",
        }),
      INVENTORY_ERROR_CODES.EXPIRED_STOCK_NOT_ALLOWED
    ),
  });
  const movementsBefore = await expiryEnv.store.movementPort.listByStockItem(
    "biz-a",
    expiryCatalog.batchItem.id
  );
  results.push({
    name: "tc-19:expiry-does-not-adjust",
    ok: movementsBefore.length === 1,
    detail: String(movementsBefore.length),
  });

  const tenantEnv = harness();
  const tenantCatalog = await setupCatalog(tenantEnv.foundation);
  await postReceipt(tenantEnv, maker, tenantCatalog.location.id, tenantCatalog.batchItem.id, "5", {
    lotCode: "TENANT-A",
    expiresOn: "2027-01-01",
  });
  const tenantLots = await tenantEnv.traceability.search(maker, {});
  results.push({
    name: "tc-20:tenant-isolation",
    ok: await expectError(
      () => tenantEnv.traceability.getLotDetail(ctx("biz-b"), tenantLots.lots[0].id),
      INVENTORY_ERROR_CODES.LOT_NOT_FOUND
    ),
  });

  const idemEnv = harness();
  const idemCatalog = await setupCatalog(idemEnv.foundation);
  const first = await postReceipt(
    idemEnv,
    maker,
    idemCatalog.location.id,
    idemCatalog.batchItem.id,
    "4",
    { lotCode: "IDEM-1", expiresOn: "2027-01-01" }
  );
  const second = await idemEnv.receiving.postReceipt(maker, first.id);
  const idemLots = await idemEnv.traceability.search(maker, { lotCode: "IDEM-1" });
  results.push({
    name: "tc-21:idempotent-post",
    ok: second.id === first.id && idemLots.lots[0]?.quantity === "4",
  });

  const concEnv = harness();
  const concCatalog = await setupCatalog(concEnv.foundation);
  const left = await concEnv.receiving.createReceipt(maker, { locationId: concCatalog.location.id });
  await concEnv.receiving.addReceiptLine(maker, left.id, {
    stockItemId: concCatalog.serialItem.id,
    quantity: "1",
    unitCodes: ["SN-CONC"],
  });
  const right = await concEnv.receiving.createReceipt(maker, { locationId: concCatalog.location.id });
  await concEnv.receiving.addReceiptLine(maker, right.id, {
    stockItemId: concCatalog.serialItem.id,
    quantity: "1",
    unitCodes: ["SN-CONC"],
  });
  const conc = await Promise.allSettled([
    concEnv.receiving.postReceipt(maker, left.id),
    concEnv.receiving.postReceipt(maker, right.id),
  ]);
  const concWins = conc.filter((row) => row.status === "fulfilled").length;
  results.push({
    name: "tc-22:concurrent-serial-receive",
    ok: concWins === 1,
    detail: `fulfilled=${concWins}`,
  });

  const auditEnv = harness();
  const auditCatalog = await setupCatalog(auditEnv.foundation);
  await postReceipt(auditEnv, maker, auditCatalog.location.id, auditCatalog.batchItem.id, "2", {
    lotCode: "AUD-1",
    expiresOn: "2027-01-01",
  });
  const actions = auditEnv.audit.entries.map((row) => row.action);
  results.push({
    name: "tc-23:audit-trail",
    ok:
      actions.includes(INVENTORY_AUDIT_ACTIONS.LOT_CREATED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_CREATED),
    detail: actions.filter((action) => action.includes("LOT") || action.includes("TRACK")).join(","),
  });

  const history = await batchEnv.traceability.getLotDetail(maker, afterSale.lots[0].id);
  results.push({
    name: "tc-24:trace-history",
    ok: history.history.length >= 2,
    detail: String(history.history.length),
  });

  const adjEnv = harness();
  const adjCatalog = await setupCatalog(adjEnv.foundation);
  await postReceipt(adjEnv, maker, adjCatalog.location.id, adjCatalog.serialItem.id, "1", {
    unitCodes: ["SN-DMG"],
  });
  const damaged = await adjEnv.adjustment.createAdjustment(maker, {
    locationId: adjCatalog.location.id,
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.DAMAGE,
    reason: "Damaged in store",
    stockItemId: adjCatalog.serialItem.id,
    quantity: "1",
    unitCodes: ["SN-DMG"],
  });
  await adjEnv.adjustment.postAdjustment(maker, damaged.id);
  const damagedUnit = await adjEnv.traceability.search(maker, { unitCode: "SN-DMG" });
  results.push({
    name: "tc-25:adjustment-serial-damage",
    ok: damagedUnit.units[0]?.status === "DAMAGED",
    detail: damagedUnit.units[0]?.status,
  });

  const takeEnv = harness();
  const takeCatalog = await setupCatalog(takeEnv.foundation);
  await postReceipt(takeEnv, maker, takeCatalog.location.id, takeCatalog.batchItem.id, "100", {
    lotCode: "STK-1",
    expiresOn: "2027-08-31",
  });
  const take = await takeEnv.stocktake.createStocktake(maker, {
    locationId: takeCatalog.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM,
    stockItemIds: [takeCatalog.batchItem.id],
  });
  const started = await takeEnv.stocktake.startStocktake(maker, take.id);
  await takeEnv.stocktake.recordCount(maker, started.id, started.lines[0].id, {
    quantity: "95",
    lotCode: "STK-1",
  });
  await takeEnv.stocktake.submitStocktake(maker, started.id);
  await takeEnv.stocktake.postStocktake(maker, started.id);
  const afterTake = await takeEnv.traceability.search(maker, { lotCode: "STK-1" });
  results.push({
    name: "tc-26:stocktake-batch-variance",
    ok: afterTake.lots[0]?.quantity === "95",
    detail: afterTake.lots[0]?.quantity,
  });

  return results;
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
        ? extraEnv?.IP04_NOTE
        : (result.stdout || result.stderr || `exit=${result.status}`).slice(-800),
  };
}

async function main() {
  const coreResults: SmokeResult[] = [
    ...checkFiles(),
    ...checkUxLanguage(),
    ...checkArchitecture(),
    ...(await runCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP07_SKIP_REGRESSION !== "1") {
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
    regressionResults.push(
      runExternal("scripts/bp008-ip05-stock-adjustments-damage-loss-returns-smoke-validation.ts", {
        IP05_SKIP_REGRESSION: "1",
        IP04_SKIP_REGRESSION: "1",
        IP03_SKIP_REGRESSION: "1",
        IP02_SKIP_REGRESSION: "1",
        IP01_SKIP_REGRESSION: "1",
      })
    );
    regressionResults.push(
      runExternal("scripts/bp008-ip06-stocktake-inventory-reconciliation-smoke-validation.ts", {
        IP06_SKIP_REGRESSION: "1",
        IP05_SKIP_REGRESSION: "1",
        IP04_SKIP_REGRESSION: "1",
        IP03_SKIP_REGRESSION: "1",
        IP02_SKIP_REGRESSION: "1",
        IP01_SKIP_REGRESSION: "1",
      })
    );
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
    process.exit(1);
  }
}

void main();
