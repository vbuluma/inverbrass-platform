/**
 * Purpose:
 * Smoke-validate BP-008 / IP-08 Reorder & Inventory Controls.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip08-inventory-controls-smoke-validation.ts
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
  INVENTORY_CONTROL_STATUSES,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  INVENTORY_TRACKING_MODES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryControlService } from "@/modules/inventory/services/inventory-control-service";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { TraceabilityService } from "@/modules/inventory/services/inventory-traceability-service";
import { StockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import { StockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0076_bp008_ip008_inventory_controls.sql",
  "src/db/schema/inventory-replenishment-advice.ts",
  "src/db/schema/inventory-control-change.ts",
  "src/modules/inventory/services/inventory-control-service.ts",
  "src/modules/inventory/services/inventory-control-rules.ts",
  "src/app/(authenticated)/(app)/inventory/controls/page.tsx",
  "src/app/(authenticated)/(app)/inventory/controls/[stockItemId]/page.tsx",
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
      code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION,
      name: "Stock reservation",
      movementType: "RESERVATION",
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCK_RESERVATION_RELEASE,
      name: "Reservation release",
      movementType: "RESERVATION",
    },
    {
      code: INVENTORY_OPERATION_CODES.INVENTORY_CONTROL_CONFIG,
      name: "Inventory control settings",
      movementType: "CONTROL",
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
  const controls = new InventoryControlService({
    products: store.productPort,
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    balances: store.balancePort,
    advice: store.advicePort,
    changes: store.controlChangePort,
    controls: store.controlPort,
    workflow,
    numbering,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    traceability,
  });
  return { store, audit, foundation, receiving, reservation, controls };
}

async function setupItem(
  env: ReturnType<typeof harness>,
  sku: string,
  productId: string,
  extras: {
    trackingMode?: string;
    expiryTrackingEnabled?: boolean;
    allowExpiredFulfilment?: boolean;
  } = {}
) {
  const actor = ctx("biz-a");
  const item = await env.foundation.createStockItem(actor, {
    productId,
    sku,
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    trackingMode: extras.trackingMode ?? INVENTORY_TRACKING_MODES.NONE,
    expiryTrackingEnabled: extras.expiryTrackingEnabled,
    allowExpiredFulfilment: extras.allowExpiredFulfilment,
  });
  const existing = await env.foundation.listLocations(actor);
  const location =
    existing.find((row) => row.code === "MAIN") ??
    (await env.foundation.createLocation(actor, {
      code: "MAIN",
      name: "Main Warehouse",
      locationTypeCode: "MAIN_STORE",
    }));
  await env.foundation.configureStockItemLocation(actor, {
    stockItemId: item.id,
    locationId: location.id,
  });
  return { item, location, actor };
}

async function postReceipt(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  locationId: string,
  stockItemId: string,
  quantity: string,
  capture: { lotCode?: string; expiresOn?: string; unitCodes?: string[] } = {}
) {
  const receipt = await env.receiving.createReceipt(actor, { locationId });
  await env.receiving.addReceiptLine(actor, receipt.id, {
    stockItemId,
    quantity,
    ...capture,
  });
  return env.receiving.postReceipt(actor, receipt.id);
}

function positionOf(
  dashboard: Awaited<ReturnType<InventoryControlService["evaluateStockControls"]>>,
  stockItemId: string
) {
  return dashboard.rows.find((row) => row.stockItemId === stockItemId);
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkUxLanguage(): SmokeResult[] {
  const files = [
    "src/modules/inventory/components/inventory-control-workspace.tsx",
    "src/modules/inventory/components/inventory-control-settings-form.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-08") &&
        !visible.includes("ENG-013") &&
        !visible.includes("ENG-005"),
    },
    {
      name: "ux:operational-language",
      ok: visible.includes("Inventory controls") && visible.includes("Reorder required"),
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
    path.join(ROOT, "src/modules/inventory/services/inventory-control-service.ts"),
    "utf8"
  );
  const rules = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-control-rules.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0076_bp008_ip008_inventory_controls.sql"),
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
      ok: !service.includes("applyInboundOnHand") && !service.includes("applyOutboundOnHand"),
    },
    {
      name: "arch:no-purchase-order",
      ok:
        !service.includes("createPurchaseOrder") &&
        !migration.includes("purchase_order") &&
        !service.includes("@/modules/procurement"),
    },
    {
      name: "arch:no-supplier-api",
      ok: !service.includes("findActiveSupplier") && !service.includes("axios"),
    },
    {
      name: "arch:no-ip04-transfer-engine",
      ok: !service.includes("transferStock(") && !migration.includes("inventory_transfer"),
    },
    {
      name: "arch:no-ip09-exception",
      ok:
        !schemaFiles.includes("inventory-exception.ts") &&
        !service.includes("raiseInventoryException") &&
        !migration.includes("inventory_exception"),
    },
    {
      name: "arch:no-hard-coded-threshold",
      ok: !rules.includes("< 10") && !service.includes("if (quantity < 10)"),
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
  const actor = ctx("biz-a");

  {
    const env = harness();
    const { item } = await setupItem(env, "SKU-CFG", "product-a");
    const saved = await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      minimumStock: "50",
      reorderLevel: "100",
      maximumStock: "500",
      reorderQuantity: "80",
      safetyStock: "10",
    });
    results.push({ name: "tc-01:valid-control-config", ok: saved.status === "APPLIED" });
  }

  {
    const env = harness();
    const { item } = await setupItem(env, "SKU-NEG", "product-a");
    results.push({
      name: "tc-02:negative-values-rejected",
      ok: await expectError(
        () =>
          env.controls.saveControlSettings(actor, {
            stockItemId: item.id,
            minimumStock: "-1",
          }),
        INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION
      ),
    });
  }

  {
    const env = harness();
    const { item } = await setupItem(env, "SKU-MINMAX", "product-a");
    results.push({
      name: "tc-03:min-gt-max-rejected",
      ok: await expectError(
        () =>
          env.controls.saveControlSettings(actor, {
            stockItemId: item.id,
            minimumStock: "200",
            maximumStock: "100",
          }),
        INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION
      ),
    });
  }

  {
    const env = harness();
    const { item } = await setupItem(env, "SKU-RL", "product-a");
    results.push({
      name: "tc-04:reorder-gt-max-rejected",
      ok: await expectError(
        () =>
          env.controls.saveControlSettings(actor, {
            stockItemId: item.id,
            reorderLevel: "600",
            maximumStock: "500",
          }),
        INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION
      ),
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-HEALTHY", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "100",
      maximumStock: "500",
    });
    await postReceipt(env, actor, location.id, item.id, "150");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-05:healthy-item",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.HEALTHY,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-LOW", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      minimumStock: "90",
      maximumStock: "500",
    });
    await postReceipt(env, actor, location.id, item.id, "80");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-06:low-stock",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.LOW_STOCK,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-RREQ", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "100",
      maximumStock: "500",
    });
    await postReceipt(env, actor, location.id, item.id, "80");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-07:reorder-required",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED,
    });
  }

  {
    const env = harness();
    const { item } = await setupItem(env, "SKU-OOS", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "10",
    });
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-08:out-of-stock",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.OUT_OF_STOCK,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-OVER", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      maximumStock: "50",
    });
    await postReceipt(env, actor, location.id, item.id, "80");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-09:overstock",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.OVERSTOCK,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-MISS", "product-a");
    await postReceipt(env, actor, location.id, item.id, "20");
    const dashboard = await env.controls.evaluateStockControls(actor);
    const row = positionOf(dashboard, item.id);
    results.push({
      name: "tc-10:missing-configuration",
      ok:
        row?.status === INVENTORY_CONTROL_STATUSES.CONFIGURATION_MISSING &&
        Boolean(row.configurationMissing),
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-RSV", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "70",
    });
    await postReceipt(env, actor, location.id, item.id, "100");
    await env.reservation.createReservation(actor, {
      stockItemId: item.id,
      locationId: location.id,
      quantity: "40",
    });
    const dashboard = await env.controls.evaluateStockControls(actor);
    const row = positionOf(dashboard, item.id);
    results.push({
      name: "tc-11:reservation-affects-available",
      ok:
        row?.available === "60" &&
        row.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-REL", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "70",
    });
    await postReceipt(env, actor, location.id, item.id, "100");
    const held = await env.reservation.createReservation(actor, {
      stockItemId: item.id,
      locationId: location.id,
      quantity: "40",
    });
    await env.reservation.releaseReservation(actor, held.id);
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-12:released-reservation-not-held",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.HEALTHY,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-QTY", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "100",
      maximumStock: "200",
      reorderQuantity: "55",
    });
    await postReceipt(env, actor, location.id, item.id, "20");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-13:recommended-uses-configured-qty",
      ok: positionOf(dashboard, item.id)?.recommendedQuantity === "55",
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-MAX", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "30",
      maximumStock: "100",
    });
    await postReceipt(env, actor, location.id, item.id, "20");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-14:recommended-from-maximum",
      ok: positionOf(dashboard, item.id)?.recommendedQuantity === "80",
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-ADV", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "50",
    });
    await postReceipt(env, actor, location.id, item.id, "10");
    const before = await env.foundation.getStockItem(actor, item.id);
    const first = await env.controls.syncReplenishmentAdvice(actor);
    const second = await env.controls.syncReplenishmentAdvice(actor);
    const after = await env.foundation.getStockItem(actor, item.id);
    const open = first.openAdvice.filter((row) => row.stockItemId === item.id);
    results.push({
      name: "tc-15:advice-created-once",
      ok: open.length === 1 && second.openAdvice.filter((row) => row.stockItemId === item.id).length === 1,
    });
    results.push({
      name: "tc-16:advice-does-not-change-stock",
      ok: before.totalOnHand === after.totalOnHand && before.totalOnHand === "10",
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-ACK", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "50",
    });
    await postReceipt(env, actor, location.id, item.id, "10");
    const synced = await env.controls.syncReplenishmentAdvice(actor);
    const adviceId = synced.openAdvice[0]?.id;
    const acknowledged = adviceId
      ? await env.controls.acknowledgeAdvice(actor, adviceId)
      : null;
    const closed = adviceId ? await env.controls.closeAdvice(actor, adviceId) : null;
    results.push({
      name: "tc-17:acknowledge-and-close",
      ok: acknowledged?.status === "ACKNOWLEDGED" && closed?.status === "CLOSED",
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-REEVAL", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "50",
    });
    await postReceipt(env, actor, location.id, item.id, "10");
    await env.controls.syncReplenishmentAdvice(actor);
    await postReceipt(env, actor, location.id, item.id, "80");
    const later = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-18:reevaluation-after-receipt",
      ok: positionOf(later, item.id)?.status === INVENTORY_CONTROL_STATUSES.HEALTHY,
    });
  }

  {
    const env = harness();
    env.store.seedControl({
      code: INVENTORY_OPERATION_CODES.INVENTORY_CONTROL_CONFIG,
      name: "Inventory control settings",
      movementType: "CONTROL",
      requiresApproval: true,
      overReceiptPolicy: "BLOCK",
    });
    const { item } = await setupItem(env, "SKU-APPR", "product-a");
    const pending = await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "25",
    });
    const selfApprove = await expectError(
      () => env.controls.approveControlChange(actor, pending.changeId ?? ""),
      INVENTORY_ERROR_CODES.SELF_APPROVAL
    );
    const approved = await env.controls.approveControlChange(
      ctx("biz-a", "checker-1"),
      pending.changeId ?? ""
    );
    const itemAfter = await env.foundation.getStockItem(actor, item.id);
    results.push({
      name: "tc-19:maker-checker",
      ok:
        pending.status === "APPROVAL_PENDING" &&
        selfApprove &&
        approved.status === "APPROVED" &&
        itemAfter.reorderLevel === "25",
    });
  }

  {
    const env = harness();
    const { item } = await setupItem(env, "SKU-TENANT", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "10",
    });
    const other = await env.controls.evaluateStockControls(ctx("biz-b"));
    results.push({
      name: "tc-20:tenant-isolation",
      ok: other.rows.length === 0 && other.openAdvice.length === 0,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-EXP", "product-b", {
      trackingMode: INVENTORY_TRACKING_MODES.BATCH,
      expiryTrackingEnabled: true,
      allowExpiredFulfilment: false,
    });
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "5",
    });
    await postReceipt(env, actor, location.id, item.id, "10", {
      lotCode: "LOT-OLD",
      expiresOn: "2020-01-01",
    });
    const dashboard = await env.controls.evaluateStockControls(actor);
    const row = positionOf(dashboard, item.id);
    results.push({
      name: "tc-21:expired-not-saleable",
      ok:
        row?.expiredQuantity === "10" &&
        row.saleableAvailable === "0" &&
        row.status === INVENTORY_CONTROL_STATUSES.OUT_OF_STOCK &&
        row.available === "10",
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-SAFE", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "100",
      safetyStock: "30",
    });
    await postReceipt(env, actor, location.id, item.id, "120");
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-22:safety-stock-influences-status",
      ok: positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-LOC", "product-a");
    const branch = await env.foundation.createLocation(actor, {
      code: "BR1",
      name: "Branch A",
      locationTypeCode: "BRANCH_STORE",
    });
    await env.foundation.configureStockItemLocation(actor, {
      stockItemId: item.id,
      locationId: branch.id,
    });
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "100",
    });
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      locationId: branch.id,
      reorderLevel: "30",
    });
    await postReceipt(env, actor, location.id, item.id, "80");
    await postReceipt(env, actor, branch.id, item.id, "40");
    const dashboard = await env.controls.evaluateStockControls(actor);
    const main = dashboard.rows.find((row) => row.locationId === location.id);
    const other = dashboard.rows.find((row) => row.locationId === branch.id);
    results.push({
      name: "tc-23:location-specific-thresholds",
      ok:
        main?.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED &&
        other?.status === INVENTORY_CONTROL_STATUSES.HEALTHY &&
        other?.reorderLevel === "30",
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-IDEM", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "50",
    });
    await postReceipt(env, actor, location.id, item.id, "10");
    await env.controls.syncReplenishmentAdvice(actor, "sync-1");
    await env.controls.syncReplenishmentAdvice(actor, "sync-1");
    results.push({
      name: "tc-24:idempotent-sync",
      ok: env.store.advice.size === 1,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-AUD", "product-a");
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "50",
    });
    await postReceipt(env, actor, location.id, item.id, "10");
    await env.controls.syncReplenishmentAdvice(actor);
    results.push({
      name: "tc-25:audit-trail",
      ok: env.audit.entries.some(
        (row) => row.action === INVENTORY_AUDIT_ACTIONS.REPLENISHMENT_ADVICE_CREATED
      ),
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-SN", "product-b", {
      trackingMode: INVENTORY_TRACKING_MODES.SERIAL,
    });
    await env.controls.saveControlSettings(actor, {
      stockItemId: item.id,
      reorderLevel: "2",
    });
    await postReceipt(env, actor, location.id, item.id, "1", { unitCodes: ["SN-1"] });
    const dashboard = await env.controls.evaluateStockControls(actor);
    results.push({
      name: "tc-26:serial-availability",
      ok:
        positionOf(dashboard, item.id)?.available === "1" &&
        positionOf(dashboard, item.id)?.status === INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED,
    });
  }

  return results;
}

function runExternal(script: string, extraEnv: Record<string, string> = {}): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  return {
    name: `regression:${path.basename(script)}`,
    ok: result.status === 0,
    detail: result.status === 0 ? undefined : (result.stderr || result.stdout).slice(-800),
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
  if (process.env.IP08_SKIP_REGRESSION !== "1") {
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
    regressionResults.push(
      runExternal("scripts/bp008-ip07-batch-expiry-serial-tracking-smoke-validation.ts", {
        IP07_SKIP_REGRESSION: "1",
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
