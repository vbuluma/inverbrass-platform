/**
 * Purpose:
 * Account hierarchy and contact role business rules.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import {
  ACCOUNT_MAX_HIERARCHY_DEPTH,
  ACCOUNT_NUMBER_PREFIX,
  ACCOUNT_STATUS_CODES,
  type AccountStatusCode,
} from "@/modules/crm/account/constants";

export function formatAccountNumber(sequence: number): string {
  return `${ACCOUNT_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function isAccountStatusCode(value: string): value is AccountStatusCode {
  return Object.values(ACCOUNT_STATUS_CODES).includes(value as AccountStatusCode);
}

export function isAccountEditable(statusCode: string): boolean {
  return statusCode !== ACCOUNT_STATUS_CODES.CLOSED;
}

/**
 * Walk parent chain using a lookup map. Returns false if circular.
 */
export function wouldCreateCircularHierarchy(
  accountId: string,
  proposedParentId: string | null,
  parentByAccountId: Map<string, string | null>
): boolean {
  if (!proposedParentId) {
    return false;
  }

  if (proposedParentId === accountId) {
    return true;
  }

  let current: string | null = proposedParentId;
  const visited = new Set<string>();

  while (current) {
    if (current === accountId) {
      return true;
    }
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);
    current = parentByAccountId.get(current) ?? null;
  }

  return false;
}

export function resolveHierarchyDepth(
  accountId: string | null,
  parentByAccountId: Map<string, string | null>
): number {
  let depth = 0;
  let current = accountId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) {
      return ACCOUNT_MAX_HIERARCHY_DEPTH + 1;
    }
    visited.add(current);
    depth += 1;
    current = parentByAccountId.get(current) ?? null;
  }

  return depth;
}

export function isWithinHierarchyDepth(
  parentAccountId: string | null,
  parentByAccountId: Map<string, string | null>
): boolean {
  if (!parentAccountId) {
    return true;
  }

  return (
    resolveHierarchyDepth(parentAccountId, parentByAccountId) <
    ACCOUNT_MAX_HIERARCHY_DEPTH
  );
}
