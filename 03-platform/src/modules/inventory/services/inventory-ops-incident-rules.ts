/**
 * Purpose:
 * Pure lifecycle and catalogue validation for operational inventory incidents.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import {
  INVENTORY_OPS_INCIDENT_STATUSES,
  INVENTORY_OPS_INCIDENT_TYPES,
  INVENTORY_OPS_RESOLUTION_ACTIONS,
  INVENTORY_OPS_SEVERITIES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InventoryOpsIncidentTypeRef } from "@/modules/inventory/types";

const ACTIVE = new Set<string>([
  INVENTORY_OPS_INCIDENT_STATUSES.OPEN,
  INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
  INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING,
]);

const ALLOWED: Record<string, string[]> = {
  [INVENTORY_OPS_INCIDENT_STATUSES.OPEN]: [
    INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
    INVENTORY_OPS_INCIDENT_STATUSES.REJECTED,
    INVENTORY_OPS_INCIDENT_STATUSES.CLOSED,
  ],
  [INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING]: [
    INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING,
    INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED,
    INVENTORY_OPS_INCIDENT_STATUSES.REJECTED,
    INVENTORY_OPS_INCIDENT_STATUSES.CLOSED,
  ],
  [INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING]: [
    INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED,
    INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
    INVENTORY_OPS_INCIDENT_STATUSES.REJECTED,
  ],
};

export function isActiveIncidentStatus(status: string): boolean {
  return ACTIVE.has(status);
}

export function assertIncidentTransition(from: string, to: string): void {
  if (!(ALLOWED[from] ?? []).includes(to)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INCIDENT_TRANSITION);
  }
}

export function assertIncidentType(
  code: string,
  types: InventoryOpsIncidentTypeRef[]
): InventoryOpsIncidentTypeRef {
  const match = types.find((row) => row.code === code && row.isActive);
  if (!match) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INCIDENT_TYPE, undefined, 400, {
      field: "incidentType",
    });
  }
  return match;
}

export function assertSeverity(value: string | null | undefined, fallback: string): string {
  const severity = (value ?? fallback).trim().toUpperCase();
  if (!Object.values(INVENTORY_OPS_SEVERITIES).includes(severity as (typeof INVENTORY_OPS_SEVERITIES)[keyof typeof INVENTORY_OPS_SEVERITIES])) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "severity",
    });
  }
  return severity;
}

export function assertResolutionAction(value: string): string {
  const action = value.trim().toUpperCase();
  if (
    !Object.values(INVENTORY_OPS_RESOLUTION_ACTIONS).includes(
      action as (typeof INVENTORY_OPS_RESOLUTION_ACTIONS)[keyof typeof INVENTORY_OPS_RESOLUTION_ACTIONS]
    )
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "resolutionAction",
    });
  }
  return action;
}

export function assertResolutionReason(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "reason",
    });
  }
  return trimmed;
}

export function defaultIncidentTypes(): InventoryOpsIncidentTypeRef[] {
  return Object.values(INVENTORY_OPS_INCIDENT_TYPES).map((code) => ({
    code,
    name: code.replaceAll("_", " "),
    description: null,
    defaultSeverity: code === INVENTORY_OPS_INCIDENT_TYPES.STOCK_NEGATIVE_ATTEMPT ? "CRITICAL" : "MEDIUM",
    isActive: true,
  }));
}
