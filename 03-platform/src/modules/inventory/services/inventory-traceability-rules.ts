/**
 * Purpose:
 * Validation for item tracking modes, lots, tracked units, and expiry.
 * Does not post ledger movements.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import { compareInventoryQuantity } from "@/core/inventory-engine";
import {
  INVENTORY_EXPIRY_STATUSES,
  INVENTORY_TRACKING_MODES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import type { InventoryTraceCapture } from "@/modules/inventory/types";

const MODE_SET = new Set<string>(Object.values(INVENTORY_TRACKING_MODES));

export function assertTrackingMode(mode: string | null | undefined): string {
  const trimmed = (mode ?? INVENTORY_TRACKING_MODES.NONE).trim() || INVENTORY_TRACKING_MODES.NONE;
  if (!MODE_SET.has(trimmed)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_TRACKING_MODE, undefined, 400, {
      field: "trackingMode",
    });
  }
  return trimmed;
}

export function trackingModeOf(item: { trackingMode?: string | null }): string {
  return item.trackingMode?.trim() || INVENTORY_TRACKING_MODES.NONE;
}

export function normalizeTraceCode(value: string | null | undefined, field: string): string {
  const normalized = normalizeOptionalText(value)?.toUpperCase() ?? null;
  if (!normalized) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
  }
  return normalized;
}

export function normalizeTraceCodeList(values: string[] | null | undefined): string[] {
  if (!values?.length) {
    return [];
  }
  const codes = values.map((value) => normalizeTraceCode(value, "unitCodes"));
  const unique = new Set(codes);
  if (unique.size !== codes.length) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_TRACKED_UNIT);
  }
  return codes;
}

export function captureFromCommand(command: {
  lotCode?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  unitCodes?: string[] | null;
}): InventoryTraceCapture {
  return {
    lotCode: command.lotCode,
    manufacturedOn: command.manufacturedOn,
    expiresOn: command.expiresOn,
    unitCodes: command.unitCodes,
  };
}

export function hasTraceCapture(capture: InventoryTraceCapture | null | undefined): boolean {
  if (!capture) {
    return false;
  }
  return Boolean(
    normalizeOptionalText(capture.lotCode) ||
      normalizeOptionalText(capture.expiresOn) ||
      normalizeOptionalText(capture.manufacturedOn) ||
      (capture.unitCodes && capture.unitCodes.length > 0)
  );
}

export function classifyExpiryStatus(expiresOn: string | null, reference = new Date()): string {
  if (!expiresOn) {
    return INVENTORY_EXPIRY_STATUSES.NOT_EXPIRED;
  }
  const expiry = new Date(`${expiresOn}T23:59:59.999Z`);
  if (Number.isNaN(expiry.getTime())) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "expiresOn",
    });
  }
  if (expiry.getTime() < reference.getTime()) {
    return INVENTORY_EXPIRY_STATUSES.EXPIRED;
  }
  return INVENTORY_EXPIRY_STATUSES.NOT_EXPIRED;
}

export function assertInboundTrace(params: {
  mode: string;
  expiryRequired: boolean;
  capture: InventoryTraceCapture | null | undefined;
  baseQuantity: string;
}): void {
  const present = hasTraceCapture(params.capture);
  if (params.mode === INVENTORY_TRACKING_MODES.NONE) {
    if (present) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRACKING_NOT_ALLOWED);
    }
    return;
  }
  if (params.mode === INVENTORY_TRACKING_MODES.BATCH) {
    const lotCode = normalizeOptionalText(params.capture?.lotCode);
    if (!lotCode) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOT_REQUIRED, undefined, 400, {
        field: "lotCode",
      });
    }
    if (params.expiryRequired && !normalizeOptionalText(params.capture?.expiresOn)) {
      throw new InventoryError(INVENTORY_ERROR_CODES.EXPIRY_REQUIRED, undefined, 400, {
        field: "expiresOn",
      });
    }
    return;
  }
  if (params.mode === INVENTORY_TRACKING_MODES.SERIAL) {
    const codes = normalizeTraceCodeList(params.capture?.unitCodes ?? []);
    if (codes.length === 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.UNIT_CODES_REQUIRED, undefined, 400, {
        field: "unitCodes",
      });
    }
    if (compareInventoryQuantity(params.baseQuantity, String(codes.length)) !== 0) {
      throw new InventoryError(INVENTORY_ERROR_CODES.UNIT_COUNT_MISMATCH);
    }
  }
}

export function assertOutboundTrace(params: {
  mode: string;
  capture: InventoryTraceCapture | null | undefined;
  baseQuantity: string;
}): void {
  assertInboundTrace({
    mode: params.mode,
    expiryRequired: false,
    capture: params.capture,
    baseQuantity: params.baseQuantity,
  });
}
