/**
 * Purpose:
 * Build hierarchical tree from flat Organizational Unit rows.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import type {
  OrganizationalUnitTreeNode,
  OrganizationalUnitView,
} from "@/modules/party/types";

export function buildOrganizationalUnitTree(
  units: OrganizationalUnitView[]
): OrganizationalUnitTreeNode[] {
  const nodes = new Map<string, OrganizationalUnitTreeNode>(
    units.map((unit) => [unit.id, { ...unit, children: [] }])
  );
  const roots: OrganizationalUnitTreeNode[] = [];

  for (const unit of units) {
    const node = nodes.get(unit.id);
    if (!node) {
      continue;
    }
    const parentId = unit.parentOrganizationalUnitId;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: OrganizationalUnitTreeNode[]) => {
    items.sort((a, b) => {
      if (a.isHeadOffice !== b.isHeadOffice) {
        return a.isHeadOffice ? -1 : 1;
      }
      return a.unitName.localeCompare(b.unitName);
    });
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}
