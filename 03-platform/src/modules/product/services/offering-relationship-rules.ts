/**
 * Purpose:
 * Pure Offering Relationship business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import {
  OFFERING_RELATIONSHIP_STATUS_CODES,
  type OfferingRelationshipStatusCode,
} from "@/modules/product/constants";

export const OFFERING_RELATIONSHIP_TYPE_CODES = {
  DEPENDS_ON: "DEPENDS_ON",
  REQUIRED_WITH: "REQUIRED_WITH",
  OPTIONAL_WITH: "OPTIONAL_WITH",
  CROSS_SELL: "CROSS_SELL",
  UPSELL: "UPSELL",
  UPGRADE_TO: "UPGRADE_TO",
  DOWNGRADE_TO: "DOWNGRADE_TO",
  ALTERNATIVE_TO: "ALTERNATIVE_TO",
  COMPATIBLE_WITH: "COMPATIBLE_WITH",
  INCOMPATIBLE_WITH: "INCOMPATIBLE_WITH",
} as const;

export function isOfferingRelationshipStatusCode(
  value: string
): value is OfferingRelationshipStatusCode {
  return (
    value === OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE ||
    value === OFFERING_RELATIONSHIP_STATUS_CODES.INACTIVE
  );
}

export function isSelfRelationship(
  sourceOfferingId: string,
  targetOfferingId: string
): boolean {
  return (
    sourceOfferingId.trim().toLowerCase() ===
    targetOfferingId.trim().toLowerCase()
  );
}

export function canDeactivateRelationship(
  statusCode: OfferingRelationshipStatusCode
): boolean {
  return statusCode === OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE;
}

export function canReactivateRelationship(
  statusCode: OfferingRelationshipStatusCode
): boolean {
  return statusCode === OFFERING_RELATIONSHIP_STATUS_CODES.INACTIVE;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * WHAT: Detect whether adding source → target would create a DEPENDS_ON cycle.
 * WHY: Spec — circular dependencies are prevented for dependency relationships.
 */
export function wouldCreateCircularDependency(
  sourceOfferingId: string,
  targetOfferingId: string,
  activeEdges: Array<{
    sourceOfferingId: string;
    targetOfferingId: string;
  }>
): boolean {
  const graph = new Map<string, string[]>();

  for (const edge of activeEdges) {
    const existing = graph.get(edge.sourceOfferingId) ?? [];
    existing.push(edge.targetOfferingId);
    graph.set(edge.sourceOfferingId, existing);
  }

  const proposed = graph.get(sourceOfferingId) ?? [];
  proposed.push(targetOfferingId);
  graph.set(sourceOfferingId, proposed);

  const visited = new Set<string>();
  const stack = [targetOfferingId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === sourceOfferingId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    for (const next of graph.get(current) ?? []) {
      stack.push(next);
    }
  }

  return false;
}

export function groupRelationshipsBySection<
  T extends { relationshipTypeCode: string }
>(relationships: T[]) {
  const matches = (codes: string[], code: string) =>
    codes.includes(code.trim().toUpperCase());

  return {
    required: relationships.filter((row) =>
      matches([OFFERING_RELATIONSHIP_TYPE_CODES.REQUIRED_WITH], row.relationshipTypeCode)
    ),
    optional: relationships.filter((row) =>
      matches([OFFERING_RELATIONSHIP_TYPE_CODES.OPTIONAL_WITH], row.relationshipTypeCode)
    ),
    crossSell: relationships.filter((row) =>
      matches(
        [OFFERING_RELATIONSHIP_TYPE_CODES.CROSS_SELL, OFFERING_RELATIONSHIP_TYPE_CODES.UPSELL],
        row.relationshipTypeCode
      )
    ),
    upgradePath: relationships.filter((row) =>
      matches(
        [
          OFFERING_RELATIONSHIP_TYPE_CODES.UPGRADE_TO,
          OFFERING_RELATIONSHIP_TYPE_CODES.DOWNGRADE_TO,
        ],
        row.relationshipTypeCode
      )
    ),
    alternatives: relationships.filter((row) =>
      matches([OFFERING_RELATIONSHIP_TYPE_CODES.ALTERNATIVE_TO], row.relationshipTypeCode)
    ),
    compatibility: relationships.filter((row) =>
      matches(
        [
          OFFERING_RELATIONSHIP_TYPE_CODES.COMPATIBLE_WITH,
          OFFERING_RELATIONSHIP_TYPE_CODES.INCOMPATIBLE_WITH,
        ],
        row.relationshipTypeCode
      )
    ),
    dependencies: relationships.filter((row) =>
      matches([OFFERING_RELATIONSHIP_TYPE_CODES.DEPENDS_ON], row.relationshipTypeCode)
    ),
  };
}
