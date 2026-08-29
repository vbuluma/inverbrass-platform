/**
 * Purpose:
 * Smoke-validate BP-008 / IP-06 Stocktake & Inventory Reconciliation.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip06-stocktake-inventory-reconciliation-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
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
  INVENTORY_STOCKTAKE_LINE_STATUSES,
  INVENTORY_STOCKTAKE_SCOPE_TYPES,
  INVENTORY_STOCKTAKE_STATUSES,
  INVENTORY_VARIANCE_CLASSES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { StockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import { StocktakeService } from "@/modules/inventory/services/stocktake-service";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0074_bp008_ip006_stocktake_inventory_reconciliation.sql",
  "src/db/schema/inventory-stocktake.ts",
  "src/modules/inventory/services/stocktake-service.ts",
  "src/modules/inventory/services/inventory-stocktake-rules.ts",
  "src/app/(authenticated)/(app)/inventory/stocktakes/page.tsx",
  "src/app/(authenticated)/(app)/inventory/stocktakes/new/page.tsx",
  "src/app/(authenticated)/(app)/inventory/stocktakes/[stocktakeId]/page.tsx",
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

function harness(options?: { stocktakeApproval?: boolean; allowNegative?: boolean }) {
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
    requiresApproval: false,
    overReceiptPolicy: policy,
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCKTAKE,
    name: "Stocktake",
    movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT,
    requiresApproval: options?.stocktakeApproval ?? false,
    overReceiptPolicy: "BLOCK",
  });
  const audit = new RecordingInventoryAudit();
  const numbering = createScriptedDocumentNumberingAdapter();
  const locks = createInProcessInventoryLock();
  const workflow = createInventoryControlWorkflowAdapter(store.controlPort);
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
  });
  return { store, audit, foundation, adjustment, stocktake };
}

async function setupStock(
  foundation: InventoryFoundationService,
  actor = ctx("biz-a"),
  options?: { opening?: string; salesUom?: boolean; missingConversion?: boolean; secondItem?: boolean }
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
  let itemB: typeof itemA | null = null;
  if (options?.secondItem) {
    itemB = await foundation.createStockItem(actor, {
      productId: "product-b",
      sku: "SKU-B",
      itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
      baseUomId: "uom-ea",
      stockTrackingEnabled: true,
    });
    await foundation.configureStockItemLocation(actor, {
      stockItemId: itemB.id,
      locationId: location.id,
    });
    await foundation.recordOpeningStock(actor, {
      stockItemId: itemB.id,
      locationId: location.id,
      quantity: "40",
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

async function countAndSubmit(
  stocktake: StocktakeService,
  actor: CurrentBusinessContext,
  params: {
    locationId: string;
    stockItemIds?: string[];
    quantities: Record<string, string>;
    uomId?: string;
  }
) {
  const created = await stocktake.createStocktake(actor, {
    locationId: params.locationId,
    scopeType: params.stockItemIds?.length
      ? INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM
      : INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
    stockItemIds: params.stockItemIds,
  });
  const started = await stocktake.startStocktake(actor, created.id);
  let current = started;
  for (const line of started.lines) {
    const quantity = params.quantities[line.stockItemId] ?? params.quantities["*"];
    if (quantity === undefined) {
      continue;
    }
    current = await stocktake.recordCount(actor, started.id, line.id, {
      quantity,
      uomId: params.uomId,
    });
  }
  current = await stocktake.submitStocktake(actor, current.id);
  return current;
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
    "src/modules/inventory/components/stocktake-list.tsx",
    "src/modules/inventory/components/stocktake-create-form.tsx",
    "src/modules/inventory/components/stocktake-detail.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-06") &&
        !visible.includes("ENG-005") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok:
        visible.includes("Stocktakes") &&
        visible.includes("Physical count") &&
        visible.includes("Variance") &&
        visible.includes("Recount") &&
        visible.includes("Submit for approval") &&
        visible.includes("Reconciliation posted"),
    },
  ];
}

function checkArchitecture(): SmokeResult[] {
  const inventoryRoot = path.join(ROOT, "src/modules/inventory");
  const engineRoot = path.join(ROOT, "src/core/inventory-engine");
  const files = [...listSourceFiles(inventoryRoot), ...listSourceFiles(engineRoot)].filter(
    (file) => {
      const rel = file.replace(/\\/g, "/");
      return !rel.includes("/architecture-scan.ts");
    }
  );
  const scan = scanInventoryArchitecture(files);
  const service = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/stocktake-service.ts"),
    "utf8"
  );
  const rules = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-stocktake-rules.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0074_bp008_ip006_stocktake_inventory_reconciliation.sql"),
    "utf8"
  );
  const schemaFiles = listSourceFiles(path.join(ROOT, "src/db/schema")).join("\n");
  return [
    {
      name: "arch:reuses-ip05-adjustments",
      ok:
        service.includes("this.deps.adjustments.createAdjustment") &&
        service.includes("this.deps.adjustments.postAdjustment") &&
        service.includes('originType: "STOCKTAKE"') &&
        !service.includes("adjustStock(") &&
        !service.includes("balances.update") &&
        !service.includes(".onHand ="),
    },
    {
      name: "arch:frozen-snapshot",
      ok:
        service.includes("snapshotQuantity") &&
        !service.includes("snapshotQuantity: converted") &&
        rules.includes("computeVariance"),
    },
    {
      name: "arch:no-duplicate-uom-engine",
      ok: rules.includes("resolvePhysicalCountBaseQuantity") && scan.uomRoutingHits.length === 0,
      detail: scan.uomRoutingHits.join(", "),
    },
    {
      name: "arch:no-duplicate-approval-engine",
      ok:
        service.includes("evaluateOperationApproval") &&
        service.includes("assertDistinctActors") &&
        !service.includes("class StocktakeApproval"),
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
      name: "arch:no-ip07-batch-serial",
      ok:
        !schemaFiles.includes("inventory-batch") &&
        !schemaFiles.includes("inventory-serial") &&
        !migration.includes("serial_number") &&
        !migration.includes("batch_number") &&
        !service.includes("serialNumber") &&
        !service.includes("batchNumber"),
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
      name: "arch:no-partial-cancellation",
      ok:
        !service.includes("partialCancel") &&
        !service.includes("cancelStocktakeLine") &&
        !migration.includes("partial_cancel"),
    },
    {
      name: "arch:no-payment-status-shortcut",
      ok: scan.paymentHits.length === 0 && !service.includes("payment.status"),
      detail: scan.paymentHits.join(", "),
    },
  ];
}

async function runBasicCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const env = harness();
  const maker = ctx("biz-a");
  const stock = await setupStock(env.foundation, maker, { secondItem: true });

  const created = await env.stocktake.createStocktake(maker, {
    locationId: stock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
    idempotencyKey: "stk-create-1",
  });
  const replay = await env.stocktake.createStocktake(maker, {
    locationId: stock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
    idempotencyKey: "stk-create-1",
  });
  results.push({
    name: "tc-01:create-stocktake",
    ok:
      created.status === INVENTORY_STOCKTAKE_STATUSES.DRAFT &&
      created.documentNumber.startsWith("POL-STK-") &&
      replay.id === created.id,
    detail: created.documentNumber,
  });

  const started = await env.stocktake.startStocktake(maker, created.id);
  const lineA = started.lines.find((line) => line.stockItemId === stock.itemA.id);
  results.push({
    name: "tc-02:capture-system-snapshot",
    ok:
      started.status === INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS &&
      started.lineCount === 2 &&
      lineA?.snapshotQuantity === "100" &&
      lineA?.countStatus === INVENTORY_STOCKTAKE_LINE_STATUSES.PENDING,
    detail: `${started.lineCount} lines snapshot=${lineA?.snapshotQuantity}`,
  });

  const counted = await env.stocktake.recordCount(maker, started.id, lineA?.id ?? "", {
    quantity: "108",
  });
  const countedLine = counted.lines.find((line) => line.stockItemId === stock.itemA.id);
  results.push({
    name: "tc-03:positive-variance",
    ok:
      countedLine?.countedBaseQuantity === "108" &&
      countedLine?.varianceQuantity === "8" &&
      countedLine?.varianceClass === INVENTORY_VARIANCE_CLASSES.POSITIVE,
    detail: countedLine?.varianceQuantity ?? undefined,
  });

  const negativeEnv = harness();
  const negativeStock = await setupStock(negativeEnv.foundation);
  const negative = await countAndSubmit(negativeEnv.stocktake, maker, {
    locationId: negativeStock.location.id,
    quantities: { [negativeStock.itemA.id]: "95" },
  });
  const negativeLine = negative.lines[0];
  results.push({
    name: "tc-04:negative-variance",
    ok:
      negativeLine?.snapshotQuantity === "100" &&
      negativeLine?.countedBaseQuantity === "95" &&
      negativeLine?.varianceQuantity === "-5" &&
      negativeLine?.varianceClass === INVENTORY_VARIANCE_CLASSES.NEGATIVE,
    detail: negativeLine?.varianceQuantity ?? undefined,
  });

  const zeroEnv = harness();
  const zeroStock = await setupStock(zeroEnv.foundation);
  const zero = await countAndSubmit(zeroEnv.stocktake, maker, {
    locationId: zeroStock.location.id,
    quantities: { [zeroStock.itemA.id]: "100" },
  });
  results.push({
    name: "tc-05:zero-variance",
    ok:
      zero.lines[0]?.varianceQuantity === "0" &&
      zero.lines[0]?.varianceClass === INVENTORY_VARIANCE_CLASSES.ZERO &&
      zero.varianceCount === 0,
  });

  const itemScope = await env.stocktake.createStocktake(maker, {
    locationId: stock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.ITEM,
    stockItemIds: [stock.itemA.id],
  });
  const itemStarted = await env.stocktake.startStocktake(maker, itemScope.id);
  results.push({
    name: "tc-06:item-scope",
    ok: itemStarted.lineCount === 1 && itemStarted.lines[0]?.stockItemId === stock.itemA.id,
  });

  const group = await env.stocktake.createStocktake(maker, {
    locationId: stock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.GROUP,
    scopeGroup: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
  });
  const groupStarted = await env.stocktake.startStocktake(maker, group.id);
  results.push({
    name: "tc-07:group-scope",
    ok: groupStarted.lineCount === 2,
    detail: String(groupStarted.lineCount),
  });

  return results;
}

async function runRecountCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const env = harness();
  const maker = ctx("biz-a");
  const stock = await setupStock(env.foundation);
  const created = await env.stocktake.createStocktake(maker, {
    locationId: stock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const started = await env.stocktake.startStocktake(maker, created.id);
  const lineId = started.lines[0]?.id ?? "";
  await env.stocktake.recordCount(maker, started.id, lineId, { quantity: "95" });
  const recounted = await env.stocktake.recountLine(maker, started.id, lineId, { quantity: "97" });
  const line = recounted.lines[0];
  results.push({
    name: "tc-08:recount-before-posting",
    ok:
      line?.countedBaseQuantity === "97" &&
      line?.varianceQuantity === "-3" &&
      line?.countStatus === INVENTORY_STOCKTAKE_LINE_STATUSES.RECOUNTED &&
      line?.counts.length === 2 &&
      line?.counts[0]?.baseQuantity === "95" &&
      line?.counts[1]?.isRecount === true,
    detail: line?.counts.map((row) => row.baseQuantity).join(","),
  });

  const submitted = await env.stocktake.submitStocktake(maker, recounted.id);
  const posted = await env.stocktake.postStocktake(maker, submitted.id);
  const after = await env.store.balancePort.findByItemAndLocation(
    maker.businessId,
    stock.itemA.id,
    stock.location.id
  );
  const movements = await env.store.movementPort.listByStockItem(maker.businessId, stock.itemA.id);
  const adjustmentMoves = movements.filter(
    (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.NEGATIVE_ADJUSTMENT
  );
  results.push({
    name: "tc-09:final-count-used-for-reconciliation",
    ok: posted.status === INVENTORY_STOCKTAKE_STATUSES.POSTED && after?.onHand === "97",
    detail: after?.onHand,
  });
  results.push({
    name: "tc-10:recount-history-preserved",
    ok: posted.lines[0]?.counts.length === 2 && posted.lines[0]?.counts[0]?.baseQuantity === "95",
  });
  const recountPosted = await caughtCode(() =>
    env.stocktake.recountLine(maker, posted.id, lineId, { quantity: "99" })
  );
  results.push({
    name: "tc-11:recount-blocked-after-posting",
    ok: recountPosted === INVENTORY_ERROR_CODES.STOCKTAKE_NOT_COUNTABLE,
    detail: recountPosted ?? undefined,
  });
  results.push({
    name: "tc-12:historical-opening-unchanged",
    ok:
      movements.filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_STOCK).length ===
        1 &&
      adjustmentMoves.length === 1 &&
      adjustmentMoves[0]?.quantity === "3",
  });
  return results;
}

async function runReconciliationCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const positiveEnv = harness();
  const maker = ctx("biz-a");
  const positiveStock = await setupStock(positiveEnv.foundation);
  const positive = await countAndSubmit(positiveEnv.stocktake, maker, {
    locationId: positiveStock.location.id,
    quantities: { [positiveStock.itemA.id]: "108" },
  });
  const postedPositive = await positiveEnv.stocktake.postStocktake(maker, positive.id);
  const afterPositive = await positiveEnv.store.balancePort.findByItemAndLocation(
    maker.businessId,
    positiveStock.itemA.id,
    positiveStock.location.id
  );
  const positiveMoves = (
    await positiveEnv.store.movementPort.listByStockItem(maker.businessId, positiveStock.itemA.id)
  ).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT);
  results.push({
    name: "tc-13:positive-variance-ledger-movement",
    ok:
      postedPositive.status === INVENTORY_STOCKTAKE_STATUSES.POSTED &&
      afterPositive?.onHand === "108" &&
      positiveMoves.length === 1 &&
      positiveMoves[0]?.quantity === "8" &&
      String(positiveMoves[0]?.metadata?.originType ?? "") === "STOCKTAKE" &&
      Boolean(postedPositive.lines[0]?.adjustmentId),
    detail: afterPositive?.onHand,
  });

  const negativeEnv = harness();
  const negativeStock = await setupStock(negativeEnv.foundation);
  const negative = await countAndSubmit(negativeEnv.stocktake, maker, {
    locationId: negativeStock.location.id,
    quantities: { [negativeStock.itemA.id]: "95" },
  });
  const postedNegative = await negativeEnv.stocktake.postStocktake(maker, negative.id);
  const afterNegative = await negativeEnv.store.balancePort.findByItemAndLocation(
    maker.businessId,
    negativeStock.itemA.id,
    negativeStock.location.id
  );
  const negativeMoves = (
    await negativeEnv.store.movementPort.listByStockItem(maker.businessId, negativeStock.itemA.id)
  ).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.NEGATIVE_ADJUSTMENT);
  results.push({
    name: "tc-14:negative-variance-ledger-movement",
    ok:
      postedNegative.status === INVENTORY_STOCKTAKE_STATUSES.POSTED &&
      afterNegative?.onHand === "95" &&
      negativeMoves.length === 1 &&
      negativeMoves[0]?.quantity === "5",
    detail: afterNegative?.onHand,
  });

  const zeroEnv = harness();
  const zeroStock = await setupStock(zeroEnv.foundation);
  const zero = await countAndSubmit(zeroEnv.stocktake, maker, {
    locationId: zeroStock.location.id,
    quantities: { [zeroStock.itemA.id]: "100" },
  });
  const postedZero = await zeroEnv.stocktake.postStocktake(maker, zero.id);
  const afterZero = await zeroEnv.store.balancePort.findByItemAndLocation(
    maker.businessId,
    zeroStock.itemA.id,
    zeroStock.location.id
  );
  const zeroMoves = await zeroEnv.store.movementPort.listByStockItem(
    maker.businessId,
    zeroStock.itemA.id
  );
  results.push({
    name: "tc-15:zero-variance-no-adjustment",
    ok:
      postedZero.status === INVENTORY_STOCKTAKE_STATUSES.POSTED &&
      afterZero?.onHand === "100" &&
      zeroMoves.length === 1 &&
      !postedZero.lines[0]?.adjustmentId,
    detail: `movements=${zeroMoves.length}`,
  });

  const replay = await zeroEnv.stocktake.postStocktake(maker, postedZero.id);
  const replayMoves = await zeroEnv.store.movementPort.listByStockItem(
    maker.businessId,
    zeroStock.itemA.id
  );
  results.push({
    name: "tc-16:duplicate-post-idempotent",
    ok: replay.id === postedZero.id && replayMoves.length === 1,
  });

  return results;
}

async function runLifecycleCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const maker = ctx("biz-a");
  const checker = ctx("biz-a", "checker-1");

  const draftEnv = harness();
  const draftStock = await setupStock(draftEnv.foundation);
  const draft = await draftEnv.stocktake.createStocktake(maker, {
    locationId: draftStock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const started = await draftEnv.stocktake.startStocktake(maker, draft.id);
  results.push({
    name: "tc-17:draft-to-in-progress",
    ok:
      draft.status === INVENTORY_STOCKTAKE_STATUSES.DRAFT &&
      started.status === INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS,
  });

  const counted = await draftEnv.stocktake.recordCount(maker, started.id, started.lines[0]?.id ?? "", {
    quantity: "100",
  });
  const submitted = await draftEnv.stocktake.submitStocktake(maker, counted.id);
  results.push({
    name: "tc-18:in-progress-to-submitted",
    ok: submitted.status === INVENTORY_STOCKTAKE_STATUSES.SUBMITTED && !submitted.approvalRequired,
  });

  const approvalEnv = harness({ stocktakeApproval: true });
  const approvalStock = await setupStock(approvalEnv.foundation);
  const pending = await countAndSubmit(approvalEnv.stocktake, maker, {
    locationId: approvalStock.location.id,
    quantities: { [approvalStock.itemA.id]: "101" },
  });
  results.push({
    name: "tc-19:approval-required-pending",
    ok:
      pending.status === INVENTORY_STOCKTAKE_STATUSES.APPROVAL_PENDING &&
      pending.approvalRequired === true,
  });
  const selfApprove = await caughtCode(() =>
    approvalEnv.stocktake.approveStocktake(maker, pending.id)
  );
  results.push({
    name: "tc-20:maker-cannot-self-approve",
    ok: selfApprove === INVENTORY_ERROR_CODES.SELF_APPROVAL,
    detail: selfApprove ?? undefined,
  });
  const approved = await approvalEnv.stocktake.approveStocktake(checker, pending.id);
  results.push({
    name: "tc-21:checker-can-approve",
    ok: approved.status === INVENTORY_STOCKTAKE_STATUSES.APPROVED,
  });

  const rejectEnv = harness({ stocktakeApproval: true });
  const rejectStock = await setupStock(rejectEnv.foundation);
  const toReject = await countAndSubmit(rejectEnv.stocktake, maker, {
    locationId: rejectStock.location.id,
    quantities: { [rejectStock.itemA.id]: "99" },
  });
  const rejected = await rejectEnv.stocktake.rejectStocktake(checker, toReject.id, "Recount needed");
  const recountAfterReject = await rejectEnv.stocktake.recountLine(
    maker,
    rejected.id,
    rejected.lines[0]?.id ?? "",
    { quantity: "100" }
  );
  results.push({
    name: "tc-22:rejection-returns-to-in-progress",
    ok:
      rejected.status === INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS &&
      rejected.rejectionReason === "Recount needed" &&
      recountAfterReject.lines[0]?.countedBaseQuantity === "100",
  });

  const cancelEnv = harness();
  const cancelStock = await setupStock(cancelEnv.foundation);
  const cancellable = await cancelEnv.stocktake.createStocktake(maker, {
    locationId: cancelStock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const cancelled = await cancelEnv.stocktake.cancelStocktake(maker, cancellable.id);
  results.push({
    name: "tc-23:pre-post-cancellation",
    ok: cancelled.status === INVENTORY_STOCKTAKE_STATUSES.CANCELLED,
  });

  const postedEnv = harness();
  const postedStock = await setupStock(postedEnv.foundation);
  const ready = await countAndSubmit(postedEnv.stocktake, maker, {
    locationId: postedStock.location.id,
    quantities: { [postedStock.itemA.id]: "100" },
  });
  const posted = await postedEnv.stocktake.postStocktake(maker, ready.id);
  const cancelPosted = await caughtCode(() =>
    postedEnv.stocktake.cancelStocktake(maker, posted.id)
  );
  results.push({
    name: "tc-24:posted-cannot-cancel",
    ok: cancelPosted === INVENTORY_ERROR_CODES.DOCUMENT_NOT_CANCELLABLE,
    detail: cancelPosted ?? undefined,
  });
  const completed = await postedEnv.stocktake.completeStocktake(maker, posted.id);
  const cancelCompleted = await caughtCode(() =>
    postedEnv.stocktake.cancelStocktake(maker, completed.id)
  );
  results.push({
    name: "tc-25:completed-cannot-cancel",
    ok:
      completed.status === INVENTORY_STOCKTAKE_STATUSES.COMPLETED &&
      cancelCompleted === INVENTORY_ERROR_CODES.DOCUMENT_NOT_CANCELLABLE,
  });

  const illegalEnv = harness();
  const illegalStock = await setupStock(illegalEnv.foundation);
  const illegalDraft = await illegalEnv.stocktake.createStocktake(maker, {
    locationId: illegalStock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const illegalSubmit = await caughtCode(() =>
    illegalEnv.stocktake.submitStocktake(maker, illegalDraft.id)
  );
  const illegalPost = await caughtCode(() =>
    illegalEnv.stocktake.postStocktake(maker, illegalDraft.id)
  );
  results.push({
    name: "tc-26:invalid-lifecycle-fails",
    ok:
      illegalSubmit === INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE &&
      illegalPost === INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE,
    detail: `${illegalSubmit}/${illegalPost}`,
  });

  const editPosted = await caughtCode(() =>
    postedEnv.stocktake.recordCount(maker, posted.id, posted.lines[0]?.id ?? "", { quantity: "1" })
  );
  results.push({
    name: "tc-27:posted-cannot-edit-count",
    ok: editPosted === INVENTORY_ERROR_CODES.STOCKTAKE_NOT_COUNTABLE,
    detail: editPosted ?? undefined,
  });

  return results;
}

async function runSafetyCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const maker = ctx("biz-a");
  const other = ctx("biz-b");

  const concurrentEnv = harness();
  const concurrentStock = await setupStock(concurrentEnv.foundation);
  const ready = await countAndSubmit(concurrentEnv.stocktake, maker, {
    locationId: concurrentStock.location.id,
    quantities: { [concurrentStock.itemA.id]: "108" },
  });
  const settled = await Promise.allSettled([
    concurrentEnv.stocktake.postStocktake(maker, ready.id),
    concurrentEnv.stocktake.postStocktake(maker, ready.id),
  ]);
  const after = await concurrentEnv.store.balancePort.findByItemAndLocation(
    maker.businessId,
    concurrentStock.itemA.id,
    concurrentStock.location.id
  );
  const moves = (
    await concurrentEnv.store.movementPort.listByStockItem(
      maker.businessId,
      concurrentStock.itemA.id
    )
  ).filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT);
  results.push({
    name: "tc-28:concurrent-post-no-duplicate-adjustment",
    ok:
      settled.every((row) => row.status === "fulfilled") &&
      after?.onHand === "108" &&
      moves.length === 1,
    detail: `onHand=${after?.onHand} moves=${moves.length}`,
  });

  const tenantEnv = harness();
  const tenantStock = await setupStock(tenantEnv.foundation);
  const created = await tenantEnv.stocktake.createStocktake(maker, {
    locationId: tenantStock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const lookup = await caughtCode(() => tenantEnv.stocktake.getStocktake(other, created.id));
  const post = await caughtCode(() => tenantEnv.stocktake.postStocktake(other, created.id));
  results.push({
    name: "tc-29:cross-business-read-blocked",
    ok: lookup === INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND,
    detail: lookup ?? undefined,
  });
  results.push({
    name: "tc-30:cross-business-post-blocked",
    ok: post === INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND,
    detail: post ?? undefined,
  });

  const basisEnv = harness();
  const basisStock = await setupStock(basisEnv.foundation);
  const basisReady = await countAndSubmit(basisEnv.stocktake, maker, {
    locationId: basisStock.location.id,
    quantities: { [basisStock.itemA.id]: "108" },
  });
  await basisEnv.adjustment.createAdjustment(maker, {
    locationId: basisStock.location.id,
    adjustmentType: "POSITIVE_ADJUSTMENT",
    reason: "Found stock",
    stockItemId: basisStock.itemA.id,
    quantity: "2",
  }).then((row) => basisEnv.adjustment.postAdjustment(maker, row.id));
  const basisChanged = await caughtCode(() =>
    basisEnv.stocktake.postStocktake(maker, basisReady.id)
  );
  results.push({
    name: "tc-31:basis-changed-fails-closed",
    ok: basisChanged === INVENTORY_ERROR_CODES.STOCKTAKE_BASIS_CHANGED,
    detail: basisChanged ?? undefined,
  });

  const uomEnv = harness();
  const uomStock = await setupStock(uomEnv.foundation, maker, { salesUom: true });
  const createdUom = await uomEnv.stocktake.createStocktake(maker, {
    locationId: uomStock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const startedUom = await uomEnv.stocktake.startStocktake(maker, createdUom.id);
  const countedBox = await uomEnv.stocktake.recordCount(
    maker,
    startedUom.id,
    startedUom.lines[0]?.id ?? "",
    { quantity: "1", uomId: "uom-box" }
  );
  results.push({
    name: "tc-32:counting-uom-uses-configured-factor",
    ok:
      countedBox.lines[0]?.countedBaseQuantity === "12" &&
      countedBox.lines[0]?.varianceQuantity === "-88",
    detail: countedBox.lines[0]?.countedBaseQuantity ?? undefined,
  });

  const missingEnv = harness();
  const missingStock = await setupStock(missingEnv.foundation, maker, {
    salesUom: true,
    missingConversion: true,
  });
  const missingCreated = await missingEnv.stocktake.createStocktake(maker, {
    locationId: missingStock.location.id,
    scopeType: INVENTORY_STOCKTAKE_SCOPE_TYPES.LOCATION,
  });
  const missingStarted = await missingEnv.stocktake.startStocktake(maker, missingCreated.id);
  const missingConversion = await caughtCode(() =>
    missingEnv.stocktake.recordCount(maker, missingStarted.id, missingStarted.lines[0]?.id ?? "", {
      quantity: "1",
      uomId: "uom-box",
    })
  );
  results.push({
    name: "tc-33:missing-conversion-fails-closed",
    ok: missingConversion === INVENTORY_ERROR_CODES.CONVERSION_REQUIRED,
    detail: missingConversion ?? undefined,
  });

  const auditEnv = harness({ stocktakeApproval: true });
  const auditStock = await setupStock(auditEnv.foundation);
  const auditDoc = await countAndSubmit(auditEnv.stocktake, maker, {
    locationId: auditStock.location.id,
    quantities: { [auditStock.itemA.id]: "101" },
  });
  await auditEnv.stocktake.approveStocktake(ctx("biz-a", "checker-1"), auditDoc.id);
  await auditEnv.stocktake.postStocktake(maker, auditDoc.id);
  await auditEnv.stocktake.completeStocktake(maker, auditDoc.id);
  const actions = auditEnv.audit.entries.map((row) => row.action);
  results.push({
    name: "tc-34:audit-trail",
    ok:
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_CREATED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_STARTED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_COUNT_RECORDED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_APPROVAL_REQUESTED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_APPROVED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_RECONCILIATION_POSTED) &&
      actions.includes(INVENTORY_AUDIT_ACTIONS.STOCKTAKE_COMPLETED),
    detail: actions.filter((action) => action.startsWith("STOCKTAKE_")).join(","),
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
    ...(await runBasicCases()),
    ...(await runRecountCases()),
    ...(await runReconciliationCases()),
    ...(await runLifecycleCases()),
    ...(await runSafetyCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP06_SKIP_REGRESSION !== "1") {
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
