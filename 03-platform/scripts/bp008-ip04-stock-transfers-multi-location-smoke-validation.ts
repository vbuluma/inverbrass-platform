/**
 * Purpose:
 * Smoke-validate BP-008 / IP-04 Stock Transfers & Multi-Location.
 *
 * Usage:
 *   npx tsx scripts/bp008-ip04-stock-transfers-multi-location-smoke-validation.ts
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
  INVENTORY_OPS_INCIDENT_TYPES,
  INVENTORY_RESERVATION_STATUSES,
  INVENTORY_TRACKING_MODES,
  INVENTORY_TRANSFER_STATUSES,
  InventoryError,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory";
import { createBusinessScopedLocationAccess } from "@/modules/inventory/adapters/inventory-location-access-adapter";
import { RecordingInventoryAudit } from "@/modules/inventory/services/inventory-audit-helper";
import { InventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import { InMemoryInventoryStore } from "@/modules/inventory/services/inventory-memory-store";
import { InventoryOpsIncidentService } from "@/modules/inventory/services/inventory-ops-incident-service";
import { TraceabilityService } from "@/modules/inventory/services/inventory-traceability-service";
import { StockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import { StockTransferService } from "@/modules/inventory/services/stock-transfer-service";
import type { InventoryProductRef } from "@/modules/inventory/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0078_bp008_ip004_stock_transfers.sql",
  "src/db/schema/inventory-transfer.ts",
  "src/modules/inventory/services/stock-transfer-service.ts",
  "src/modules/inventory/services/inventory-transfer-posting.ts",
  "src/modules/inventory/services/inventory-transfer-rules.ts",
  "src/app/(authenticated)/(app)/inventory/transfers/page.tsx",
  "src/app/(authenticated)/(app)/inventory/transfers/new/page.tsx",
  "src/app/(authenticated)/(app)/inventory/transfers/[transferId]/page.tsx",
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

function harness(options?: { approval?: boolean }) {
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
  for (const control of [
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
      code: INVENTORY_OPERATION_CODES.STOCK_TRANSFER,
      name: "Stock transfer",
      movementType: INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH,
    },
    {
      code: INVENTORY_OPERATION_CODES.OPS_INCIDENT_RESOLUTION,
      name: "Exception resolution",
      movementType: "CONTROL",
    },
  ]) {
    store.seedControl({
      ...control,
      requiresApproval:
        control.code === INVENTORY_OPERATION_CODES.STOCK_TRANSFER
          ? options?.approval ?? false
          : false,
      overReceiptPolicy: "BLOCK",
    });
  }
  const audit = new RecordingInventoryAudit();
  const numbering = createScriptedDocumentNumberingAdapter();
  const locks = createInProcessInventoryLock();
  const workflow = createInProcessWorkflowAdapter({
    requiresApprovalByOperation: {
      [INVENTORY_OPERATION_CODES.STOCK_TRANSFER]: options?.approval ?? false,
    },
  });
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
  });
  const transfer = new StockTransferService({
    stockItems: store.stockItemPort,
    locations: store.locationPort,
    itemLocations: store.itemLocationPort,
    movements: store.movementPort,
    balances: store.balancePort,
    transfers: store.transferPort,
    transferLines: store.transferLinePort,
    controls: store.controlPort,
    units: store.unitPort,
    numbering,
    workflow,
    idempotency: store.idempotencyPort,
    locks,
    audit,
    locationAccess: createBusinessScopedLocationAccess(store.locationPort),
    traceability,
    opsIncidents: incidents,
  });
  return { store, audit, foundation, reservation, transfer, incidents, traceability };
}

async function setupLocations(
  foundation: InventoryFoundationService,
  actor = ctx("biz-a"),
  options?: {
    opening?: string;
    conversion?: boolean;
    trackingMode?: string;
    lotCode?: string;
    unitCodes?: string[];
    sku?: string;
  }
) {
  const item = await foundation.createStockItem(actor, {
    productId: "product-a",
    sku: options?.sku ?? "SKU-A",
    itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
    baseUomId: "uom-ea",
    stockTrackingEnabled: true,
    trackingMode: options?.trackingMode ?? INVENTORY_TRACKING_MODES.NONE,
    expiryTrackingEnabled: false,
    ...(options?.conversion
      ? {
          purchaseUomId: "uom-box",
          conversionFactor: "12",
        }
      : {}),
  });
  const source = await foundation.createLocation(actor, {
    code: "NBO",
    name: "Nairobi Warehouse",
    locationTypeCode: "WAREHOUSE",
  });
  const destination = await foundation.createLocation(actor, {
    code: "WLD",
    name: "Westlands Store",
    locationTypeCode: "BRANCH_STORE",
  });
  await foundation.configureStockItemLocation(actor, {
    stockItemId: item.id,
    locationId: source.id,
  });
  await foundation.configureStockItemLocation(actor, {
    stockItemId: item.id,
    locationId: destination.id,
  });
  if (options?.opening !== "0") {
    await foundation.recordOpeningStock(actor, {
      stockItemId: item.id,
      locationId: source.id,
      quantity: options?.opening ?? "100",
      lotCode: options?.lotCode,
      unitCodes: options?.unitCodes,
    });
  }
  return { item, source, destination };
}

async function requestTransfer(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  params: {
    sourceLocationId: string;
    destinationLocationId: string;
    stockItemId: string;
    quantity: string;
    uomId?: string;
    idempotencyKey?: string;
    lotCode?: string;
    unitCodes?: string[];
  }
) {
  const created = await env.transfer.createTransfer(actor, {
    sourceLocationId: params.sourceLocationId,
    destinationLocationId: params.destinationLocationId,
    idempotencyKey: params.idempotencyKey,
    lines: [
      {
        stockItemId: params.stockItemId,
        quantity: params.quantity,
        uomId: params.uomId,
        lotCode: params.lotCode,
        unitCodes: params.unitCodes,
      },
    ],
  });
  return env.transfer.requestTransfer(actor, created.id);
}

function balanceOf(
  store: InMemoryInventoryStore,
  businessId: string,
  stockItemId: string,
  locationId: string
) {
  return [...store.balances.values()].find(
    (row) =>
      row.businessId === businessId &&
      row.stockItemId === stockItemId &&
      row.locationId === locationId
  );
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
    "src/modules/inventory/components/transfer-list.tsx",
    "src/modules/inventory/components/transfer-create-form.tsx",
    "src/modules/inventory/components/transfer-detail.tsx",
  ].map((relative) => readFileSync(path.join(ROOT, relative), "utf8"));
  const visible = files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-008") &&
        !visible.includes("IP-04") &&
        !visible.includes("ENG-005") &&
        !visible.includes("ENG-013"),
    },
    {
      name: "ux:operational-language",
      ok:
        visible.includes("Transfers") &&
        visible.includes("In Transit") &&
        visible.includes("Receive transfer") &&
        visible.includes("Dispatched") &&
        visible.includes("Discrepancy"),
    },
  ];
}

function checkArchitecture(): SmokeResult[] {
  const inventoryRoot = path.join(ROOT, "src/modules/inventory");
  const engineRoot = path.join(ROOT, "src/core/inventory-engine");
  const files = [...listSourceFiles(inventoryRoot), ...listSourceFiles(engineRoot)].filter(
    (file) => !file.replace(/\\/g, "/").includes("/architecture-scan.ts")
  );
  const scan = scanInventoryArchitecture(files);
  const service = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/stock-transfer-service.ts"),
    "utf8"
  );
  const posting = readFileSync(
    path.join(ROOT, "src/modules/inventory/services/inventory-transfer-posting.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0078_bp008_ip004_stock_transfers.sql"),
    "utf8"
  );
  return [
    {
      name: "ac-023:no-provider-integration",
      ok: scan.sdkHits.length === 0 && scan.httpHits.length === 0,
      detail: [...scan.sdkHits, ...scan.httpHits].join(", "),
    },
    {
      name: "ac-024:no-second-ledger",
      ok:
        !migration.includes("inventory_balance") &&
        !service.includes("transferStock(") &&
        posting.includes("TRANSFER_DISPATCH") &&
        posting.includes("TRANSFER_RECEIPT"),
    },
    {
      name: "arch:no-future-ip-methods",
      ok: !service.includes("transferStock(") && !service.includes("adjustStock("),
    },
    {
      name: "arch:no-hard-coded-location-types",
      ok: !service.includes("WAREHOUSE") && !service.includes("BRANCH_STORE"),
    },
    {
      name: "arch:no-hard-coded-roles",
      ok: !service.includes("warehouse user") && !service.includes("business owner"),
    },
  ];
}

async function runCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const actor = ctx("biz-a");
  const checker = ctx("biz-a", "checker-1");

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const created = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "30",
      idempotencyKey: "create-1",
    });
    const again = await env.transfer.createTransfer(actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      idempotencyKey: "create-1",
      lines: [{ stockItemId: item.id, quantity: "30" }],
    });
    results.push({
      name: "ac-001:create-transfer",
      ok:
        created.status === INVENTORY_TRANSFER_STATUSES.REQUESTED &&
        created.transferNumber.startsWith("POL-TR-") &&
        again.id === created.id,
    });
    results.push({
      name: "ac-002:same-location-rejected",
      ok: await expectError(
        () =>
          env.transfer.createTransfer(actor, {
            sourceLocationId: source.id,
            destinationLocationId: source.id,
            lines: [{ stockItemId: item.id, quantity: "5" }],
          }),
        INVENTORY_ERROR_CODES.SAME_LOCATION_TRANSFER
      ),
    });
    results.push({
      name: "ac-003:insufficient-stock-rejected",
      ok: await expectError(
        async () => {
          const over = await requestTransfer(env, actor, {
            sourceLocationId: source.id,
            destinationLocationId: destination.id,
            stockItemId: item.id,
            quantity: "180",
          });
          await env.transfer.dispatchTransfer(actor, over.id);
        },
        INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK
      ),
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    await env.reservation.createReservation(actor, {
      stockItemId: item.id,
      locationId: source.id,
      quantity: "40",
    });
    const blocked = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "70",
    });
    const allowed = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "50",
    });
    const blockedDispatch = await expectError(
      () => env.transfer.dispatchTransfer(actor, blocked.id),
      INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK
    );
    const dispatched = await env.transfer.dispatchTransfer(actor, allowed.id);
    const sourceBalance = balanceOf(env.store, "biz-a", item.id, source.id);
    results.push({
      name: "ac-004:reserved-stock-excluded",
      ok: blockedDispatch,
    });
    results.push({
      name: "ac-014:ip03-reservation-respected",
      ok:
        blockedDispatch &&
        dispatched.status === INVENTORY_TRANSFER_STATUSES.IN_TRANSIT &&
        sourceBalance?.reserved === "40",
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const transfer = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "30",
    });
    const dispatched = await env.transfer.dispatchTransfer(actor, transfer.id);
    const again = await env.transfer.dispatchTransfer(actor, transfer.id);
    const sourceBalance = balanceOf(env.store, "biz-a", item.id, source.id);
    const destBalance = balanceOf(env.store, "biz-a", item.id, destination.id);
    const movements = [...env.store.movements.values()].filter(
      (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH
    );
    const availability = await env.reservation.listAvailability(actor);
    const withTransit = await env.transfer.enrichAvailability(actor, availability);
    const destRow = withTransit.find(
      (row) => row.stockItemId === item.id && row.locationId === destination.id
    );
    results.push({
      name: "ac-005:source-stock-decreases",
      ok: sourceBalance?.onHand === "70",
    });
    results.push({
      name: "ac-006:in-transit-created",
      ok: dispatched.inTransitQuantity === "30" && destRow?.inTransit === "30",
    });
    results.push({
      name: "ac-007:destination-does-not-increase",
      ok: !destBalance || destBalance.onHand === "0",
    });
    results.push({
      name: "ac-012:duplicate-dispatch-idempotent",
      ok: again.id === dispatched.id && movements.length === 1,
    });
    results.push({
      name: "ac-013:in-transit-visibility",
      ok: destRow?.inTransit === "30" && destRow.available !== "30",
    });
    results.push({
      name: "ac-017:ledger-linkage",
      ok:
        movements[0]?.metadata?.sourceId === transfer.id &&
        movements[0]?.locationId === source.id,
    });
    const cancelledAfter = await expectError(
      () => env.transfer.cancelTransfer(actor, transfer.id, "too late"),
      INVENTORY_ERROR_CODES.TRANSFER_ALREADY_DISPATCHED
    );
    const sourceAfterCancel = balanceOf(env.store, "biz-a", item.id, source.id);
    results.push({
      name: "ac-022:post-dispatch-cancel-blocked",
      ok: cancelledAfter && sourceAfterCancel?.onHand === "70",
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const transfer = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "30",
    });
    await env.transfer.dispatchTransfer(actor, transfer.id);
    const received = await env.transfer.receiveTransfer(actor, {
      transferId: transfer.id,
      lines: [{ lineId: transfer.lines[0]!.id, receivedQuantity: "30" }],
    });
    const again = await env.transfer.receiveTransfer(actor, {
      transferId: transfer.id,
      lines: [{ lineId: transfer.lines[0]!.id, receivedQuantity: "30" }],
    });
    const destBalance = balanceOf(env.store, "biz-a", item.id, destination.id);
    const receipts = [...env.store.movements.values()].filter(
      (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.TRANSFER_RECEIPT
    );
    results.push({
      name: "ac-008:destination-increases",
      ok: destBalance?.onHand === "30",
    });
    results.push({
      name: "ac-009:full-receipt-completes",
      ok: received.status === INVENTORY_TRANSFER_STATUSES.COMPLETED,
    });
    results.push({
      name: "ac-011:duplicate-receipt-idempotent",
      ok: again.status === INVENTORY_TRANSFER_STATUSES.COMPLETED && receipts.length === 1,
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const transfer = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "30",
    });
    await env.transfer.dispatchTransfer(actor, transfer.id);
    const received = await env.transfer.receiveTransfer(actor, {
      transferId: transfer.id,
      lines: [{ lineId: transfer.lines[0]!.id, receivedQuantity: "28" }],
    });
    const destBalance = balanceOf(env.store, "biz-a", item.id, destination.id);
    const incidents = await env.incidents.listIncidents(actor);
    results.push({
      name: "ac-010:partial-receipt-discrepancy",
      ok:
        received.status === INVENTORY_TRANSFER_STATUSES.DISCREPANCY &&
        received.totalReceived === "28" &&
        received.totalDiscrepancy === "2" &&
        destBalance?.onHand === "28" &&
        incidents.some((row) => row.incidentType === INVENTORY_OPS_INCIDENT_TYPES.TRANSFER_EXCEPTION),
    });
    results.push({
      name: "over-receipt-rejected",
      ok: await expectError(async () => {
        const next = await requestTransfer(env, actor, {
          sourceLocationId: source.id,
          destinationLocationId: destination.id,
          stockItemId: item.id,
          quantity: "10",
        });
        await env.transfer.dispatchTransfer(actor, next.id);
        await env.transfer.receiveTransfer(actor, {
          transferId: next.id,
          lines: [{ lineId: next.lines[0]!.id, receivedQuantity: "11" }],
        });
      }, INVENTORY_ERROR_CODES.TRANSFER_OVER_RECEIPT),
    });
  }

  {
    const env = harness({ approval: true });
    const { item, source, destination } = await setupLocations(env.foundation);
    const requested = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "10",
    });
    const selfApprove = await expectError(
      () => env.transfer.approveTransfer(actor, requested.id),
      INVENTORY_ERROR_CODES.SELF_APPROVAL
    );
    const rejectReason = await expectError(
      () => env.transfer.rejectTransfer(checker, requested.id, "   "),
      INVENTORY_ERROR_CODES.INVALID_INPUT
    );
    const approved = await env.transfer.approveTransfer(checker, requested.id);
    const dispatchPending = await expectError(async () => {
      const other = await requestTransfer(env, actor, {
        sourceLocationId: source.id,
        destinationLocationId: destination.id,
        stockItemId: item.id,
        quantity: "5",
      });
      await env.transfer.dispatchTransfer(actor, other.id);
    }, INVENTORY_ERROR_CODES.APPROVAL_REQUIRED);
    results.push({
      name: "ac-015:maker-checker",
      ok:
        requested.status === INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING &&
        selfApprove &&
        rejectReason &&
        approved.status === INVENTORY_TRANSFER_STATUSES.APPROVED &&
        dispatchPending,
    });
    const rejected = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "4",
    });
    const afterReject = await env.transfer.rejectTransfer(checker, rejected.id, "Not needed");
    results.push({
      name: "approval-rejection",
      ok: afterReject.status === INVENTORY_TRANSFER_STATUSES.REJECTED,
    });
  }

  {
    const env = harness({ approval: false });
    const { item, source, destination } = await setupLocations(env.foundation);
    const requested = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "8",
    });
    const dispatched = await env.transfer.dispatchTransfer(actor, requested.id);
    results.push({
      name: "ac-016:approval-disabled",
      ok:
        requested.status === INVENTORY_TRANSFER_STATUSES.REQUESTED &&
        dispatched.status === INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const draft = await env.transfer.createTransfer(actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      lines: [{ stockItemId: item.id, quantity: "6" }],
    });
    const requested = await env.transfer.requestTransfer(actor, draft.id);
    const cancelled = await env.transfer.cancelTransfer(actor, requested.id, "Changed plan");
    const sourceBalance = balanceOf(env.store, "biz-a", item.id, source.id);
    results.push({
      name: "ac-021:pre-dispatch-cancellation",
      ok:
        cancelled.status === INVENTORY_TRANSFER_STATUSES.CANCELLED &&
        sourceBalance?.onHand === "100" &&
        [...env.store.movements.values()].every(
          (row) => row.movementType !== INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH
        ),
    });
    results.push({
      name: "invalid-lifecycle-transition",
      ok: await expectError(
        () => env.transfer.completeTransfer(actor, cancelled.id),
        INVENTORY_ERROR_CODES.TRANSFER_NOT_ACTIONABLE
      ),
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation, actor, {
      opening: "10",
    });
    const first = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "8",
    });
    const second = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "5",
    });
    const outcomes = await Promise.allSettled([
      env.transfer.dispatchTransfer(actor, first.id),
      env.transfer.dispatchTransfer(actor, second.id),
    ]);
    const sourceBalance = balanceOf(env.store, "biz-a", item.id, source.id);
    const successes = outcomes.filter((row) => row.status === "fulfilled");
    const failures = outcomes.filter((row) => row.status === "rejected");
    results.push({
      name: "ac-020:concurrency",
      ok:
        successes.length === 1 &&
        failures.length === 1 &&
        Number(sourceBalance?.available ?? "-1") >= 0 &&
        Number(sourceBalance?.onHand ?? "-1") >= 0,
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const transfer = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "12",
    });
    await env.transfer.dispatchTransfer(actor, transfer.id);
    const outcomes = await Promise.allSettled([
      env.transfer.receiveTransfer(actor, {
        transferId: transfer.id,
        lines: [{ lineId: transfer.lines[0]!.id, receivedQuantity: "12" }],
      }),
      env.transfer.receiveTransfer(actor, {
        transferId: transfer.id,
        lines: [{ lineId: transfer.lines[0]!.id, receivedQuantity: "12" }],
      }),
    ]);
    const receipts = [...env.store.movements.values()].filter(
      (row) => row.movementType === INVENTORY_MOVEMENT_TYPES.TRANSFER_RECEIPT
    );
    const destBalance = balanceOf(env.store, "biz-a", item.id, destination.id);
    results.push({
      name: "concurrent-receipt",
      ok:
        outcomes.every((row) => row.status === "fulfilled") &&
        receipts.length === 1 &&
        destBalance?.onHand === "12",
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    const transfer = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "3",
    });
    const other = await expectError(
      () => env.transfer.getTransfer(ctx("biz-b"), transfer.id),
      INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND
    );
    results.push({
      name: "ac-019:tenant-isolation",
      ok: other,
    });
    results.push({
      name: "location-access",
      ok: await expectError(
        () =>
          env.transfer.createTransfer(ctx("biz-b"), {
            sourceLocationId: source.id,
            destinationLocationId: destination.id,
            lines: [{ stockItemId: item.id, quantity: "1" }],
          }),
        INVENTORY_ERROR_CODES.LOCATION_ACCESS_DENIED
      ),
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation);
    await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "2",
      idempotencyKey: "audit-1",
    });
    const actions = env.audit.entries.map((row) => row.action);
    results.push({
      name: "ac-018:audit",
      ok:
        actions.includes(INVENTORY_AUDIT_ACTIONS.TRANSFER_CREATED) &&
        actions.includes(INVENTORY_AUDIT_ACTIONS.TRANSFER_REQUESTED),
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation, actor, {
      conversion: true,
      opening: "24",
    });
    const created = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "1",
      uomId: "uom-box",
    });
    const dispatched = await env.transfer.dispatchTransfer(actor, created.id);
    const sourceBalance = balanceOf(env.store, "biz-a", item.id, source.id);
    results.push({
      name: "uom-conversion",
      ok: created.lines[0]?.baseQuantity === "12" && sourceBalance?.onHand === "12" && dispatched.inTransitQuantity === "12",
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation, actor, {
      trackingMode: INVENTORY_TRACKING_MODES.BATCH,
      lotCode: "LOT-A",
      opening: "20",
      sku: "SKU-BATCH",
    });
    const created = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "5",
      lotCode: "LOT-A",
    });
    await env.transfer.dispatchTransfer(actor, created.id);
    const received = await env.transfer.receiveTransfer(actor, {
      transferId: created.id,
      lines: [{ lineId: created.lines[0]!.id, receivedQuantity: "5", lotCode: "LOT-A" }],
    });
    const lot = await env.traceability.getLotDetail(
      actor,
      [...env.store.lots.values()].find((row) => row.lotCode === "LOT-A")?.id ?? ""
    );
    results.push({
      name: "batch-tracking-integration",
      ok: received.status === INVENTORY_TRANSFER_STATUSES.COMPLETED && lot.history.length > 0,
    });
  }

  {
    const env = harness();
    const { item, source, destination } = await setupLocations(env.foundation, actor, {
      trackingMode: INVENTORY_TRACKING_MODES.SERIAL,
      unitCodes: ["SN-1", "SN-2"],
      opening: "2",
      sku: "SKU-SERIAL",
    });
    const created = await requestTransfer(env, actor, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      stockItemId: item.id,
      quantity: "2",
      unitCodes: ["SN-1", "SN-2"],
    });
    await env.transfer.dispatchTransfer(actor, created.id);
    const received = await env.transfer.receiveTransfer(actor, {
      transferId: created.id,
      lines: [
        {
          lineId: created.lines[0]!.id,
          receivedQuantity: "2",
          unitCodes: ["SN-1", "SN-2"],
        },
      ],
    });
    results.push({
      name: "serial-tracking-integration",
      ok: received.status === INVENTORY_TRANSFER_STATUSES.COMPLETED,
    });
  }

  {
    const env = harness();
    const { item, source } = await setupLocations(env.foundation);
    const reserved = await env.reservation.createReservation(actor, {
      stockItemId: item.id,
      locationId: source.id,
      quantity: "10",
    });
    results.push({
      name: "reservation-untouched",
      ok: reserved.status === INVENTORY_RESERVATION_STATUSES.RESERVED,
    });
  }

  return results;
}

function runExternal(script: string, extraEnv: Record<string, string> = {}): SmokeResult {
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
    ...(await runCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP04_SKIP_REGRESSION !== "1") {
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
    regressionResults.push(
      runExternal(
        "scripts/bp008-ip09-inventory-operations-exceptions-controls-smoke-validation.ts",
        {
          IP09_SKIP_REGRESSION: "1",
          IP08_SKIP_REGRESSION: "1",
          IP07_SKIP_REGRESSION: "1",
          IP06_SKIP_REGRESSION: "1",
          IP05_SKIP_REGRESSION: "1",
          IP04_SKIP_REGRESSION: "1",
          IP03_SKIP_REGRESSION: "1",
          IP02_SKIP_REGRESSION: "1",
          IP01_SKIP_REGRESSION: "1",
        }
      )
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
