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
import { BUNDLE_WORKSPACE_TABS } from "@/modules/product/constants";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
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
  const labels = useProductUiLabels();
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

  const workspaceTabLabel = (tabId: string) => {
    const tabLabels: Record<string, string> = {
      overview: labels.bundle.workspaceTabs.overview,
      "bundle-items": labels.bundle.workspaceTabs.bundleItems,
      timeline: labels.bundle.workspaceTabs.timeline,
      "audit-history": labels.bundle.workspaceTabs.auditHistory,
      pricing: labels.bundle.workspaceTabs.pricing,
      analytics: labels.bundle.workspaceTabs.analytics,
    };
    return tabLabels[tabId] ?? tabId;
  };

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
        setOverviewResult(
          platformError(labels.actions.couldNotSave, result.error.message)
        );
        return;
      }

      setWorkspace(result.data);
      setOverviewResult(
        platformSuccess(labels.actions.bundleUpdated, labels.actions.changesSaved)
      );
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
        setHeaderResult(platformError(labels.actions.actionFailed, result.error.message));
        return;
      }
      setWorkspace(result.data);
      setHeaderResult(
        platformSuccess(labels.actions.statusUpdated, successMessage)
      );
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
        setItemsResult(
          platformError(labels.actions.couldNotAddItem, result.error.message)
        );
        return;
      }
      setWorkspace(result.data);
      setItemsResult(
        platformSuccess(
          labels.actions.bundleItemAdded(product.productName),
          labels.actions.bundleItemAdded(product.productName)
        )
      );
    });
  }

  async function updateItemQuantity(itemId: string, quantity: number) {
    setItemsResult(null);
    await run(async () => {
      const result = await updateBundleItemAction(workspace.bundle.id, itemId, {
        quantity,
      });
      if (!result.success) {
        setItemsResult(
          platformError(labels.actions.couldNotUpdateItem, result.error.message)
        );
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
        setItemsResult(
          platformError(labels.actions.couldNotRemoveItem, result.error.message)
        );
        return;
      }
      setWorkspace(result.data);
      setItemsResult(
        platformSuccess(labels.actions.removed, labels.actions.bundleItemRemoved)
      );
    });
  }

  const tabs = BUNDLE_WORKSPACE_TABS.filter((tab) => tab.available).map((tab) => ({
    id: tab.id,
    label: workspaceTabLabel(tab.id),
  }));

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          labels.workspace.hubBreadcrumb,
          { label: labels.bundle.moduleName, href: "/products/bundles" },
          { label: workspace.bundle.bundleName },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/products/bundles"
        backLabel={labels.bundle.backToModule}
        workspaceLabel={labels.bundle.workspaceTitle}
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
                  onClick={() =>
                    runLifecycle(activateBundleAction, labels.actions.bundleActivated)
                  }
                >
                  {labels.bundle.activateLabel}
                </Button>
              ) : null}
              {isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(suspendBundleAction, labels.actions.bundleSuspended)
                  }
                >
                  {labels.bundle.suspendLabel}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => setShowArchiveConfirm(true)}
              >
                {labels.bundle.archiveLabel}
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
        ariaLabel={labels.bundle.workspaceAriaLabel}
      />

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.bundle.overviewTitle}</CardTitle>
            <CardDescription>{labels.bundle.overviewDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveOverview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bundle-code">{labels.bundle.bundleCodeLabel}</Label>
                  <Input id="bundle-code" value={workspace.bundle.bundleCode} disabled readOnly />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bundle-name">{labels.bundle.bundleNameLabel}</Label>
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
                  <Label htmlFor="bundle-description">{labels.bundle.bundleDescriptionLabel}</Label>
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
                    idleLabel={labels.bundle.saveChangesLabel}
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
              <CardTitle>{labels.bundle.itemsHeading}</CardTitle>
              <CardDescription>{labels.bundle.itemsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.items.length === 0 ? (
                <PlatformEmptyState
                  title={labels.bundle.emptyItemsTitle}
                  description={labels.bundle.emptyItemsDescription}
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
                  placeholder={labels.bundle.searchProductsPlaceholder}
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
                ? labels.bundle.pricingPlaceholderTitle
                : labels.bundle.analyticsPlaceholderTitle
            }
            description={
              tab.id === "pricing"
                ? labels.bundle.pricingPlaceholderDescription
                : labels.bundle.analyticsPlaceholderDescription
            }
          />
        ) : null
      )}

      <PlatformConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title={labels.bundle.archiveConfirmTitle}
        description={labels.bundle.archiveConfirmDescription}
        confirmLabel={labels.bundle.archiveConfirmLabel}
        isProcessing={isProcessing}
        onConfirm={async () => {
          setShowArchiveConfirm(false);
          await runLifecycle(archiveBundleAction, labels.actions.bundleArchived);
        }}
      />
    </main>
  );
}
