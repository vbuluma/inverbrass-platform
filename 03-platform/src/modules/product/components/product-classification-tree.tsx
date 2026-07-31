/**
 * Purpose:
 * Collapsible hierarchical tree for Product Classifications.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PRODUCT_CLASSIFICATION_STATUS_CODES } from "@/modules/product/constants";
import type { ProductClassificationTreeNode } from "@/modules/product/types";

type ProductClassificationTreeProps = {
  nodes: ProductClassificationTreeNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDeactivate?: (id: string) => void;
  isPending?: boolean;
  showActions?: boolean;
};

export function ProductClassificationTree({
  nodes,
  selectedId,
  onSelect,
  onDeactivate,
  isPending = false,
  showActions = true,
}: ProductClassificationTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No classifications match your filters.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          selectedId={selectedId}
          isPending={isPending}
          showActions={showActions}
          onToggle={toggle}
          onSelect={onSelect}
          onDeactivate={onDeactivate}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  selectedId,
  isPending,
  showActions,
  onToggle,
  onSelect,
  onDeactivate,
}: {
  node: ProductClassificationTreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  selectedId?: string | null;
  isPending: boolean;
  showActions: boolean;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded[node.id] ?? depth < 1;
  const isSelected = selectedId === node.id;
  const isArchived =
    node.status === PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED;
  const isAssignable =
    node.status === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE;

  return (
    <div>
      <div
        className={`rounded-lg border px-3 py-2 ${isSelected ? "border-primary bg-primary/5" : ""}`}
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

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/products/classifications/${node.id}`}
                className="font-medium hover:underline"
                onClick={() => onSelect?.(node.id)}
              >
                {node.icon ? `${node.icon} ` : ""}
                {node.name}
              </Link>
              <span className="text-xs text-muted-foreground">{node.code}</span>
              <span className="text-xs text-muted-foreground">
                {node.classificationTypeName}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isArchived
                    ? "bg-muted text-muted-foreground"
                    : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {node.statusLabel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Level {node.hierarchyLevel + 1} · {node.childCount} children ·{" "}
              {node.assignedProductCount} products
            </p>
          </div>

          {showActions && isAssignable && onDeactivate ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => onDeactivate(node.id)}
            >
              Deactivate
            </Button>
          ) : null}
        </div>
      </div>

      {hasChildren && isOpen
        ? node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedId={selectedId}
              isPending={isPending}
              showActions={showActions}
              onToggle={onToggle}
              onSelect={onSelect}
              onDeactivate={onDeactivate}
            />
          ))
        : null}
    </div>
  );
}
