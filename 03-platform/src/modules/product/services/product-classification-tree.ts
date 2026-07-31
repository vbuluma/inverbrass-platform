/**
 * Purpose:
 * Build hierarchical tree from flat Product Classification rows.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import type {
  ProductClassificationTreeNode,
  ProductClassificationView,
} from "@/modules/product/types";

export function buildProductClassificationTree(
  classifications: ProductClassificationView[]
): ProductClassificationTreeNode[] {
  const nodes = new Map<string, ProductClassificationTreeNode>(
    classifications.map((item) => [item.id, { ...item, children: [] }])
  );
  const roots: ProductClassificationTreeNode[] = [];

  for (const item of classifications) {
    const node = nodes.get(item.id);
    if (!node) {
      continue;
    }
    const parentId = item.parentClassificationId;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: ProductClassificationTreeNode[]) => {
    items.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function computeMaxTreeDepth(
  nodes: ProductClassificationTreeNode[]
): number {
  if (nodes.length === 0) {
    return 0;
  }

  let max = 0;
  for (const node of nodes) {
    const depth = 1 + computeMaxTreeDepth(node.children);
    max = Math.max(max, depth);
  }
  return max;
}

export function buildClassificationBreadcrumbPath(
  classificationId: string,
  byId: Map<string, ProductClassificationView>
): ProductClassificationView[] {
  const path: ProductClassificationView[] = [];
  let current: ProductClassificationView | undefined = byId.get(classificationId);

  while (current) {
    path.unshift(current);
    current = current.parentClassificationId
      ? byId.get(current.parentClassificationId)
      : undefined;
  }

  return path;
}

export function collectDescendantIds(
  classificationId: string,
  parentById: Map<string, string | null>
): Set<string> {
  const descendants = new Set<string>();
  for (const [id, parentId] of parentById.entries()) {
    let current: string | null = parentId;
    while (current) {
      if (current === classificationId) {
        descendants.add(id);
        break;
      }
      current = parentById.get(current) ?? null;
    }
  }
  return descendants;
}
