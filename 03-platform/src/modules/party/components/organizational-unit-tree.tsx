/**
 * Purpose:
 * Collapsible hierarchical tree for Organization Structure units.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

"use client";

import { ChevronDownIcon, ChevronRightIcon, StarIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ORGANIZATIONAL_UNIT_STATUS_CODES } from "@/modules/party/constants";
import type { OrganizationalUnitTreeNode } from "@/modules/party/types";

type OrganizationalUnitTreeProps = {
  nodes: OrganizationalUnitTreeNode[];
  organizationName: string;
  viewingId: string | null;
  editingId: string | null;
  isPending: boolean;
  onView: (id: string) => void;
  onEdit: (node: OrganizationalUnitTreeNode) => void;
  onSetHeadOffice: (id: string) => void;
  onRemoveHeadOffice: (id: string) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  onRemove: (id: string) => void;
  renderEditForm: (node: OrganizationalUnitTreeNode) => ReactNode;
  renderViewDetails: (node: OrganizationalUnitTreeNode) => ReactNode;
};

export function OrganizationalUnitTree({
  nodes,
  organizationName,
  viewingId,
  editingId,
  isPending,
  onView,
  onEdit,
  onSetHeadOffice,
  onRemoveHeadOffice,
  onDeactivate,
  onReactivate,
  onRemove,
  renderEditForm,
  renderViewDetails,
}: OrganizationalUnitTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <div className="space-y-1">
      <p className="mb-3 text-sm font-medium">{organizationName}</p>
      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No organizational units match your search.
        </p>
      ) : (
        nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            viewingId={viewingId}
            editingId={editingId}
            isPending={isPending}
            onToggle={toggle}
            onView={onView}
            onEdit={onEdit}
            onSetHeadOffice={onSetHeadOffice}
            onRemoveHeadOffice={onRemoveHeadOffice}
            onDeactivate={onDeactivate}
            onReactivate={onReactivate}
            onRemove={onRemove}
            renderEditForm={renderEditForm}
            renderViewDetails={renderViewDetails}
          />
        ))
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  viewingId,
  editingId,
  isPending,
  onToggle,
  onView,
  onEdit,
  onSetHeadOffice,
  onRemoveHeadOffice,
  onDeactivate,
  onReactivate,
  onRemove,
  renderEditForm,
  renderViewDetails,
}: {
  node: OrganizationalUnitTreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  viewingId: string | null;
  editingId: string | null;
  isPending: boolean;
  onToggle: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (node: OrganizationalUnitTreeNode) => void;
  onSetHeadOffice: (id: string) => void;
  onRemoveHeadOffice: (id: string) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  onRemove: (id: string) => void;
  renderEditForm: (node: OrganizationalUnitTreeNode) => ReactNode;
  renderViewDetails: (node: OrganizationalUnitTreeNode) => ReactNode;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded[node.id] ?? depth < 1;

  return (
    <div>
      <div
        className="rounded-lg border px-3 py-2"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <button
              type="button"
              className="mt-0.5 text-muted-foreground"
              onClick={() => onToggle(node.id)}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              {isOpen ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {node.unitName}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {node.unitCode}
                </span>
              </p>
              {node.isHeadOffice ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-900">
                  <StarIcon className="size-3" aria-hidden />
                  Head Office
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {node.organizationalUnitTypeName}
              {node.parentUnitName ? ` · Parent: ${node.parentUnitName}` : ""}
              {" · "}
              {node.statusCode}
              {" · "}
              {node.locationDisplay}
            </p>
            {viewingId === node.id ? renderViewDetails(node) : null}
            {editingId === node.id ? renderEditForm(node) : null}
            {editingId === node.id ? null : (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => onView(node.id)}
                >
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => onEdit(node)}
                >
                  Edit
                </Button>
                {node.isHeadOffice ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => onRemoveHeadOffice(node.id)}
                  >
                    Remove Head Office
                  </Button>
                ) : node.statusCode ===
                  ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => onSetHeadOffice(node.id)}
                  >
                    Set Head Office
                  </Button>
                ) : null}
                {node.statusCode ===
                ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => onDeactivate(node.id)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => onReactivate(node.id)}
                  >
                    Reactivate
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => onRemove(node.id)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {hasChildren && isOpen ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              viewingId={viewingId}
              editingId={editingId}
              isPending={isPending}
              onToggle={onToggle}
              onView={onView}
              onEdit={onEdit}
              onSetHeadOffice={onSetHeadOffice}
              onRemoveHeadOffice={onRemoveHeadOffice}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
              onRemove={onRemove}
              renderEditForm={renderEditForm}
              renderViewDetails={renderViewDetails}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
