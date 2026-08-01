/**
 * Purpose:
 * Bundle Workspace — overview, items, timeline, audit.
 */

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { useControlledForm } from "@/lib/forms";
import {
  PlatformConfirmDialog,
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformTabs,
  PlatformWorkspaceHeader,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
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
import { textFieldValue } from "@/lib/forms";
import {
  activateBundleAction,
  addBundleItemAction,
  archiveBundleAction,
  removeBundleItemAction,
  searchBundleProductsAction,
  suspendBundleAction,
  updateBundleAction,
  updateBundleItemAction,
} from "@/modules/product/actions/product-bundle-actions";
import { BundleAuditHistoryPanel } from "@/modules/product/components/bundle-audit-history-panel";
import { BundleTimelinePanel } from "@/modules/product/components/bundle-timeline-panel";
import {
  BUNDLE_UI_LABELS,
  BUNDLE_WORKSPACE_TABS,
} from "@/modules/product/bundle-ui-labels";
import { BUNDLE_STATUS_CODES, BUNDLE_AVAILABILITY_TYPES, BUNDLE_PRICING_STRATEGY_CODES } from "@/modules/product/constants";
import type {
  BundleProductSearchResult,
  BundleWorkspaceView,
} from "@/modules/product/types";

type BundleWorkspaceProps = {
  initialData: BundleWorkspaceView;
  initialTab?: string;
};

export function BundleWorkspace({
  initialData,
  initialTab = "overview",
}: BundleWorkspaceProps) {
  const [workspace, setWorkspace] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [headerResult, setHeaderResult] = useState<PlatformActionResult | null>(
    null
  );
  const [overviewResult, setOverviewResult] = useState<PlatformActionResult | null>(
    null
  );
  const [itemsResult, setItemsResult] = useState<PlatformActionResult | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<BundleProductSearchResult[]>(
    []
  );
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();
  const { isProcessing, run } = useAsyncAction();

  const overviewForm = useControlledForm({
    initial: {
      bundleName: textFieldValue(workspace.bundle.bundleName),
      description: textFieldValue(workspace.bundle.description ?? ""),
      pricingStrategy: textFieldValue(workspace.bundle.pricingStrategy),
      availabilityType: textFieldValue(workspace.bundle.availabilityType),
    },
    draftHydrated: true,
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setWorkspace(initialData);
  }

  const isArchived = workspace.bundle.statusCode === BUNDLE_STATUS_CODES.ARCHIVED;
  const isActive = workspace.bundle.statusCode === BUNDLE_STATUS_CODES.ACTIVE;

  async function saveOverview(event: React.FormEvent) {
    event.preventDefault();
    setOverviewResult(null);

    await run(async () => {
      const result = await updateBundleAction(workspace.bundle.id, {
        bundleName: overviewForm.textValue("bundleName"),
        description: overviewForm.textValue("description") || null,
        pricingStrategy: overviewForm.textValue("pricingStrategy"),
        availabilityType: overviewForm.textValue("availabilityType"),
      });

      if (!result.success) {
        setOverviewResult(platformError("Could not save", result.error.message));
        return;
      }

      setWorkspace(result.data);
      setOverviewResult(platformSuccess("Bundle updated", "Changes saved successfully."));
    });
  }

  async function runLifecycle(
    action: typeof activateBundleAction,
    successMessage: string
  ) {
    setHeaderResult(null);
    await run(async () => {
      const result = await action(workspace.bundle.id);
      if (!result.success) {
        setHeaderResult(platformError("Action failed", result.error.message));
        return;
      }
      setWorkspace(result.data);
      setHeaderResult(platformSuccess("Status updated", successMessage));
    });
  }

  function searchProducts(query: string) {
    startSearchTransition(async () => {
      const result = await searchBundleProductsAction(
        query.trim().length >= 2 ? query : undefined
      );
      if (result.success) {
        setProductResults(result.data);
      }
    });
  }

  async function addProduct(product: BundleProductSearchResult) {
    setItemsResult(null);
    await run(async () => {
      const result = await addBundleItemAction(workspace.bundle.id, {
        productId: product.id,
        quantity: 1,
        mandatory: true,
        displayOrder: workspace.items.length,
      });
      if (!result.success) {
        setItemsResult(platformError("Could not add item", result.error.message));
        return;
      }
      setWorkspace(result.data);
      setItemsResult(platformSuccess("Item added", `${product.productName} added.`));
    });
  }

  async function updateItemQuantity(itemId: string, quantity: number) {
    setItemsResult(null);
    await run(async () => {
      const result = await updateBundleItemAction(workspace.bundle.id, itemId, {
        quantity,
      });
      if (!result.success) {
        setItemsResult(platformError("Could not update item", result.error.message));
        return;
      }
      setWorkspace(result.data);
    });
  }

  async function removeItem(itemId: string) {
    setItemsResult(null);
    await run(async () => {
      const result = await removeBundleItemAction(workspace.bundle.id, itemId);
      if (!result.success) {
        setItemsResult(platformError("Could not remove item", result.error.message));
        return;
      }
      setWorkspace(result.data);
      setItemsResult(platformSuccess("Item removed", "Bundle item removed."));
    });
  }

  const tabs = BUNDLE_WORKSPACE_TABS.filter((tab) => tab.available).map((tab) => ({
    id: tab.id,
    label: tab.label,
  }));

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Products", href: "/products" },
          { label: BUNDLE_UI_LABELS.moduleName, href: "/products/bundles" },
          { label: workspace.bundle.bundleName },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/products/bundles"
        backLabel="Back to bundles"
        workspaceLabel={BUNDLE_UI_LABELS.workspaceTitle}
        title={workspace.bundle.bundleName}
        subtitle={`${workspace.bundle.bundleCode} · ${workspace.bundle.bundleTypeLabel} · ${workspace.items.length} items`}
        statusLabel={workspace.bundle.statusLabel}
        primaryActions={
          !isArchived ? (
            <div className="flex flex-wrap gap-2">
              {!isActive ? (
                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => runLifecycle(activateBundleAction, "Bundle activated.")}
                >
                  Activate
                </Button>
              ) : null}
              {isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => runLifecycle(suspendBundleAction, "Bundle suspended.")}
                >
                  Suspend
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => setShowArchiveConfirm(true)}
              >
                Archive
              </Button>
            </div>
          ) : null
        }
        headerResult={headerResult}
        isProcessing={isProcessing}
        processingLabel={PROCESSING_LABELS.saving}
        onDismissHeaderResult={() => setHeaderResult(null)}
      />

      <PlatformTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Bundle workspace sections"
      />

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Bundle identity, availability, and pricing placeholders.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveOverview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bundle-code">Bundle code</Label>
                  <Input id="bundle-code" value={workspace.bundle.bundleCode} disabled readOnly />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bundle-name">Bundle name</Label>
                  <Input
                    id="bundle-name"
                    value={overviewForm.textValue("bundleName")}
                    onChange={(event) =>
                      overviewForm.setField("bundleName", event.target.value)
                    }
                    disabled={isArchived}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bundle-description">Description</Label>
                  <textarea
                    id="bundle-description"
                    className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    value={overviewForm.textValue("description")}
                    onChange={(event) =>
                      overviewForm.setField("description", event.target.value)
                    }
                    disabled={isArchived}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricing-strategy">Pricing strategy</Label>
                  <select
                    id="pricing-strategy"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    value={overviewForm.textValue("pricingStrategy")}
                    onChange={(event) =>
                      overviewForm.setField("pricingStrategy", event.target.value)
                    }
                    disabled={isArchived}
                  >
                    {Object.values(BUNDLE_PRICING_STRATEGY_CODES).map((code) => (
                      <option key={code} value={code}>
                        {code.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {workspace.bundle.pricingStrategyLabel} — calculations deferred to Pricing Engine.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-type">Availability</Label>
                  <select
                    id="availability-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    value={overviewForm.textValue("availabilityType")}
                    onChange={(event) =>
                      overviewForm.setField("availabilityType", event.target.value)
                    }
                    disabled={isArchived}
                  >
                    {Object.values(BUNDLE_AVAILABILITY_TYPES).map((code) => (
                      <option key={code} value={code}>
                        {code.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {overviewResult ? (
                <p
                  className={
                    overviewResult.success
                      ? "text-sm text-emerald-700"
                      : "text-sm text-destructive"
                  }
                >
                  {overviewResult.message}
                </p>
              ) : null}

              {!isArchived ? (
                <PlatformFormActionFooter>
                  <PlatformProcessingButton
                    type="submit"
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel="Save changes"
                  />
                </PlatformFormActionFooter>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "bundle-items" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{BUNDLE_UI_LABELS.itemsHeading}</CardTitle>
              <CardDescription>{BUNDLE_UI_LABELS.itemsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.items.length === 0 ? (
                <PlatformEmptyState
                  title="No items yet"
                  description="Add active products to compose this bundle."
                />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {workspace.items.map((item) => (
                    <li
                      key={item.id}
                      className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <div>
                        <Link
                          href={`/products/${item.productId}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.productCode}
                          {item.variantName ? ` · ${item.variantName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`qty-${item.id}`} className="sr-only">
                          Quantity
                        </Label>
                        <Input
                          id={`qty-${item.id}`}
                          type="number"
                          min="0.0001"
                          step="any"
                          className="w-24"
                          value={String(item.quantity)}
                          disabled={isArchived || isProcessing}
                          onChange={(event) =>
                            updateItemQuantity(item.id, Number(event.target.value))
                          }
                        />
                        {item.mandatory ? (
                          <span className="text-xs text-muted-foreground">Required</span>
                        ) : null}
                      </div>
                      {!isArchived ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {itemsResult ? (
                <p
                  className={
                    itemsResult.success
                      ? "text-sm text-emerald-700"
                      : "text-sm text-destructive"
                  }
                >
                  {itemsResult.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {!isArchived ? (
            <Card>
              <CardHeader>
                <CardTitle>Add product</CardTitle>
                <CardDescription>Search and add active catalogue offerings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={productQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProductQuery(value);
                    searchProducts(value);
                  }}
                  placeholder="Search products…"
                />
                <ul className="divide-y rounded-lg border">
                  {productResults.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-muted-foreground">{product.productCode}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          isProcessing ||
                          workspace.items.some((item) => item.productId === product.id)
                        }
                        onClick={() => addProduct(product)}
                      >
                        Add
                      </Button>
                    </li>
                  ))}
                  {productResults.length === 0 && !isSearching ? (
                    <li className="px-4 py-4 text-sm text-muted-foreground">
                      Search for active products to add.
                    </li>
                  ) : null}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <BundleTimelinePanel initialData={workspace.timeline} />
      ) : null}

      {activeTab === "audit-history" ? (
        <BundleAuditHistoryPanel initialData={workspace.audit} />
      ) : null}

      {BUNDLE_WORKSPACE_TABS.filter((tab) => !tab.available).map((tab) =>
        activeTab === tab.id ? (
          <PlatformEmptyState
            key={tab.id}
            title={
              tab.id === "pricing"
                ? BUNDLE_UI_LABELS.pricingPlaceholderTitle
                : BUNDLE_UI_LABELS.analyticsPlaceholderTitle
            }
            description={
              tab.id === "pricing"
                ? BUNDLE_UI_LABELS.pricingPlaceholderDescription
                : BUNDLE_UI_LABELS.analyticsPlaceholderDescription
            }
          />
        ) : null
      )}

      <PlatformConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive bundle?"
        description="Archived bundles cannot be modified or sold."
        confirmLabel="Archive"
        isProcessing={isProcessing}
        onConfirm={async () => {
          setShowArchiveConfirm(false);
          await runLifecycle(archiveBundleAction, "Bundle archived.");
        }}
      />
    </main>
  );
}
