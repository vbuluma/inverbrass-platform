/**
 * Purpose:
 * Product Classification Dashboard — tree, search, filters, and create.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

"use client";

import { FolderTreeIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformConfirmDialog,
  PlatformEmptyState,
  PlatformKpiCard,
  PlatformProcessingButton,
  PlatformSearchState,
  useAsyncAction,
} from "@/components/platform";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProductClassificationAction,
  deactivateProductClassificationAction,
  getProductClassificationDashboardAction,
  searchProductClassificationsAction,
} from "@/modules/product/actions/product-classification-actions";
import { ProductClassificationTree } from "@/modules/product/components/product-classification-tree";
import { PRODUCT_CLASSIFICATION_STATUS_CODES } from "@/modules/product/constants";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type {
  ProductClassificationDashboardView,
  ProductClassificationTreeNode,
  ProductClassificationView,
} from "@/modules/product/types";

type ProductClassificationDashboardProps = {
  data: ProductClassificationDashboardView;
};

export function ProductClassificationDashboard({
  data: initialData,
}: ProductClassificationDashboardProps) {
  const labels = useProductUiLabels();
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchResults, setSearchResults] = useState<
    ProductClassificationTreeNode[] | null
  >(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [createTypeCode, setCreateTypeCode] = useState("CATEGORY");
  const [createIndustryCode, setCreateIndustryCode] = useState("");
  const [createIcon, setCreateIcon] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isProcessing, run } = useAsyncAction();

  const flatOptions = flattenTree(data.tree);
  const displayTree = searchResults ?? data.tree;

  const searchStatus =
    searchQuery.trim().length < 2 && !statusFilter
      ? "idle"
      : isPending
        ? "searching"
        : searchError
          ? "error"
          : searchResults && flattenTree(searchResults).length === 0
            ? "empty"
            : searchResults
              ? "success"
              : "idle";

  function flattenTree(
    nodes: ProductClassificationDashboardView["tree"]
  ): Array<{ id: string; label: string }> {
    const items: Array<{ id: string; label: string }> = [];
    for (const node of nodes) {
      items.push({ id: node.id, label: `${node.code} — ${node.name}` });
      items.push(...flattenTree(node.children));
    }
    return items;
  }

  function runSearch(query: string, status: string) {
    startTransition(async () => {
      setSearchError(null);
      const result = await searchProductClassificationsAction({
        query: query.trim().length >= 2 ? query : undefined,
        status: status || undefined,
      });
      if (!result.success) {
        setSearchResults(null);
        setSearchError(result.error.message);
        return;
      }
      setSearchResults(buildSearchTree(result.data));
    });
  }

  function buildSearchTree(
    items: ProductClassificationView[]
  ): ProductClassificationTreeNode[] {
    const idSet = new Set(items.map((item) => item.id));
    const filtered = items.filter(
      (item) =>
        !item.parentClassificationId || idSet.has(item.parentClassificationId)
    );
    const nodes: ProductClassificationTreeNode[] = filtered.map((item) => ({
      ...item,
      children: [],
    }));
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const roots: ProductClassificationTreeNode[] = [];
    for (const node of nodes) {
      if (
        node.parentClassificationId &&
        nodeMap.has(node.parentClassificationId)
      ) {
        nodeMap.get(node.parentClassificationId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await createProductClassificationAction({
        code: createCode,
        name: createName,
        description: createDescription || undefined,
        classificationTypeCode: createTypeCode,
        industryCode: createIndustryCode || null,
        icon: createIcon || null,
        parentClassificationId: createParentId || null,
      });
      if (!result.success) {
        return;
      }
      setData(result.data);
      setShowCreate(false);
      setCreateCode("");
      setCreateName("");
      setCreateParentId("");
      setCreateDescription("");
      setSearchResults(null);
    });
  }

  async function handleDeactivate() {
    if (!deactivateId) {
      return;
    }
    await run(async () => {
      const result = await deactivateProductClassificationAction(deactivateId);
      if (!result.success) {
        return;
      }
      setDeactivateId(null);
      const next = await getProductClassificationDashboardAction();
      if (next.success) {
        setData(next.data);
        setSearchResults(null);
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label={labels.catalogueStructure.backToOfferings} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-800 ring-1 ring-violet-200">
                <FolderTreeIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {labels.catalogueStructure.dashboardTitle}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {labels.catalogueStructure.dashboardSubtitle}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure unlimited classification depth — no hardcoded categories.
            </p>
          </div>
          <Button type="button" className="gap-2" onClick={() => setShowCreate(true)}>
            <PlusIcon className="size-4" aria-hidden />
            Create Category
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label="Total Nodes" value={data.totalClassifications} />
        <PlatformKpiCard label="Active" value={data.activeClassifications} />
        <PlatformKpiCard label="Draft" value={data.draftClassifications} />
        <PlatformKpiCard label="Root Nodes" value={data.rootClassifications} />
        <PlatformKpiCard label="Max Depth" value={data.maxDepth} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Search & Filter</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative max-w-xl flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);
                runSearch(value, statusFilter);
              }}
              placeholder="Search by code or name…"
              className="pl-9"
            />
          </div>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              runSearch(searchQuery, event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value={PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT}>Draft</option>
            <option value={PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE}>
              Active
            </option>
            <option value={PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED}>
              Suspended
            </option>
            <option value={PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED}>
              Archived
            </option>
            <option value={PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED}>
              Deprecated
            </option>
          </select>
        </div>

        <PlatformSearchState
          status={searchStatus}
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery, statusFilter)}
          emptyTitle="No classifications found"
          emptyHints={[
            "Try a different code or name",
            "Clear filters to see the full tree",
            "Create a new root or child classification",
          ]}
          createLabel="Create Classification"
          onCreate={() => setShowCreate(true)}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification Tree</CardTitle>
              <CardDescription>
                Expand and collapse nodes. Open a classification for its workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayTree.length === 0 ? (
                <PlatformEmptyState
                  title="No Classifications Yet"
                  description="Create your first classification to build a metadata-driven hierarchy."
                  actionLabel="Create Classification"
                  onAction={() => setShowCreate(true)}
                />
              ) : (
                <ProductClassificationTree
                  nodes={displayTree}
                  isPending={isProcessing}
                  onDeactivate={(id) => setDeactivateId(id)}
                />
              )}
            </CardContent>
          </Card>
        </PlatformSearchState>
      </section>

      {data.recentlyUpdated.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Recently Updated</h2>
          <Card>
            <CardContent className="divide-y px-0 py-0">
              {data.recentlyUpdated.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/classifications/${item.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.code}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.statusLabel}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Classification</CardTitle>
            <CardDescription>
              Codes are unique per business. Hierarchy depth is unlimited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="createCode">Code</Label>
                <Input
                  id="createCode"
                  value={createCode}
                  onChange={(event) => setCreateCode(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createName">Name</Label>
                <Input
                  id="createName"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="createParentId">Parent (optional)</Label>
                <select
                  id="createParentId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createParentId}
                  onChange={(event) => setCreateParentId(event.target.value)}
                >
                  <option value="">Root level</option>
                  {flatOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="createTypeCode">{labels.catalogueStructure.nodeType}</Label>
                <select
                  id="createTypeCode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createTypeCode}
                  onChange={(event) => setCreateTypeCode(event.target.value)}
                >
                  {data.classificationTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="createIndustryCode">
                  {labels.catalogueStructure.industryVisibility}
                </Label>
                <select
                  id="createIndustryCode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createIndustryCode}
                  onChange={(event) => setCreateIndustryCode(event.target.value)}
                >
                  <option value="">{labels.catalogueStructure.industryAll}</option>
                  {data.industries.map((industry) => (
                    <option key={industry.code} value={industry.code}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="createIcon">{labels.catalogueStructure.icon}</Label>
                <Input
                  id="createIcon"
                  value={createIcon}
                  onChange={(event) => setCreateIcon(event.target.value)}
                  placeholder="Optional emoji or icon key"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="createDescription">Description</Label>
                <Input
                  id="createDescription"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <PlatformProcessingButton
                  type="submit"
                  isProcessing={isProcessing}
                  processingLabel="Creating…"
                  idleLabel="Create"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <PlatformConfirmDialog
        open={Boolean(deactivateId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateId(null);
          }
        }}
        title="Deactivate classification?"
        description="Inactive classifications cannot receive new products. Child nodes and assigned products must be cleared first."
        confirmLabel="Deactivate"
        isProcessing={isProcessing}
        onConfirm={handleDeactivate}
      />
    </main>
  );
}
