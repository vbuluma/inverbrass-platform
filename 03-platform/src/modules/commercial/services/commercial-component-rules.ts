/**
 * Purpose:
 * Pure commercial component graph / ordering / reconciliation rules (no I/O).
 *
 * Implementation Package:
 * BP-005 / IP-02 – Price Components & Charge Composition
 */

import {
  DEFAULT_COMMERCIAL_COMPONENT_ORDER,
  DEFAULT_COMMERCIAL_COMPONENT_TYPES,
  type CommercialComponentTypeDefinition,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";

export function resolveComponentTypeCatalogue(
  overrides?: CommercialComponentTypeDefinition[]
): Map<string, CommercialComponentTypeDefinition> {
  const map = new Map<string, CommercialComponentTypeDefinition>();
  for (const type of DEFAULT_COMMERCIAL_COMPONENT_TYPES) {
    map.set(type.code, type);
  }
  if (overrides) {
    for (const type of overrides) {
      map.set(type.code, type);
    }
  }
  return map;
}

export function resolveComponentTypeOrder(
  explicitOrder?: string[],
  catalogue?: Map<string, CommercialComponentTypeDefinition>
): string[] {
  if (explicitOrder && explicitOrder.length > 0) {
    return [...explicitOrder];
  }
  if (catalogue) {
    return [...catalogue.values()]
      .sort((a, b) => a.defaultOrder - b.defaultOrder)
      .map((t) => t.code);
  }
  return [...DEFAULT_COMMERCIAL_COMPONENT_ORDER];
}

/**
 * Kahn topological sort over component identities.
 * Edge meaning: `from` depends on `to` (to must come first).
 */
export function orderComponentsByDependencies(
  componentIds: string[],
  edges: Array<{ fromComponentId: string; toComponentId: string }>
): string[] {
  const idSet = new Set(componentIds);
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const id of componentIds) {
    indegree.set(id, 0);
    dependents.set(id, []);
  }

  for (const edge of edges) {
    if (!idSet.has(edge.fromComponentId) || !idSet.has(edge.toComponentId)) {
      throw new CommercialError(
        "INVALID_INPUT",
        "Component dependency references an unknown component identity.",
        400,
        "dependencyEdges",
        edge
      );
    }
    if (edge.fromComponentId === edge.toComponentId) {
      throw new CommercialError(
        "CIRCULAR_COMPONENT_DEPENDENCY",
        COMMERCIAL_USER_MESSAGES.CIRCULAR_COMPONENT_DEPENDENCY,
        409,
        "dependencyEdges",
        edge
      );
    }
    // to → from (to must precede from)
    dependents.get(edge.toComponentId)!.push(edge.fromComponentId);
    indegree.set(
      edge.fromComponentId,
      (indegree.get(edge.fromComponentId) ?? 0) + 1
    );
  }

  const queue = componentIds.filter((id) => (indegree.get(id) ?? 0) === 0);
  // Stable: preserve original relative order among zero-indegree nodes
  const ordered: string[] = [];

  while (queue.length > 0) {
    const next = queue.shift()!;
    ordered.push(next);
    for (const dependent of dependents.get(next) ?? []) {
      const nextDegree = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, nextDegree);
      if (nextDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  if (ordered.length !== componentIds.length) {
    throw new CommercialError(
      "CIRCULAR_COMPONENT_DEPENDENCY",
      COMMERCIAL_USER_MESSAGES.CIRCULAR_COMPONENT_DEPENDENCY,
      409,
      "dependencyEdges",
      {
        unresolved: componentIds.filter((id) => !ordered.includes(id)),
      }
    );
  }

  return ordered;
}

export function detectCircularDependencies(
  componentIds: string[],
  edges: Array<{ fromComponentId: string; toComponentId: string }>
): boolean {
  try {
    orderComponentsByDependencies(componentIds, edges);
    return false;
  } catch (error) {
    if (
      error instanceof CommercialError &&
      error.code === "CIRCULAR_COMPONENT_DEPENDENCY"
    ) {
      return true;
    }
    throw error;
  }
}

export function assertNonNegativeMagnitude(
  amount: string | number,
  field = "amount"
): void {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new CommercialError(
      "INVALID_COMPONENT_AMOUNT",
      COMMERCIAL_USER_MESSAGES.INVALID_COMPONENT_AMOUNT,
      400,
      field,
      { amount }
    );
  }
}
