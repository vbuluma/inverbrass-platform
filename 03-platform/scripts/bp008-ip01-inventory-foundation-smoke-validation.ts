/**
 * Purpose:
 * Smoke-validate BP-008 / IP-01 Inventory Foundation & Stock Item Master.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip01-inventory-foundation-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { INVENTORY_MOVEMENT_TYPES } from "@/core/inventory-engine";
import {
  listSourceFiles,
  scanInventoryArchitecture,
} from "@/modules/inventory/architecture-scan";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_ERROR_CODES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0069_bp008_ip001_inventory_foundation.sql",
  "src/db/schema/stock-item.ts",
  "src/db/schema/inventory-location.ts",
  "src/db/schema/inventory-movement.ts",
  "src/db/schema/inventory-balance.ts",
  "src/core/inventory-engine/index.ts",
  "src/modules/inventory/services/inventory-foundation-service.ts",
  "src/modules/inventory/services/stock-item-rules.ts",
  "src/app/(authenticated)/(app)/inventory/page.tsx",
];

function ctx(businessId: string, userId = "maker-1"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function productFixture(
  overrides: Partial<InventoryProductRef> = {}
): InventoryProductRef {
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

function harness() {
  const store = new InMemoryInventoryStore();
  store.seedProduct(productFixture());
  store.seedProduct(
    productFixture({
      id: "product-service",
      productCode: "SVC-C",
      productName: "Service C",
      productTypeCode: "SERVICE",
      sellingPrice: "4000",
      taxCode: "VAT16",
    })
  );
  store.seedProduct(
    productFixture({
      id: "product-b-other",
      businessId: "biz-b",
      productCode: "PRD-B",
      productName: "Product B",
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
    id: "uom-kg",
    businessId: "biz-a",
    code: "KG",
    name: "Kilogram",
    symbol: "kg",
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
  const audit = new RecordingInventoryAudit();
  const service = new InventoryFoundationService({
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
  return { store, audit, service };
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
    "src/modules/inventory/components/stock-item-detail.tsx",
    "src/modules/inventory/components/stock-item-create-form.tsx",
    "src/modules/inventory/components/inventory-location-panel.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-01") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok:
        visible.includes("Stock items") &&
        visible.includes("Locations") &&
        visible.includes("Opening stock"),
    },
  ];
}

function checkNoFutureIps(): SmokeResult {
  const service = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-foundation-service.ts"),
    "utf8"
  );
  return {
    name: "tc-28:no-ip02-plus-behaviour",
    ok:
      !service.includes("receiveStock(") &&
      !service.includes("reserveStock(") &&
      !service.includes("deductSale(") &&
      !service.includes("transferStock(") &&
      !service.includes("adjustStock(") &&
      service.includes("INVENTORY_IP01_MOVEMENT_TYPES") &&
      service.includes("OPENING_STOCK"),
  };
}

function checkArchitecture(): SmokeResult[] {
  const inventoryRoot = path.join(ROOT, "src/modules/inventory");
  const engineRoot = path.join(ROOT, "src/core/inventory-engine");
  const files = [
    ...listSourceFiles(inventoryRoot),
    ...listSourceFiles(engineRoot),
  ].filter((file) => {
    const rel = file.replace(/\\/g, "/");
    return (
      !rel.includes("/services/inventory-memory-store.ts") &&
      !rel.includes("/architecture-scan.ts")
    );
  });
  const scan = scanInventoryArchitecture(files);
  return [
    {
      name: "tc-27:no-provider-http-or-sdk",
      ok: scan.sdkHits.length === 0 && scan.httpHits.length === 0,
      detail: [...scan.sdkHits, ...scan.httpHits].join(", "),
    },
    {
      name: "static:no-future-ip-methods",
      ok: scan.futureIpHits.length === 0,
      detail: scan.futureIpHits.join(", "),
    },
    {
      name: "tc-26:no-payment-invoice-receipt-imports",
      ok: scan.paymentHits.length === 0,
      detail: scan.paymentHits.join(", "),
    },
    {
      name: "static:no-duplicate-product-master",
      ok: scan.productMasterHits.length === 0,
      detail: scan.productMasterHits.join(", "),
    },
    {
      name: "static:no-hard-coded-uom-routing",
      ok: scan.uomRoutingHits.length === 0,
      detail: scan.uomRoutingHits.join(", "),
    },
    {
      name: "static:no-client-authoritative-businessId",
      ok: scan.clientBusinessIdHits.length === 0,
      detail: scan.clientBusinessIdHits.join(", "),
    },
    {
      name: "static:no-gl-logic",
      ok: scan.glHits.length === 0,
      detail: scan.glHits.join(", "),
    },
  ];
}

async function expectError(run: () => Promise<unknown>, code: string): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof InventoryError && error.code === code;
  }
}

async function caughtCode(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    return error instanceof InventoryError ? error.code : error instanceof Error ? error.message : "unknown";
  }
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const { store, audit, service } = harness();
  const actor = ctx("biz-a");

  const created = await service.createStockItem(actor, {
    productId: "product-a",
    sku: "sku-001",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
    reorderLevel: "10",
  });

  results.push({
    name: "tc-01:create-stock-item-from-product",
    ok:
      created.productId === "product-a" &&
      created.sku === "SKU-001" &&
      created.stockTrackingEnabled &&
      created.itemTypeCode === STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    detail: `product=${created.productId} sku=${created.sku}`,
  });

  results.push({
    name: "tc-02:references-existing-product-no-duplicate-master",
    ok:
      created.productId === "product-a" &&
      store.products.size === 3 &&
      store.products.get("product-a")?.productName === "Product A",
  });

  results.push({
    name: "tc-04:base-uom-required-and-valid",
    ok: created.baseUomId === "uom-ea" && created.baseUomCode === "EA",
  });

  store.seedProduct(
    productFixture({
      id: "product-uom-test",
      productCode: "PRD-UOM",
      productName: "Product UOM",
    })
  );
  const invalidUomCode = await caughtCode(() =>
    service.createStockItem(actor, {
      productId: "product-uom-test",
      sku: "SKU-BAD-UOM",
      itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
      baseUomId: "missing-uom",
    })
  );
  results.push({
    name: "tc-05:invalid-uom-fails-closed",
    ok:
      invalidUomCode === INVENTORY_ERROR_CODES.INVALID_UOM ||
      invalidUomCode === INVENTORY_ERROR_CODES.BASE_UOM_REQUIRED,
    detail: invalidUomCode ?? undefined,
  });

  const mainStore = await service.createLocation(actor, {
    code: "MAIN",
    name: "Main Store",
    locationTypeCode: "MAIN_STORE",
  });
  const branchStore = await service.createLocation(actor, {
    code: "BRANCH",
    name: "Branch Store",
    locationTypeCode: "BRANCH_STORE",
  });

  results.push({
    name: "tc-06:create-inventory-location",
    ok: mainStore.code === "MAIN" && mainStore.name === "Main Store" && mainStore.isActive,
  });

  results.push({
    name: "tc-07:multiple-locations-in-one-business",
    ok: mainStore.id !== branchStore.id && (await service.listLocations(actor)).length === 2,
  });

  await service.configureStockItemLocation(actor, {
    stockItemId: created.id,
    locationId: mainStore.id,
  });
  const configured = await service.configureStockItemLocation(actor, {
    stockItemId: created.id,
    locationId: branchStore.id,
    reorderLevelOverride: "5",
  });

  results.push({
    name: "tc-08:stock-item-at-multiple-locations",
    ok: configured.locations.length === 2,
    detail: `locations=${configured.locations.length}`,
  });

  results.push({
    name: "tc-09:location-specific-reorder-override",
    ok:
      configured.locations.find((row) => row.locationId === branchStore.id)?.reorderLevel === "5" &&
      configured.locations.find((row) => row.locationId === mainStore.id)?.reorderLevel === "10",
  });

  const movementsBeforeOpening = await store.movementPort.countByBusiness("biz-a");
  const opened = await service.recordOpeningStock(actor, {
    stockItemId: created.id,
    locationId: mainStore.id,
    quantity: "100",
  });
  const mainBalance = opened.locations.find((row) => row.locationId === mainStore.id);

  results.push({
    name: "tc-10:record-opening-stock",
    ok: Boolean(mainBalance) && (await store.movementPort.countByBusiness("biz-a")) === movementsBeforeOpening + 1,
  });

  results.push({
    name: "tc-11:opening-stock-creates-on-hand",
    ok: mainBalance?.onHand === "100",
    detail: `onHand=${mainBalance?.onHand}`,
  });

  results.push({
    name: "tc-12:on-hand-reserved-available",
    ok:
      mainBalance?.onHand === "100" &&
      mainBalance?.reserved === "0" &&
      mainBalance?.available === "100",
  });

  const movementsBeforeEdit = await store.movementPort.countByBusiness("biz-a");
  await service.updateStockItem(actor, created.id, { barcode: "123456" });
  results.push({
    name: "tc-13:edit-stock-item-does-not-create-movement",
    ok: (await store.movementPort.countByBusiness("biz-a")) === movementsBeforeEdit,
  });

  await service.updateLocation(actor, branchStore.id, { name: "Branch Store East" });
  results.push({
    name: "tc-14:edit-location-does-not-create-movement",
    ok: (await store.movementPort.countByBusiness("biz-a")) === movementsBeforeEdit,
  });

  const deactivatedItem = await service.setStockItemActive(actor, created.id, false);
  const stillPresent = await service.getStockItem(actor, created.id);
  const openingStillThere = await store.movementPort.findOpeningStock(
    "biz-a",
    created.id,
    mainStore.id
  );
  results.push({
    name: "tc-15:deactivate-stock-item-preserves-history",
    ok:
      !deactivatedItem.isActive &&
      stillPresent.id === created.id &&
      openingStillThere?.quantity === "100",
  });

  await service.setStockItemActive(actor, created.id, true);
  const deactivatedLocation = await service.setLocationActive(actor, branchStore.id, false);
  const locationHistory = await store.movementPort.listByLocation("biz-a", mainStore.id);
  results.push({
    name: "tc-16:deactivate-location-preserves-history",
    ok: !deactivatedLocation.isActive && locationHistory.length === 1,
  });

  results.push({
    name: "tc-17:cross-business-stock-item-fails-closed",
    ok: await expectError(
      () => service.getStockItem(ctx("biz-b"), created.id),
      INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND
    ),
  });

  results.push({
    name: "tc-18:cross-business-location-fails-closed",
    ok: await expectError(
      () => service.getLocation(ctx("biz-b"), mainStore.id),
      INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND
    ),
  });

  results.push({
    name: "tc-19:cross-business-opening-stock-fails-closed",
    ok: await expectError(
      () =>
        service.recordOpeningStock(ctx("biz-b"), {
          stockItemId: created.id,
          locationId: mainStore.id,
          quantity: "5",
        }),
      INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND
    ),
  });

  const actions = new Set(audit.entries.map((row) => row.action));
  results.push({
    name: "tc-20:audit-events-via-eng-013",
    ok:
      actions.has(INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_CREATED) &&
      actions.has(INVENTORY_AUDIT_ACTIONS.INVENTORY_LOCATION_CREATED) &&
      actions.has(INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_LOCATION_CONFIGURED) &&
      actions.has(INVENTORY_AUDIT_ACTIONS.OPENING_STOCK_RECORDED) &&
      actions.has(INVENTORY_AUDIT_ACTIONS.STOCK_ITEM_DEACTIVATED) &&
      audit.entries.every((row) => row.businessId === "biz-a" || row.outcome === "SUCCESS"),
    detail: [...actions].join(","),
  });

  results.push({
    name: "tc-21:duplicate-active-stock-config-rejected",
    ok: await expectError(
      () =>
        service.createStockItem(actor, {
          productId: "product-a",
          sku: "SKU-002",
          itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
          baseUomId: "uom-ea",
        }),
      INVENTORY_ERROR_CODES.DUPLICATE_STOCK_ITEM
    ),
  });

  const secondProduct = productFixture({
    id: "product-a2",
    productCode: "PRD-A2",
    productName: "Product A2",
  });
  store.seedProduct(secondProduct);
  results.push({
    name: "tc-22:sku-uniqueness-enforced",
    ok: await expectError(
      () =>
        service.createStockItem(actor, {
          productId: "product-a2",
          sku: "sku-001",
          itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
          baseUomId: "uom-ea",
        }),
      INVENTORY_ERROR_CODES.DUPLICATE_SKU
    ),
  });

  results.push({
    name: "tc-23:opening-stock-cannot-be-overwritten",
    ok: await expectError(
      () =>
        service.recordOpeningStock(actor, {
          stockItemId: created.id,
          locationId: mainStore.id,
          quantity: "50",
        }),
      INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED
    ),
  });

  const commercial = store.products.get("product-a");
  results.push({
    name: "tc-24:commercial-product-price-unchanged",
    ok: commercial?.sellingPrice === "1500",
  });
  results.push({
    name: "tc-25:product-tax-unchanged",
    ok: commercial?.taxCode === "VAT16",
  });

  const serviceStockedCode = await caughtCode(() =>
    service.createStockItem(actor, {
      productId: "product-service",
      sku: "SKU-SVC",
      itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
      baseUomId: "uom-ea",
    })
  );
  const nonStock = await service.createStockItem(actor, {
    productId: "product-service",
    sku: "SKU-NS",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.NON_STOCK_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: false,
  });
  await service.setLocationActive(actor, branchStore.id, true);
  await service.configureStockItemLocation(actor, {
    stockItemId: nonStock.id,
    locationId: branchStore.id,
  });
  const nonStockBalanceCode = await caughtCode(() =>
    service.recordOpeningStock(actor, {
      stockItemId: nonStock.id,
      locationId: branchStore.id,
      quantity: "10",
    })
  );
  results.push({
    name: "tc-03:service-non-stock-cannot-create-balance",
    ok:
      serviceStockedCode === INVENTORY_ERROR_CODES.SERVICE_CANNOT_CREATE_STOCK &&
      (nonStockBalanceCode === INVENTORY_ERROR_CODES.NON_STOCK_CANNOT_CREATE_BALANCE ||
        nonStockBalanceCode === INVENTORY_ERROR_CODES.SERVICE_CANNOT_CREATE_STOCK),
    detail: `stocked=${serviceStockedCode} balance=${nonStockBalanceCode}`,
  });

  results.push({
    name: "boundary:opening-stock-movement-type",
    ok: openingStillThere?.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_STOCK,
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
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
    checkNoFutureIps(),
    ...checkArchitecture(),
    ...(await runCoreCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP01_SKIP_REGRESSION !== "1") {
    for (const script of [
      "scripts/bp003-ip001-product-foundation-smoke-validation.ts",
      "scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts",
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
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
