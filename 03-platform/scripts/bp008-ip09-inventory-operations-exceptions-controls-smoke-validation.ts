/**
 * Purpose:
 * Smoke-validate BP-008 / IP-09 Inventory Operations, Exceptions & Controls.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip09-inventory-operations-exceptions-controls-smoke-validation.ts
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
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_ERROR_CODES,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OPS_INCIDENT_STATUSES,
  INVENTORY_OPS_INCIDENT_TYPES,
  INVENTORY_OPS_RESOLUTION_ACTIONS,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { InventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { StockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import { StockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0077_bp008_ip009_inventory_operations.sql",
  "src/db/schema/inventory-ops-incident.ts",
  "src/db/schema/inventory-ops-incident-type.ts",
  "src/modules/inventory/services/inventory-ops-incident-service.ts",
  "src/modules/inventory/services/inventory-ops-incident-rules.ts",
  "src/app/(authenticated)/(app)/inventory/exceptions/page.tsx",
  "src/app/(authenticated)/(app)/inventory/exceptions/[exceptionId]/page.tsx",
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

function harness(options?: { incidentApproval?: boolean; numberingFailClosed?: boolean }) {
  const store = new InMemoryInventoryStore();
  store.seedProduct(productFixture());
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
      requiresApproval: false,
    },
    {
      code: INVENTORY_OPERATION_CODES.STOCK_ADJUSTMENT,
      name: "Stock adjustment",
      movementType: INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT,
      requiresApproval: false,
    },
    {
      code: INVENTORY_OPERATION_CODES.OPS_INCIDENT_RESOLUTION,
      name: "Exception resolution",
      movementType: "CONTROL",
      requiresApproval: options?.incidentApproval ?? false,
    },
  ]) {
    store.seedControl({
      ...control,
      overReceiptPolicy: "BLOCK",
    });
  }
  const audit = new RecordingInventoryAudit();
  const numbering = createScriptedDocumentNumberingAdapter({
    failClosed: options?.numberingFailClosed,
  });
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
  });
  const adjustments = new StockAdjustmentService({
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
  const incidents = new InventoryOpsIncidentService({
    types: store.opsIncidentTypePort,
    incidents: store.opsIncidentPort,
    events: store.opsIncidentPort,
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    controls: store.controlPort,
    workflow,
    numbering,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    adjustments,
  });
  return { store, audit, foundation, receiving, adjustments, incidents };
}

function attachIncidentRecorder(env: ReturnType<typeof harness>) {
  const receiving = new StockReceivingService({
    stockItems: env.store.stockItemPort,
    locations: env.store.locationPort,
    itemLocations: env.store.itemLocationPort,
    movements: env.store.movementPort,
    balances: env.store.balancePort,
    receipts: env.store.receiptPort,
    receiptLines: env.store.receiptLinePort,
    openings: env.store.openingPort,
    openingLines: env.store.openingLinePort,
    controls: env.store.controlPort,
    suppliers: env.store.supplierPort,
    units: env.store.unitPort,
    numbering: createScriptedDocumentNumberingAdapter(),
    workflow: createInventoryControlWorkflowAdapter(env.store.controlPort),
    idempotency: env.store.idempotencyPort,
    locks: createInProcessInventoryLock(),
    audit: env.audit,
    opsIncidents: env.incidents,
  });
  return { ...env, receiving };
}

async function setupItem(env: ReturnType<typeof harness>, sku = "SKU-A") {
  const actor = ctx("biz-a");
  const item = await env.foundation.createStockItem(actor, {
    productId: "product-a",
    sku,
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
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
  await env.foundation.recordOpeningStock(actor, {
    stockItemId: item.id,
    locationId: location.id,
    quantity: "100",
  });
  return { item, location, actor };
}

async function recordOpen(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  extras: {
    sourceId?: string;
    incidentType?: string;
    severity?: string;
    idempotencyKey?: string;
    stockItemId?: string;
    locationId?: string;
  } = {}
) {
  return env.incidents.recordIncident(actor, {
    incidentType: extras.incidentType ?? INVENTORY_OPS_INCIDENT_TYPES.RECEIVING_MISMATCH,
    severity: extras.severity ?? "HIGH",
    sourceType: "RECEIPT",
    sourceId: extras.sourceId ?? `src-${crypto.randomUUID()}`,
    stockItemId: extras.stockItemId,
    locationId: extras.locationId,
    description: "Received quantity does not match the expected delivery.",
    idempotencyKey: extras.idempotencyKey,
  });
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkUxLanguage(): SmokeResult[] {
  const files = [
    "src/modules/inventory/components/inventory-exception-workspace.tsx",
    "src/modules/inventory/components/inventory-exception-detail.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-09") &&
        !visible.includes("ENG-013") &&
        !visible.includes("ENG-005"),
    },
    {
      name: "ux:operational-language",
      ok: visible.includes("Exceptions") && visible.includes("Investigate"),
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
    path.join(ROOT, "src/modules/inventory/services/inventory-ops-incident-service.ts"),
    "utf8"
  );
  const rules = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-ops-incident-rules.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0077_bp008_ip009_inventory_operations.sql"),
    "utf8"
  );
  const schemaDir = path.join(ROOT, "src/db/schema");
  const schemaFiles = readdirSync(schemaDir);
  const inventoryFiles = listSourceFiles(inventoryRoot);
  const joined = inventoryFiles
    .filter((file) => file.replace(/\\/g, "/").includes("/inventory-ops-incident"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const hasIp10 = existsSync(path.join(ROOT, "scripts/bp008-ip10-inventory-smoke-validation.ts"));
  return [
    {
      name: "arch:no-future-ip-methods",
      ok: scan.futureIpHits.length === 0,
      detail: scan.futureIpHits.join(", "),
    },
    {
      name: "arch:no-ledger-bypass",
      ok:
        !service.includes("applyInboundOnHand") &&
        !service.includes("applyOutboundOnHand") &&
        !service.includes("applyReservationHold"),
    },
    {
      name: "arch:no-second-ledger",
      ok:
        !migration.includes("inventory_balance") &&
        !migration.includes("inventory_movement") &&
        !schemaFiles.includes("inventory-exception-balance.ts"),
    },
    {
      name: "arch:no-purchase-order",
      ok:
        !service.includes("createPurchaseOrder") &&
        !migration.includes("purchase_order") &&
        !joined.includes("@/modules/procurement"),
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
      name: "arch:no-inventory-exception-schema-filename",
      ok: !schemaFiles.includes("inventory-exception.ts"),
    },
    {
      name: "arch:no-raiseInventoryException",
      ok: !joined.includes("raiseInventoryException"),
    },
    {
      name: "arch:no-hard-coded-maker-checker",
      ok: !service.includes("requiresApproval: true") && !rules.includes("required = true"),
    },
    {
      name: "arch:no-hard-coded-threshold",
      ok: !rules.includes("< 10") && !service.includes("if (quantity < 10)"),
    },
    {
      name: "arch:no-ip10",
      ok: !hasIp10 && !joined.includes("IP-10"),
    },
    {
      name: "arch:no-client-authoritative-businessId",
      ok: scan.clientBusinessIdHits.length === 0,
      detail: scan.clientBusinessIdHits.join(", "),
    },
    {
      name: "arch:no-provider-http",
      ok: scan.httpHits.length === 0 && scan.sdkHits.length === 0,
      detail: [...scan.httpHits, ...scan.sdkHits].join(", "),
    },
  ];
}

async function runCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const actor = ctx("biz-a");

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-CREATE");
    const created = await recordOpen(env, actor, {
      stockItemId: item.id,
      locationId: location.id,
      sourceId: "receipt-1",
    });
    results.push({
      name: "ac-001:create-exception",
      ok:
        created.status === INVENTORY_OPS_INCIDENT_STATUSES.OPEN &&
        created.incidentType === INVENTORY_OPS_INCIDENT_TYPES.RECEIVING_MISMATCH &&
        created.severity === "HIGH" &&
        created.businessId === "biz-a" &&
        created.sourceId === "receipt-1",
    });
  }

  {
    const env = harness();
    const first = await recordOpen(env, actor, { sourceId: "receipt-dup" });
    const second = await recordOpen(env, actor, { sourceId: "receipt-dup" });
    results.push({
      name: "ac-002:duplicate-active-source",
      ok: first.id === second.id && env.store.opsIncidents.size === 1,
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor);
    const investigating = await env.incidents.startInvestigation(actor, created.id);
    results.push({
      name: "ac-003:open-to-investigating",
      ok: investigating.status === INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor);
    results.push({
      name: "ac-004:invalid-lifecycle-fails-closed",
      ok: await expectError(
        () => env.incidents.approveResolution(actor, created.id),
        INVENTORY_ERROR_CODES.INCIDENT_NOT_ACTIONABLE
      ),
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-SILENT");
    const created = await recordOpen(env, actor, {
      stockItemId: item.id,
      locationId: location.id,
    });
    const before = await env.store.balancePort.findByItemAndLocation(
      "biz-a",
      item.id,
      location.id
    );
    await env.incidents.requestResolution(actor, {
      incidentId: created.id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CONFIRMED,
      reason: "Reviewed and confirmed. No stock change required.",
    });
    const after = await env.store.balancePort.findByItemAndLocation(
      "biz-a",
      item.id,
      location.id
    );
    results.push({
      name: "ac-005:resolution-does-not-change-stock",
      ok: before?.onHand === after?.onHand && before?.available === after?.available,
    });
  }

  {
    const env = harness();
    const { item, location } = await setupItem(env, "SKU-ADJ");
    const created = await recordOpen(env, actor, {
      incidentType: INVENTORY_OPS_INCIDENT_TYPES.ADJUSTMENT_REVIEW,
      sourceId: "adj-review-1",
      stockItemId: item.id,
      locationId: location.id,
    });
    const resolved = await env.incidents.requestResolution(actor, {
      incidentId: created.id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CORRECTED,
      reason: "Shortage confirmed. Create a controlled adjustment.",
      adjustment: {
        locationId: location.id,
        adjustmentType: INVENTORY_ADJUSTMENT_TYPES.NEGATIVE_ADJUSTMENT,
        reason: "Confirmed shortage after exception review",
        stockItemId: item.id,
        quantity: "2",
      },
    });
    const adjustment = resolved.linkedAdjustmentId
      ? env.store.adjustments.get(resolved.linkedAdjustmentId)
      : null;
    results.push({
      name: "ac-006:resolution-uses-existing-adjustment",
      ok:
        Boolean(resolved.linkedAdjustmentId) &&
        adjustment?.originType === "OPS_INCIDENT" &&
        adjustment.originId === created.id,
    });
  }

  {
    const env = harness({ incidentApproval: false });
    const created = await recordOpen(env, actor, { sourceId: "mc-off" });
    const resolved = await env.incidents.requestResolution(actor, {
      incidentId: created.id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.MANUAL_REVIEW_COMPLETED,
      reason: "Reviewed without approval.",
    });
    results.push({
      name: "ac-007:maker-checker-disabled",
      ok: resolved.status === INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED,
    });
  }

  {
    const env = harness({ incidentApproval: true });
    const created = await recordOpen(env, actor, { sourceId: "mc-on" });
    const pending = await env.incidents.requestResolution(actor, {
      incidentId: created.id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CONFIRMED,
      reason: "Needs checker review.",
    });
    const selfApprove = await expectError(
      () => env.incidents.approveResolution(actor, created.id),
      INVENTORY_ERROR_CODES.SELF_APPROVAL
    );
    const approved = await env.incidents.approveResolution(ctx("biz-a", "checker-1"), created.id);
    results.push({
      name: "ac-007:maker-checker-enabled",
      ok: pending.status === INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING,
    });
    results.push({
      name: "ac-008:self-approval-rejected",
      ok: selfApprove && approved.status === INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED,
    });
  }

  {
    const env = harness({ incidentApproval: true });
    const { item, location } = await setupItem(env, "SKU-REJ");
    const created = await recordOpen(env, actor, {
      sourceId: "reject-res",
      stockItemId: item.id,
      locationId: location.id,
    });
    await env.incidents.requestResolution(actor, {
      incidentId: created.id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CORRECTED,
      reason: "Proposed correction",
      adjustment: {
        locationId: location.id,
        adjustmentType: INVENTORY_ADJUSTMENT_TYPES.NEGATIVE_ADJUSTMENT,
        reason: "Should not post on rejected resolution",
        stockItemId: item.id,
        quantity: "1",
      },
    });
    const before = await env.store.balancePort.findByItemAndLocation(
      "biz-a",
      item.id,
      location.id
    );
    const rejected = await env.incidents.rejectResolution(
      ctx("biz-a", "checker-1"),
      created.id,
      "Not accepted"
    );
    const after = await env.store.balancePort.findByItemAndLocation(
      "biz-a",
      item.id,
      location.id
    );
    results.push({
      name: "ac-009:rejected-resolution-no-stock-change",
      ok:
        rejected.status === INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING &&
        before?.onHand === after?.onHand &&
        env.store.adjustments.size === 0,
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor, { sourceId: "audit-1" });
    await env.incidents.startInvestigation(actor, created.id);
    await env.incidents.requestResolution(actor, {
      incidentId: created.id,
      resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CONFIRMED,
      reason: "Closed after review",
    });
    const actions = env.audit.entries.map((row) => row.action);
    results.push({
      name: "ac-010:exception-state-changes-audited",
      ok:
        actions.includes(INVENTORY_AUDIT_ACTIONS.EXCEPTION_CREATED) &&
        actions.includes(INVENTORY_AUDIT_ACTIONS.EXCEPTION_OPENED) &&
        actions.includes(INVENTORY_AUDIT_ACTIONS.EXCEPTION_INVESTIGATING) &&
        actions.includes(INVENTORY_AUDIT_ACTIONS.EXCEPTION_RESOLVED),
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor, { sourceId: "tenant-1" });
    results.push({
      name: "ac-011:cross-business-access-fails-closed",
      ok: await expectError(
        () => env.incidents.getIncident(ctx("biz-b"), created.id),
        INVENTORY_ERROR_CODES.INCIDENT_NOT_FOUND
      ),
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor, { sourceId: "conc-1" });
    const [first, second] = await Promise.allSettled([
      env.incidents.requestResolution(actor, {
        incidentId: created.id,
        resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CONFIRMED,
        reason: "First resolver",
      }),
      env.incidents.requestResolution(ctx("biz-a", "maker-2"), {
        incidentId: created.id,
        resolutionAction: INVENTORY_OPS_RESOLUTION_ACTIONS.CONFIRMED,
        reason: "Second resolver",
      }),
    ]);
    const resolved = [...env.store.opsIncidents.values()].filter(
      (row) => row.status === INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED
    );
    results.push({
      name: "ac-012:concurrent-resolution-single-effect",
      ok:
        resolved.length === 1 &&
        (first.status === "fulfilled") !== (second.status === "fulfilled"),
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor, { sourceId: "num-1" });
    results.push({
      name: "ac-013:numbering-uses-eng-003b",
      ok: created.incidentNumber.startsWith("POL-IEX-"),
    });
  }

  {
    const env = harness({ numberingFailClosed: true });
    let numberingBlocked = false;
    try {
      await recordOpen(env, actor, { sourceId: "num-fail" });
    } catch {
      numberingBlocked = true;
    }
    results.push({
      name: "ac-013:numbering-fail-closed",
      ok: numberingBlocked,
    });
  }

  {
    const env = harness();
    const first = await recordOpen(env, actor, {
      sourceId: "idem-1",
      idempotencyKey: "idem-key-1",
    });
    const second = await recordOpen(env, actor, {
      sourceId: "idem-other",
      idempotencyKey: "idem-key-1",
    });
    results.push({
      name: "ac-idempotency",
      ok: first.id === second.id,
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor, { sourceId: "close-1" });
    const closed = await env.incidents.closeIncident(actor, created.id, "No longer required");
    const rejected = await recordOpen(env, actor, { sourceId: "rej-1" });
    const afterReject = await env.incidents.rejectIncident(
      actor,
      rejected.id,
      "False positive"
    );
    results.push({
      name: "ac-close-and-reject",
      ok:
        closed.status === INVENTORY_OPS_INCIDENT_STATUSES.CLOSED &&
        afterReject.status === INVENTORY_OPS_INCIDENT_STATUSES.REJECTED,
    });
  }

  {
    const env = attachIncidentRecorder(harness());
    const { location, actor: setupActor } = await setupItem(env, "SKU-HOOK");
    const receipt = await env.receiving.createReceipt(setupActor, { locationId: location.id });
    const item = [...env.store.stockItems.values()].find((row) => row.sku === "SKU-HOOK");
    let hookRecorded = false;
    if (item) {
      try {
        await env.receiving.addReceiptLine(setupActor, receipt.id, {
          stockItemId: item.id,
          quantity: "5",
          expectedQuantity: "1",
        });
      } catch (error) {
        hookRecorded =
          error instanceof InventoryError &&
          error.code === INVENTORY_ERROR_CODES.OVER_RECEIPT_NOT_ALLOWED &&
          [...env.store.opsIncidents.values()].some(
            (row) => row.incidentType === INVENTORY_OPS_INCIDENT_TYPES.RECEIVING_MISMATCH
          );
      }
    }
    results.push({
      name: "hook:receiving-mismatch-records-exception",
      ok: hookRecorded,
    });
  }

  {
    const env = harness();
    results.push({
      name: "ac-017:transfer-processing-unavailable",
      ok: await expectError(
        async () => env.incidents.processTransferAttempt(),
        INVENTORY_ERROR_CODES.TRANSFER_PROCESSING_UNAVAILABLE
      ),
    });
  }

  {
    const transferType = await harness().incidents.listTypes();
    results.push({
      name: "ac-017:transfer-type-catalogue-only",
      ok: transferType.some(
        (row) => row.code === INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION
      ),
    });
  }

  {
    const env = harness();
    const created = await recordOpen(env, actor, {
      incidentType: INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION,
      sourceId: "transfer-record-only",
    });
    results.push({
      name: "ac-017:transfer-exception-record-only",
      ok:
        created.incidentType === INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION &&
        created.status === INVENTORY_OPS_INCIDENT_STATUSES.OPEN,
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
  if (process.env.IP09_SKIP_REGRESSION !== "1") {
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
    regressionResults.push(
      runExternal("scripts/bp008-ip08-inventory-controls-smoke-validation.ts", {
        IP08_SKIP_REGRESSION: "1",
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
