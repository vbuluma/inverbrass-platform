/**
 * Purpose:
 * Smoke-validate BP-008 / IP-02 Stock Receiving & Opening Balances.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip02-stock-receiving-opening-balances-smoke-validation.ts
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
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { StockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0070_bp008_ip002_stock_receiving_opening_balances.sql",
  "drizzle/0071_bp008_ip002_uom_conversion_inbound_quantities.sql",
  "src/db/schema/inventory-receipt.ts",
  "src/db/schema/inventory-opening-balance.ts",
  "src/modules/inventory/services/stock-receiving-service.ts",
  "src/modules/inventory/services/inventory-inbound-posting.ts",
  "src/app/(authenticated)/(app)/inventory/receive/page.tsx",
  "src/app/(authenticated)/(app)/inventory/opening-balances/page.tsx",
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

function harness(options?: { receivingApproval?: boolean; openingApproval?: boolean }) {
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
    id: "uom-b",
    businessId: "biz-b",
    code: "EA",
    name: "Each",
    symbol: "ea",
    status: "ACTIVE",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_RECEIVING,
    name: "Stock receiving",
    movementType: INVENTORY_MOVEMENT_TYPES.RECEIPT,
    requiresApproval: options?.receivingApproval ?? false,
    overReceiptPolicy: "BLOCK",
  });
  store.seedControl({
    code: INVENTORY_OPERATION_CODES.OPENING_BALANCE,
    name: "Opening balance",
    movementType: INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE,
    requiresApproval: options?.openingApproval ?? false,
    overReceiptPolicy: "BLOCK",
  });
  store.seedSupplier("biz-a", { id: "supplier-1", displayName: "Acme Supplies" });
  const audit = new RecordingInventoryAudit();
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
    numbering: createScriptedDocumentNumberingAdapter(),
    workflow: createInProcessWorkflowAdapter({
      requiresApprovalByOperation: {
        [INVENTORY_OPERATION_CODES.STOCK_RECEIVING]: options?.receivingApproval ?? false,
        [INVENTORY_OPERATION_CODES.OPENING_BALANCE]: options?.openingApproval ?? false,
      },
    }),
    idempotency: store.idempotencyPort,
    locks: createInProcessInventoryLock(),
    audit,
  });
  return { store, audit, foundation, receiving };
}

async function setupStock(foundation: InventoryFoundationService, actor = ctx("biz-a")) {
  const itemA = await foundation.createStockItem(actor, {
    productId: "product-a",
    sku: "SKU-A",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
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
  return { itemA, itemB, location };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkUxLanguage(): SmokeResult[] {
  const files = [
    "src/modules/inventory/components/receive-stock-list.tsx",
    "src/modules/inventory/components/receive-stock-create-form.tsx",
    "src/modules/inventory/components/receive-stock-detail.tsx",
    "src/modules/inventory/components/opening-balance-list.tsx",
    "src/modules/inventory/components/opening-balance-create-form.tsx",
    "src/modules/inventory/components/opening-balance-detail.tsx",
    "src/modules/inventory/components/inventory-workspace.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-02") &&
        !visible.includes("ENG-005") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok:
        visible.includes("Receive stock") &&
        visible.includes("Opening balances") &&
        visible.includes("supplier"),
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
  const receiving = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/stock-receiving-service.ts"),
    "utf8"
  );
  const posting = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-inbound-posting.ts"),
    "utf8"
  );
  const foundation = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-foundation-service.ts"),
    "utf8"
  );
  return [
    {
      name: "arch:no-future-ip-methods",
      ok: scan.futureIpHits.length === 0,
      detail: scan.futureIpHits.join(", "),
    },
    {
      name: "arch:no-ip03-reservation-deduction",
      ok: !receiving.includes("reserveStock(") && !receiving.includes("deductSale("),
    },
    {
      name: "arch:no-ip04-transfer",
      ok: !receiving.includes("transferStock("),
    },
    {
      name: "arch:no-ip05-adjustment-return",
      ok: !receiving.includes("adjustStock(") && !receiving.includes("returnStock("),
    },
    {
      name: "arch:no-supplier-bill-ap",
      ok:
        !receiving.includes("paymentInvoice") &&
        !receiving.includes("supplierBill") &&
        !receiving.includes("accountsPayable") &&
        scan.paymentHits.length === 0,
      detail: scan.paymentHits.join(", "),
    },
    {
      name: "arch:no-gl",
      ok: scan.glHits.length === 0,
      detail: scan.glHits.join(", "),
    },
    {
      name: "arch:ledger-before-balance",
      ok:
        posting.includes("params.movements.insert") &&
        posting.includes("applyInboundOnHand") &&
        posting.indexOf("params.movements.insert") < posting.indexOf("applyInboundOnHand") &&
        !receiving.includes("applyInboundOnHand") &&
        !foundation.includes("applyInboundOnHand"),
    },
    {
      name: "arch:no-client-authoritative-businessId",
      ok: scan.clientBusinessIdHits.length === 0,
      detail: scan.clientBusinessIdHits.join(", "),
    },
    {
      name: "arch:no-receiveStock-shortcut",
      ok: !receiving.includes("receiveStock(") && !foundation.includes("receiveStock("),
    },
    {
      name: "arch:uom-conversion-uses-ip01-factor",
      ok:
        receiving.includes("resolveInboundBaseQuantity") &&
        posting.includes("ledgerQuantity") &&
        posting.includes("enteredQuantity") &&
        !receiving.includes('if (uom === "EA")') &&
        !posting.includes("24 PCS"),
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
  const maker = ctx("biz-a", "maker-1");
  const checker = ctx("biz-a", "checker-1");

  const approved = harness({ receivingApproval: true, openingApproval: true });
  const stock = await setupStock(approved.foundation);

  const receipt = await approved.receiving.createReceipt(maker, {
    locationId: stock.location.id,
    supplierPartyId: "supplier-1",
    supplierReference: "DN-100",
    deliveryNumber: "DEL-9",
  });
  results.push({
    name: "01:create-receiving-transaction",
    ok:
      receipt.status === INVENTORY_DOCUMENT_STATUSES.DRAFT &&
      Boolean(receipt.documentNumber) &&
      receipt.supplierName === "Acme Supplies",
    detail: receipt.documentNumber,
  });

  await approved.receiving.addReceiptLine(maker, receipt.id, {
    stockItemId: stock.itemA.id,
    quantity: "100",
    unitCost: "50",
    lineTotal: "5000",
    currencyCode: "KES",
  });
  const withLines = await approved.receiving.addReceiptLine(maker, receipt.id, {
    stockItemId: stock.itemB.id,
    quantity: "50",
    unitCost: "20",
    lineTotal: "1000",
    currencyCode: "KES",
  });
  results.push({
    name: "02:add-multiple-product-lines",
    ok: withLines.lineCount === 2 && withLines.totalQuantity === "150" && withLines.totalValue === "6000",
    detail: `lines=${withLines.lineCount} qty=${withLines.totalQuantity}`,
  });

  const submitted = await approved.receiving.submitReceipt(maker, receipt.id);
  results.push({
    name: "03:submit-receipt",
    ok: submitted.status === INVENTORY_DOCUMENT_STATUSES.SUBMITTED,
  });

  const postBeforeApproval = await caughtCode(() =>
    approved.receiving.postReceipt(maker, receipt.id)
  );
  results.push({
    name: "04:approval-required-pending",
    ok: postBeforeApproval === INVENTORY_ERROR_CODES.APPROVAL_REQUIRED,
    detail: postBeforeApproval ?? undefined,
  });

  results.push({
    name: "05:maker-cannot-self-approve",
    ok: await expectError(
      () => approved.receiving.approveReceipt(maker, receipt.id),
      INVENTORY_ERROR_CODES.SELF_APPROVAL
    ),
  });

  const approvedReceipt = await approved.receiving.approveReceipt(checker, receipt.id);
  results.push({
    name: "06:checker-can-approve",
    ok:
      approvedReceipt.status === INVENTORY_DOCUMENT_STATUSES.APPROVED &&
      approvedReceipt.approvedBy === "checker-1",
  });

  const movementsBefore = await approved.store.movementPort.countByBusiness("biz-a");
  const posted = await approved.receiving.postReceipt(checker, receipt.id);
  const movementsAfter = await approved.store.movementPort.countByBusiness("biz-a");
  const itemAMovements = await approved.store.movementPort.listByStockItem("biz-a", stock.itemA.id);
  const itemBMovements = await approved.store.movementPort.listByStockItem("biz-a", stock.itemB.id);
  const balanceA = await approved.store.balancePort.findByItemAndLocation(
    "biz-a",
    stock.itemA.id,
    stock.location.id
  );
  const balanceB = await approved.store.balancePort.findByItemAndLocation(
    "biz-a",
    stock.itemB.id,
    stock.location.id
  );
  results.push({
    name: "07:post-receipt",
    ok: posted.status === INVENTORY_DOCUMENT_STATUSES.POSTED && posted.postedAt !== null,
  });
  results.push({
    name: "08:ledger-increases-correctly",
    ok:
      movementsAfter === movementsBefore + 2 &&
      itemAMovements.some((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT && row.quantity === "100") &&
      itemBMovements.some((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT && row.quantity === "50") &&
      balanceA?.onHand === "100" &&
      balanceB?.onHand === "50",
    detail: `movements=${movementsAfter - movementsBefore} onHandA=${balanceA?.onHand}`,
  });

  results.push({
    name: "09:posted-receipt-cannot-be-edited",
    ok: await expectError(
      () =>
        approved.receiving.addReceiptLine(maker, receipt.id, {
          stockItemId: stock.itemA.id,
          quantity: "1",
        }),
      INVENTORY_ERROR_CODES.DOCUMENT_NOT_EDITABLE
    ),
  });

  const duplicatePost = await approved.receiving.postReceipt(checker, receipt.id);
  results.push({
    name: "10:duplicate-post-idempotent",
    ok:
      duplicatePost.status === INVENTORY_DOCUMENT_STATUSES.POSTED &&
      (await approved.store.movementPort.countByBusiness("biz-a")) === movementsAfter,
  });

  results.push({
    name: "11:invalid-quantity-rejected",
    ok: await expectError(async () => {
      const draft = await approved.receiving.createReceipt(maker, { locationId: stock.location.id });
      await approved.receiving.addReceiptLine(maker, draft.id, {
        stockItemId: stock.itemA.id,
        quantity: "0",
      });
    }, INVENTORY_ERROR_CODES.INVALID_QUANTITY),
  });

  results.push({
    name: "12:invalid-product-rejected",
    ok: await expectError(async () => {
      const draft = await approved.receiving.createReceipt(maker, { locationId: stock.location.id });
      await approved.receiving.addReceiptLine(maker, draft.id, {
        stockItemId: "missing-item",
        quantity: "5",
      });
    }, INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND),
  });

  results.push({
    name: "13:invalid-location-rejected",
    ok: await expectError(
      () => approved.receiving.createReceipt(maker, { locationId: "missing-location" }),
      INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND
    ),
  });

  results.push({
    name: "14:receipt-tenant-isolation",
    ok: await expectError(
      () => approved.receiving.getReceipt(ctx("biz-b"), receipt.id),
      INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND
    ),
  });

  const openingHarness = harness({ receivingApproval: false, openingApproval: true });
  const openingStock = await setupStock(openingHarness.foundation);
  const opening = await openingHarness.receiving.createOpeningBalance(maker, {
    locationId: openingStock.location.id,
    notes: "Go-live stock",
  });
  results.push({
    name: "15:create-opening-balance",
    ok:
      opening.status === INVENTORY_DOCUMENT_STATUSES.DRAFT &&
      opening.documentNumber.includes("OPEN") &&
      !opening.documentNumber.includes("GR"),
    detail: opening.documentNumber,
  });

  await openingHarness.receiving.addOpeningBalanceLine(maker, opening.id, {
    stockItemId: openingStock.itemA.id,
    quantity: "500",
    unitCost: "100",
    lineTotal: "50000",
    currencyCode: "KES",
  });
  const openingSubmitted = await openingHarness.receiving.submitOpeningBalance(maker, opening.id);
  results.push({
    name: "16:submit-opening-balance",
    ok: openingSubmitted.status === INVENTORY_DOCUMENT_STATUSES.SUBMITTED && openingSubmitted.lineCount === 1,
  });

  results.push({
    name: "17:opening-maker-checker",
    ok: await expectError(
      () => openingHarness.receiving.approveOpeningBalance(maker, opening.id),
      INVENTORY_ERROR_CODES.SELF_APPROVAL
    ),
  });
  await openingHarness.receiving.approveOpeningBalance(checker, opening.id);
  const openingPosted = await openingHarness.receiving.postOpeningBalance(checker, opening.id);
  const openingMovement = (
    await openingHarness.store.movementPort.listByStockItem("biz-a", openingStock.itemA.id)
  ).find((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE);
  const openingBalance = await openingHarness.store.balancePort.findByItemAndLocation(
    "biz-a",
    openingStock.itemA.id,
    openingStock.location.id
  );
  results.push({
    name: "18:post-opening-balance",
    ok: openingPosted.status === INVENTORY_DOCUMENT_STATUSES.POSTED,
  });
  results.push({
    name: "19:opening-ledger-increases",
    ok: openingMovement?.quantity === "500" && openingBalance?.onHand === "500",
    detail: `type=${openingMovement?.movementType} onHand=${openingBalance?.onHand}`,
  });
  results.push({
    name: "20:opening-distinguished-from-receipt",
    ok:
      openingMovement?.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE &&
      !openingPosted.documentNumber.startsWith("POL-GR"),
  });

  const openingMovements = await openingHarness.store.movementPort.countByBusiness("biz-a");
  await openingHarness.receiving.postOpeningBalance(checker, opening.id);
  results.push({
    name: "21:opening-duplicate-post-idempotent",
    ok: (await openingHarness.store.movementPort.countByBusiness("biz-a")) === openingMovements,
  });
  results.push({
    name: "22:posted-opening-immutable",
    ok: await expectError(
      () =>
        openingHarness.receiving.addOpeningBalanceLine(maker, opening.id, {
          stockItemId: openingStock.itemB.id,
          quantity: "1",
        }),
      INVENTORY_ERROR_CODES.DOCUMENT_NOT_EDITABLE
    ),
  });
  results.push({
    name: "23:opening-tenant-isolation",
    ok: await expectError(
      () => openingHarness.receiving.getOpeningBalance(ctx("biz-b"), opening.id),
      INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND
    ),
  });

  const direct = harness({ receivingApproval: false, openingApproval: false });
  const directStock = await setupStock(direct.foundation);
  const directReceipt = await direct.receiving.createReceipt(maker, {
    locationId: directStock.location.id,
  });
  await direct.receiving.addReceiptLine(maker, directReceipt.id, {
    stockItemId: directStock.itemA.id,
    quantity: "25",
  });
  const directPosted = await direct.receiving.postReceipt(maker, directReceipt.id);
  results.push({
    name: "24:approval-disabled-direct-posting",
    ok: directPosted.status === INVENTORY_DOCUMENT_STATUSES.POSTED,
  });

  const gated = harness({ receivingApproval: true, openingApproval: false });
  const gatedStock = await setupStock(gated.foundation);
  const gatedReceipt = await gated.receiving.createReceipt(maker, {
    locationId: gatedStock.location.id,
  });
  await gated.receiving.addReceiptLine(maker, gatedReceipt.id, {
    stockItemId: gatedStock.itemA.id,
    quantity: "10",
  });
  results.push({
    name: "25:approval-enabled-requires-approval",
    ok: await expectError(
      () => gated.receiving.postReceipt(maker, gatedReceipt.id),
      INVENTORY_ERROR_CODES.APPROVAL_REQUIRED
    ),
  });

  const rejectHarness = harness({ receivingApproval: true });
  const rejectStock = await setupStock(rejectHarness.foundation);
  const rejectedDoc = await rejectHarness.receiving.createReceipt(maker, {
    locationId: rejectStock.location.id,
  });
  await rejectHarness.receiving.addReceiptLine(maker, rejectedDoc.id, {
    stockItemId: rejectStock.itemA.id,
    quantity: "40",
  });
  await rejectHarness.receiving.submitReceipt(maker, rejectedDoc.id);
  await rejectHarness.receiving.rejectReceipt(checker, rejectedDoc.id, "Short delivery");
  const afterReject = await rejectHarness.store.balancePort.findByItemAndLocation(
    "biz-a",
    rejectStock.itemA.id,
    rejectStock.location.id
  );
  results.push({
    name: "26:rejection-does-not-affect-stock",
    ok: afterReject === null && (await rejectHarness.store.movementPort.countByBusiness("biz-a")) === 0,
  });

  const incomplete = harness({ receivingApproval: false });
  const incompleteStock = await setupStock(incomplete.foundation);
  const emptyReceipt = await incomplete.receiving.createReceipt(maker, {
    locationId: incompleteStock.location.id,
  });
  const incompleteCode = await caughtCode(() =>
    incomplete.receiving.postReceipt(maker, emptyReceipt.id)
  );
  results.push({
    name: "27:incomplete-does-not-affect-stock",
    ok:
      incompleteCode === INVENTORY_ERROR_CODES.LINE_REQUIRED &&
      (await incomplete.store.movementPort.countByBusiness("biz-a")) === 0,
    detail: incompleteCode ?? undefined,
  });

  results.push({
    name: "28:no-duplicate-ledger-movements",
    ok:
      itemAMovements.filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT).length === 1 &&
      itemBMovements.filter((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT).length === 1,
  });

  const combined = harness({ receivingApproval: false, openingApproval: false });
  const combinedStock = await setupStock(combined.foundation);
  const combinedOpening = await combined.receiving.createOpeningBalance(maker, {
    locationId: combinedStock.location.id,
  });
  await combined.receiving.addOpeningBalanceLine(maker, combinedOpening.id, {
    stockItemId: combinedStock.itemA.id,
    quantity: "500",
  });
  await combined.receiving.postOpeningBalance(maker, combinedOpening.id);
  const combinedReceipt = await combined.receiving.createReceipt(maker, {
    locationId: combinedStock.location.id,
  });
  await combined.receiving.addReceiptLine(maker, combinedReceipt.id, {
    stockItemId: combinedStock.itemA.id,
    quantity: "100",
  });
  await combined.receiving.postReceipt(maker, combinedReceipt.id);
  const combinedBalance = await combined.store.balancePort.findByItemAndLocation(
    "biz-a",
    combinedStock.itemA.id,
    combinedStock.location.id
  );
  const combinedTypes = (
    await combined.store.movementPort.listByStockItem("biz-a", combinedStock.itemA.id)
  ).map((row) => row.movementType);
  results.push({
    name: "combined:opening-plus-receipt-600",
    ok:
      combinedBalance?.onHand === "600" &&
      combinedTypes.includes(INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE) &&
      combinedTypes.includes(INVENTORY_MOVEMENT_TYPES.RECEIPT),
    detail: `onHand=${combinedBalance?.onHand} types=${combinedTypes.join(",")}`,
  });

  const auditActions = new Set(approved.audit.entries.map((row) => row.action));
  results.push({
    name: "audit:receipt-lifecycle",
    ok:
      auditActions.has(INVENTORY_AUDIT_ACTIONS.RECEIPT_CREATED) &&
      auditActions.has(INVENTORY_AUDIT_ACTIONS.RECEIPT_SUBMITTED) &&
      auditActions.has(INVENTORY_AUDIT_ACTIONS.RECEIPT_APPROVED) &&
      auditActions.has(INVENTORY_AUDIT_ACTIONS.RECEIPT_POSTED),
  });
  const openingAudit = new Set(openingHarness.audit.entries.map((row) => row.action));
  results.push({
    name: "audit:opening-lifecycle",
    ok:
      openingAudit.has(INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_CREATED) &&
      openingAudit.has(INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_SUBMITTED) &&
      openingAudit.has(INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_APPROVED) &&
      openingAudit.has(INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_POSTED),
  });
  const rejectAudit = new Set(rejectHarness.audit.entries.map((row) => row.action));
  results.push({
    name: "audit:receipt-rejected",
    ok: rejectAudit.has(INVENTORY_AUDIT_ACTIONS.RECEIPT_REJECTED),
  });

  const concurrent = harness({ receivingApproval: false });
  const concurrentStock = await setupStock(concurrent.foundation);
  const concurrentReceipt = await concurrent.receiving.createReceipt(maker, {
    locationId: concurrentStock.location.id,
  });
  await concurrent.receiving.addReceiptLine(maker, concurrentReceipt.id, {
    stockItemId: concurrentStock.itemA.id,
    quantity: "100",
  });
  await Promise.all([
    concurrent.receiving.postReceipt(maker, concurrentReceipt.id),
    concurrent.receiving.postReceipt(maker, concurrentReceipt.id),
  ]);
  const concurrentBalance = await concurrent.store.balancePort.findByItemAndLocation(
    "biz-a",
    concurrentStock.itemA.id,
    concurrentStock.location.id
  );
  results.push({
    name: "concurrency:duplicate-post-plus-100-only",
    ok:
      concurrentBalance?.onHand === "100" &&
      (await concurrent.store.movementPort.listByStockItem("biz-a", concurrentStock.itemA.id)).length === 1,
    detail: `onHand=${concurrentBalance?.onHand}`,
  });

  const uomHarness = harness({ receivingApproval: false, openingApproval: false });
  uomHarness.store.seedUnit({
    id: "uom-box",
    businessId: "biz-a",
    code: "BOX",
    name: "Box",
    symbol: "box",
    status: "ACTIVE",
  });
  uomHarness.store.seedUnit({
    id: "uom-carton",
    businessId: "biz-a",
    code: "CARTON",
    name: "Carton",
    symbol: "ctn",
    status: "ACTIVE",
  });
  uomHarness.store.seedProduct(
    productFixture({ id: "product-coke", productCode: "COKE", productName: "Coca-Cola" })
  );
  uomHarness.store.seedProduct(
    productFixture({ id: "product-water", productCode: "WTR", productName: "Water" })
  );
  const uomStock = await setupStock(uomHarness.foundation);
  const boxItem = await uomHarness.foundation.createStockItem(maker, {
    productId: "product-coke",
    sku: "COKE-BOX",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    purchaseUomId: "uom-box",
    conversionFactor: "12",
    stockTrackingEnabled: true,
  });
  const cartonItem = await uomHarness.foundation.createStockItem(maker, {
    productId: "product-water",
    sku: "WTR-CTN",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    purchaseUomId: "uom-carton",
    conversionFactor: "24",
    stockTrackingEnabled: true,
  });
  await uomHarness.foundation.configureStockItemLocation(maker, {
    stockItemId: boxItem.id,
    locationId: uomStock.location.id,
  });
  await uomHarness.foundation.configureStockItemLocation(maker, {
    stockItemId: cartonItem.id,
    locationId: uomStock.location.id,
  });

  const baseUomReceipt = await uomHarness.receiving.createReceipt(maker, {
    locationId: uomStock.location.id,
  });
  await uomHarness.receiving.addReceiptLine(maker, baseUomReceipt.id, {
    stockItemId: uomStock.itemA.id,
    quantity: "10",
    uomId: "uom-ea",
  });
  const postedBase = await uomHarness.receiving.postReceipt(maker, baseUomReceipt.id);
  const baseMovement = (
    await uomHarness.store.movementPort.listByStockItem("biz-a", uomStock.itemA.id)
  ).find((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT);
  results.push({
    name: "TC-UOM-01",
    ok:
      postedBase.lines[0]?.quantity === "10" &&
      postedBase.lines[0]?.baseQuantity === "10" &&
      postedBase.lines[0]?.conversionFactor === "1" &&
      baseMovement?.quantity === "10" &&
      baseMovement?.uomId === "uom-ea",
    detail: `qty=${postedBase.lines[0]?.quantity} base=${postedBase.lines[0]?.baseQuantity}`,
  });

  const purchaseReceipt = await uomHarness.receiving.createReceipt(maker, {
    locationId: uomStock.location.id,
  });
  await uomHarness.receiving.addReceiptLine(maker, purchaseReceipt.id, {
    stockItemId: boxItem.id,
    quantity: "5",
    uomId: "uom-box",
  });
  const postedPurchase = await uomHarness.receiving.postReceipt(maker, purchaseReceipt.id);
  const boxMovement = (
    await uomHarness.store.movementPort.listByStockItem("biz-a", boxItem.id)
  ).find((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT);
  results.push({
    name: "TC-UOM-02",
    ok:
      postedPurchase.lines[0]?.quantity === "5" &&
      postedPurchase.lines[0]?.uomCode === "BOX" &&
      postedPurchase.lines[0]?.baseQuantity === "60" &&
      postedPurchase.lines[0]?.baseUomCode === "EA" &&
      boxMovement?.quantity === "60" &&
      boxMovement?.uomId === "uom-ea",
    detail: `entered=${postedPurchase.lines[0]?.quantity} ledger=${boxMovement?.quantity}`,
  });

  const multiReceipt = await uomHarness.receiving.createReceipt(maker, {
    locationId: uomStock.location.id,
  });
  await uomHarness.receiving.addReceiptLine(maker, multiReceipt.id, {
    stockItemId: boxItem.id,
    quantity: "2",
    uomId: "uom-box",
  });
  await uomHarness.receiving.addReceiptLine(maker, multiReceipt.id, {
    stockItemId: cartonItem.id,
    quantity: "3",
    uomId: "uom-carton",
  });
  const postedMulti = await uomHarness.receiving.postReceipt(maker, multiReceipt.id);
  const cartonMovement = (
    await uomHarness.store.movementPort.listByStockItem("biz-a", cartonItem.id)
  ).find((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.RECEIPT);
  const boxMovements = await uomHarness.store.movementPort.listByStockItem("biz-a", boxItem.id);
  results.push({
    name: "TC-UOM-03",
    ok:
      postedMulti.lines[0]?.baseQuantity === "24" &&
      postedMulti.lines[1]?.baseQuantity === "72" &&
      boxMovements.some((row) => row.quantity === "24") &&
      cartonMovement?.quantity === "72",
    detail: `boxBase=${postedMulti.lines[0]?.baseQuantity} cartonBase=${postedMulti.lines[1]?.baseQuantity}`,
  });

  const missingConversion = harness({ receivingApproval: false });
  missingConversion.store.seedUnit({
    id: "uom-box",
    businessId: "biz-a",
    code: "BOX",
    name: "Box",
    symbol: "box",
    status: "ACTIVE",
  });
  missingConversion.store.seedProduct(
    productFixture({ id: "product-coke", productCode: "COKE", productName: "Coca-Cola" })
  );
  const missingStock = await setupStock(missingConversion.foundation);
  const missingItem = await missingConversion.foundation.createStockItem(maker, {
    productId: "product-coke",
    sku: "COKE-MISS",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    purchaseUomId: "uom-box",
    stockTrackingEnabled: true,
  });
  await missingConversion.foundation.configureStockItemLocation(maker, {
    stockItemId: missingItem.id,
    locationId: missingStock.location.id,
  });
  const missingReceipt = await missingConversion.receiving.createReceipt(maker, {
    locationId: missingStock.location.id,
  });
  results.push({
    name: "TC-UOM-04",
    ok: await expectError(
      () =>
        missingConversion.receiving.addReceiptLine(maker, missingReceipt.id, {
          stockItemId: missingItem.id,
          quantity: "2",
          uomId: "uom-box",
        }),
      INVENTORY_ERROR_CODES.CONVERSION_REQUIRED
    ),
  });

  const invalidConversion = harness({ receivingApproval: false });
  invalidConversion.store.seedUnit({
    id: "uom-box",
    businessId: "biz-a",
    code: "BOX",
    name: "Box",
    symbol: "box",
    status: "ACTIVE",
  });
  invalidConversion.store.seedProduct(
    productFixture({ id: "product-coke", productCode: "COKE", productName: "Coca-Cola" })
  );
  const invalidStock = await setupStock(invalidConversion.foundation);
  const invalidItem = await invalidConversion.foundation.createStockItem(maker, {
    productId: "product-coke",
    sku: "COKE-BAD",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    purchaseUomId: "uom-box",
    conversionFactor: "0",
    stockTrackingEnabled: true,
  });
  await invalidConversion.foundation.configureStockItemLocation(maker, {
    stockItemId: invalidItem.id,
    locationId: invalidStock.location.id,
  });
  const invalidReceipt = await invalidConversion.receiving.createReceipt(maker, {
    locationId: invalidStock.location.id,
  });
  results.push({
    name: "TC-UOM-05",
    ok: await expectError(
      () =>
        invalidConversion.receiving.addReceiptLine(maker, invalidReceipt.id, {
          stockItemId: invalidItem.id,
          quantity: "2",
          uomId: "uom-box",
        }),
      INVENTORY_ERROR_CODES.INVALID_CONVERSION_FACTOR
    ),
  });

  results.push({
    name: "TC-UOM-06",
    ok:
      postedPurchase.lines[0]?.quantity === "5" &&
      postedPurchase.lines[0]?.uomCode === "BOX" &&
      boxMovement?.metadata?.enteredQuantity === "5" &&
      boxMovement?.metadata?.enteredUomId === "uom-box",
  });

  const expectedHarness = harness({ receivingApproval: false });
  const expectedStock = await setupStock(expectedHarness.foundation);
  const expectedReceipt = await expectedHarness.receiving.createReceipt(maker, {
    locationId: expectedStock.location.id,
    supplierReference: "PO-100",
  });
  await expectedHarness.receiving.addReceiptLine(maker, expectedReceipt.id, {
    stockItemId: expectedStock.itemA.id,
    quantity: "80",
    expectedQuantity: "100",
  });
  const postedExpected = await expectedHarness.receiving.postReceipt(maker, expectedReceipt.id);
  results.push({
    name: "TC-EXPECTED-01",
    ok:
      postedExpected.lines[0]?.expectedQuantity === "100" &&
      postedExpected.lines[0]?.receivedQuantity === "80" &&
      postedExpected.lines[0]?.remainingQuantity === "20",
    detail: `expected=${postedExpected.lines[0]?.expectedQuantity} received=${postedExpected.lines[0]?.receivedQuantity} remaining=${postedExpected.lines[0]?.remainingQuantity}`,
  });

  const multiExpected = harness({ receivingApproval: false });
  const multiExpectedStock = await setupStock(multiExpected.foundation);
  const firstPartial = await multiExpected.receiving.createReceipt(maker, {
    locationId: multiExpectedStock.location.id,
    supplierReference: "PO-100",
  });
  await multiExpected.receiving.addReceiptLine(maker, firstPartial.id, {
    stockItemId: multiExpectedStock.itemA.id,
    quantity: "30",
    expectedQuantity: "100",
  });
  await multiExpected.receiving.postReceipt(maker, firstPartial.id);
  const secondPartial = await multiExpected.receiving.createReceipt(maker, {
    locationId: multiExpectedStock.location.id,
    supplierReference: "PO-100",
  });
  await multiExpected.receiving.addReceiptLine(maker, secondPartial.id, {
    stockItemId: multiExpectedStock.itemA.id,
    quantity: "50",
    expectedQuantity: "100",
  });
  const postedSecond = await multiExpected.receiving.postReceipt(maker, secondPartial.id);
  results.push({
    name: "TC-EXPECTED-02",
    ok:
      postedSecond.lines[0]?.expectedQuantity === "100" &&
      postedSecond.lines[0]?.receivedQuantity === "80" &&
      postedSecond.lines[0]?.remainingQuantity === "20",
    detail: `received=${postedSecond.lines[0]?.receivedQuantity} remaining=${postedSecond.lines[0]?.remainingQuantity}`,
  });

  const failedExpected = harness({ receivingApproval: true });
  const failedStock = await setupStock(failedExpected.foundation);
  const failedReceipt = await failedExpected.receiving.createReceipt(maker, {
    locationId: failedStock.location.id,
    supplierReference: "PO-FAIL",
  });
  await failedExpected.receiving.addReceiptLine(maker, failedReceipt.id, {
    stockItemId: failedStock.itemA.id,
    quantity: "80",
    expectedQuantity: "100",
  });
  await failedExpected.receiving.submitReceipt(maker, failedReceipt.id);
  await failedExpected.receiving.rejectReceipt(checker, failedReceipt.id, "Damaged");
  const failedView = await failedExpected.receiving.getReceipt(maker, failedReceipt.id);
  const failedBalance = await failedExpected.store.balancePort.findByItemAndLocation(
    "biz-a",
    failedStock.itemA.id,
    failedStock.location.id
  );
  results.push({
    name: "TC-EXPECTED-03",
    ok:
      failedView.lines[0]?.receivedQuantity === "0" &&
      failedView.lines[0]?.remainingQuantity === "100" &&
      failedBalance === null,
    detail: `received=${failedView.lines[0]?.receivedQuantity} remaining=${failedView.lines[0]?.remainingQuantity}`,
  });

  const overBlock = harness({ receivingApproval: false });
  const overBlockStock = await setupStock(overBlock.foundation);
  const overBlockReceipt = await overBlock.receiving.createReceipt(maker, {
    locationId: overBlockStock.location.id,
  });
  const blocked = await expectError(
    () =>
      overBlock.receiving.addReceiptLine(maker, overBlockReceipt.id, {
        stockItemId: overBlockStock.itemA.id,
        quantity: "120",
        expectedQuantity: "100",
      }),
    INVENTORY_ERROR_CODES.OVER_RECEIPT_NOT_ALLOWED
  );
  const overAllow = harness({ receivingApproval: false });
  overAllow.store.seedControl({
    code: INVENTORY_OPERATION_CODES.STOCK_RECEIVING,
    name: "Stock receiving",
    movementType: INVENTORY_MOVEMENT_TYPES.RECEIPT,
    requiresApproval: false,
    overReceiptPolicy: "ALLOW",
  });
  const overAllowStock = await setupStock(overAllow.foundation);
  const overAllowReceipt = await overAllow.receiving.createReceipt(maker, {
    locationId: overAllowStock.location.id,
  });
  await overAllow.receiving.addReceiptLine(maker, overAllowReceipt.id, {
    stockItemId: overAllowStock.itemA.id,
    quantity: "120",
    expectedQuantity: "100",
  });
  const postedOver = await overAllow.receiving.postReceipt(maker, overAllowReceipt.id);
  results.push({
    name: "TC-EXPECTED-04",
    ok:
      blocked &&
      postedOver.lines[0]?.receivedQuantity === "120" &&
      postedOver.lines[0]?.remainingQuantity === "0",
    detail: `blocked=${blocked} remaining=${postedOver.lines[0]?.remainingQuantity}`,
  });

  const onHandHarness = harness({ receivingApproval: false });
  const onHandStock = await setupStock(onHandHarness.foundation);
  const seedOnHand = await onHandHarness.receiving.createReceipt(maker, {
    locationId: onHandStock.location.id,
  });
  await onHandHarness.receiving.addReceiptLine(maker, seedOnHand.id, {
    stockItemId: onHandStock.itemA.id,
    quantity: "100",
  });
  await onHandHarness.receiving.postReceipt(maker, seedOnHand.id);
  const incrementReceipt = await onHandHarness.receiving.createReceipt(maker, {
    locationId: onHandStock.location.id,
  });
  await onHandHarness.receiving.addReceiptLine(maker, incrementReceipt.id, {
    stockItemId: onHandStock.itemA.id,
    quantity: "80",
  });
  const pendingOnHand = await onHandHarness.receiving.getReceipt(maker, incrementReceipt.id);
  const pendingBalance = await onHandHarness.store.balancePort.findByItemAndLocation(
    "biz-a",
    onHandStock.itemA.id,
    onHandStock.location.id
  );
  results.push({
    name: "TC-ONHAND-02",
    ok: pendingOnHand.lines[0]?.onHand === "100" && pendingBalance?.onHand === "100",
    detail: `pendingOnHand=${pendingOnHand.lines[0]?.onHand}`,
  });
  const postedIncrement = await onHandHarness.receiving.postReceipt(maker, incrementReceipt.id);
  results.push({
    name: "TC-ONHAND-01",
    ok: postedIncrement.lines[0]?.onHand === "180",
    detail: `onHand=${postedIncrement.lines[0]?.onHand}`,
  });
  results.push({
    name: "TC-ONHAND-03",
    ok:
      postedIncrement.lines[0]?.quantity === "80" &&
      postedIncrement.lines[0]?.onHand === "180",
  });

  const openUom = harness({ receivingApproval: false, openingApproval: false });
  openUom.store.seedUnit({
    id: "uom-box",
    businessId: "biz-a",
    code: "BOX",
    name: "Box",
    symbol: "box",
    status: "ACTIVE",
  });
  openUom.store.seedProduct(
    productFixture({ id: "product-coke", productCode: "COKE", productName: "Coca-Cola" })
  );
  const openStock = await setupStock(openUom.foundation);
  const openBoxItem = await openUom.foundation.createStockItem(maker, {
    productId: "product-coke",
    sku: "COKE-OPEN",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    purchaseUomId: "uom-box",
    conversionFactor: "12",
    stockTrackingEnabled: true,
  });
  await openUom.foundation.configureStockItemLocation(maker, {
    stockItemId: openBoxItem.id,
    locationId: openStock.location.id,
  });
  const openingDoc = await openUom.receiving.createOpeningBalance(maker, {
    locationId: openStock.location.id,
  });
  await openUom.receiving.addOpeningBalanceLine(maker, openingDoc.id, {
    stockItemId: openBoxItem.id,
    quantity: "5",
    uomId: "uom-box",
  });
  const postedOpening = await openUom.receiving.postOpeningBalance(maker, openingDoc.id);
  const convertedOpeningMovement = (
    await openUom.store.movementPort.listByStockItem("biz-a", openBoxItem.id)
  ).find((row) => row.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE);
  results.push({
    name: "TC-OPEN-01",
    ok: convertedOpeningMovement?.movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE,
  });
  results.push({
    name: "TC-OPEN-02",
    ok: postedOpening.lines[0]?.onHand === "60" && convertedOpeningMovement?.quantity === "60",
    detail: `onHand=${postedOpening.lines[0]?.onHand}`,
  });
  results.push({
    name: "TC-OPEN-03",
    ok:
      postedOpening.lines[0]?.quantity === "5" &&
      postedOpening.lines[0]?.baseQuantity === "60" &&
      convertedOpeningMovement?.uomId === "uom-ea",
  });
  const openingAuditActions = new Set(openUom.audit.entries.map((row) => row.action));
  results.push({
    name: "TC-OPEN-04",
    ok:
      openingAuditActions.has(INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_CREATED) &&
      openingAuditActions.has(INVENTORY_AUDIT_ACTIONS.OPENING_BALANCE_POSTED),
  });
  const gatedOpening = harness({ receivingApproval: false, openingApproval: true });
  const gatedOpeningStock = await setupStock(gatedOpening.foundation);
  const gatedOpeningDoc = await gatedOpening.receiving.createOpeningBalance(maker, {
    locationId: gatedOpeningStock.location.id,
  });
  await gatedOpening.receiving.addOpeningBalanceLine(maker, gatedOpeningDoc.id, {
    stockItemId: gatedOpeningStock.itemA.id,
    quantity: "10",
  });
  results.push({
    name: "TC-OPEN-05",
    ok: await expectError(
      () => gatedOpening.receiving.postOpeningBalance(maker, gatedOpeningDoc.id),
      INVENTORY_ERROR_CODES.APPROVAL_REQUIRED
    ),
  });

  return results;
}

function runExternal(script: string, extraEnv?: Record<string, string>): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 420_000,
    env: { ...process.env, ...extraEnv },
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
  if (process.env.IP02_SKIP_REGRESSION !== "1") {
    if (existsSync(path.join(ROOT, "scripts/bp008-ip01-inventory-foundation-smoke-validation.ts"))) {
      regressionResults.push(
        runExternal("scripts/bp008-ip01-inventory-foundation-smoke-validation.ts", {
          IP01_SKIP_REGRESSION: "1",
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
