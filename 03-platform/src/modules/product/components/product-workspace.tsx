/**
 * Purpose:
 * Product Workspace — Overview, Timeline, Audit, and future IP placeholders.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

"use client";

import { useMemo, useRef, useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformTabs,
  PlatformWorkspaceHeader,
  PROCESSING_LABELS,
  useAsyncAction,
  useFormDraft,
  useUnsavedChangesGuard,
} from "@/components/platform";
import { useControlledForm } from "@/lib/forms";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import type { ProductTimelinePanelView } from "@/core/product-timeline";
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
import { dateFieldValue, textFieldValue } from "@/lib/forms";
import {
  activateProductAction,
  archiveProductAction,
  suspendProductAction,
  updateProductAction,
} from "@/modules/product/actions/product-actions";
import { ProductAuditHistoryPanel } from "@/modules/product/components/product-audit-history-panel";
import { ProductCapabilitiesPanel } from "@/modules/product/components/product-capabilities-panel";
import { ProductClassificationPanel } from "@/modules/product/components/product-classification-panel";
import { ProductLifecyclePanel } from "@/modules/product/components/product-lifecycle-panel";
import { OfferingCompliancePanel } from "@/modules/product/components/offering-compliance-panel";
import { OfferingDocumentsPanel } from "@/modules/product/components/offering-documents-panel";
import { OfferingRelationshipsPanel } from "@/modules/product/components/offering-relationships-panel";
import { ProductTimelinePanel } from "@/modules/product/components/product-timeline-panel";
import {
  PRODUCT_STATUS_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { PRODUCT_UI_LABELS } from "@/modules/product/ui-labels";
import type {
  ProductAuditHistoryPanelView,
  ProductClassificationPanelView,
  ProductDetailView,
  ProductLifecyclePanelView,
  OfferingDocumentsPanelView,
  OfferingRelationshipsPanelView,
  ProductRegistrationCatalogues,
} from "@/modules/product/types";

type ProductWorkspaceProps = {
  product: ProductDetailView;
  catalogues: ProductRegistrationCatalogues;
  classification: ProductClassificationPanelView;
  lifecycle: ProductLifecyclePanelView;
  documents: OfferingDocumentsPanelView;
  relationships: OfferingRelationshipsPanelView;
  timeline: ProductTimelinePanelView;
  auditHistory: ProductAuditHistoryPanelView;
  initialTab?: string;
};

function buildOverviewInitial(product: ProductDetailView) {
  return {
    productName: textFieldValue(product.productName),
    shortName: textFieldValue(product.shortName),
    description: textFieldValue(product.description),
    ownerPartyId: textFieldValue(product.ownerPartyId),
    defaultCurrency: textFieldValue(product.defaultCurrency),
    launchDate: dateFieldValue(product.launchDate),
    retirementDate: dateFieldValue(product.retirementDate),
    isSellable: product.isSellable,
    isPurchasable: product.isPurchasable,
    isBookable: product.isBookable,
    isRentable: product.isRentable,
    isSubscription: product.isSubscription,
    isDigital: product.isDigital,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export function ProductWorkspace({
  product: initialProduct,
  catalogues,
  classification,
  lifecycle,
  documents,
  relationships,
  timeline,
  auditHistory,
  initialTab = "overview",
}: ProductWorkspaceProps) {
  const [product, setProduct] = useState(initialProduct);
  const [syncedInitialProduct, setSyncedInitialProduct] = useState(initialProduct);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [overviewResult, setOverviewResult] = useState<PlatformActionResult | null>(
    null
  );
  const [headerResult, setHeaderResult] = useState<PlatformActionResult | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);
  const overviewFormRef = useRef<HTMLFormElement>(null);
  const { isProcessing, run } = useAsyncAction();
  const {
    draftValues: overviewDraft,
    saveDraft: saveOverviewDraft,
    clearDraft: clearOverviewDraft,
    draftSavedAt: overviewDraftSavedAt,
    isHydrated: overviewDraftHydrated,
  } = useFormDraft<Record<string, string | boolean>>(
    `product-${initialProduct.id}-overview-draft`
  );
  const overviewInitial = useMemo(() => buildOverviewInitial(product), [product]);
  const overviewForm = useControlledForm({
    initial: overviewInitial,
    draft: overviewDraft,
    draftHydrated: overviewDraftHydrated,
  });
  const { unsavedChangesDialog } = useUnsavedChangesGuard({ isDirty });

  if (initialProduct !== syncedInitialProduct) {
    setSyncedInitialProduct(initialProduct);
    setProduct(initialProduct);
  }

  const isArchived = product.statusCode === PRODUCT_STATUS_CODES.ARCHIVED;
  const availableTabs = PRODUCT_WORKSPACE_TABS.filter((tab) => tab.available);

  async function saveOverview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOverviewResult(null);

    await run(async () => {
      const result = await updateProductAction(product.id, {
        productName: overviewForm.textValue("productName"),
        shortName: overviewForm.textValue("shortName"),
        description: overviewForm.textValue("description"),
        ownerPartyId: overviewForm.textValue("ownerPartyId") || null,
        defaultCurrency: overviewForm.textValue("defaultCurrency") || null,
        launchDate: overviewForm.textValue("launchDate") || null,
        retirementDate: overviewForm.textValue("retirementDate") || null,
        isSellable: overviewForm.checkedValue("isSellable"),
        isPurchasable: overviewForm.checkedValue("isPurchasable"),
        isBookable: overviewForm.checkedValue("isBookable"),
        isRentable: overviewForm.checkedValue("isRentable"),
        isSubscription: overviewForm.checkedValue("isSubscription"),
        isDigital: overviewForm.checkedValue("isDigital"),
      });

      if (!result.success) {
        setOverviewResult(
          platformError("Could not save product", result.error.message, result.error.field)
        );
        return;
      }

      setProduct(result.data);
      clearOverviewDraft();
      setIsDirty(false);
      setOverviewResult(
        platformSuccess("Product updated", "Changes saved successfully.", result.data)
      );
    });
  }

  async function runLifecycle(
    action: typeof activateProductAction,
    successMessage: string
  ) {
    setHeaderResult(null);
    await run(async () => {
      const result = await action(product.id);
      if (!result.success) {
        setHeaderResult(
          platformError("Action failed", result.error.message, result.error.field)
        );
        return;
      }
      setProduct(result.data);
      setHeaderResult(platformSuccess("Status updated", successMessage, result.data));
    });
  }

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Products", href: "/products" },
          { label: product.productName },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/products"
        backLabel="Back to products"
        workspaceLabel="Product Workspace"
        title={product.productName}
        subtitle={product.productCode}
        statusLabel={product.statusName}
        createdLabel={formatDate(product.createdAt)}
        completionItems={[
          {
            id: "owner",
            label: "Responsible Business Owner assigned",
            completed: Boolean(product.ownerPartyId),
            href: `/products/${product.id}?tab=overview`,
          },
          {
            id: "description",
            label: "Description",
            completed: Boolean(product.description?.trim()),
            href: `/products/${product.id}?tab=overview`,
          },
          {
            id: "classification",
            label: "Primary classification assigned",
            completed: Boolean(classification.primaryClassification),
            href: `/products/${product.id}?tab=classification`,
          },
        ]}
        quickActions={[
          { label: "Catalogue Structure", href: `/products/${product.id}?tab=classification` },
          { label: "View Timeline", href: `/products/${product.id}?tab=timeline` },
          { label: "View Audit", href: `/products/${product.id}?tab=audit-history` },
        ]}
        primaryActions={
          isArchived ? null : (
            <div className="flex flex-wrap gap-2">
              {product.statusCode !== PRODUCT_STATUS_CODES.ACTIVE ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(activateProductAction, "Product is now active.")
                  }
                >
                  Activate
                </Button>
              ) : null}
              {product.statusCode === PRODUCT_STATUS_CODES.ACTIVE ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(suspendProductAction, "Product has been suspended.")
                  }
                >
                  Suspend
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isProcessing}
                onClick={() =>
                  runLifecycle(archiveProductAction, "Product has been archived.")
                }
              >
                Archive
              </Button>
            </div>
          )
        }
        headerResult={headerResult}
      />

      <PlatformTabs
        tabs={availableTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Product workspace sections"
      />

      {activeTab === "overview" ? (
        <form ref={overviewFormRef} onSubmit={saveOverview} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{PRODUCT_UI_LABELS.identityHeading}</CardTitle>
              <CardDescription>
                Core identifiers for this offering.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Product Code</Label>
                <p className="text-sm font-medium">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label>Product Type</Label>
                <p className="text-sm">{product.productTypeName}</p>
              </div>
              <div className="space-y-1">
                <Label>Record Source</Label>
                <p className="text-sm">{product.recordSourceLabel}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={overviewForm.textValue("productName")}
                  onChange={(event) => {
                    overviewForm.setField("productName", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="shortName">Short Name</Label>
                <Input
                  id="shortName"
                  value={overviewForm.textValue("shortName")}
                  onChange={(event) => {
                    overviewForm.setField("shortName", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={overviewForm.textValue("description")}
                  onChange={(event) => {
                    overviewForm.setField("description", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PRODUCT_UI_LABELS.lifecycleHeading}</CardTitle>
              <CardDescription>
                Status and key dates. Use header actions for activate, suspend, or archive.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Status</Label>
                <p className="text-sm font-medium">{product.statusName}</p>
              </div>
              <div className="space-y-1">
                <Label>Default Currency</Label>
                <select
                  id="defaultCurrency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  value={overviewForm.textValue("defaultCurrency")}
                  onChange={(event) => {
                    overviewForm.setField("defaultCurrency", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                >
                  <option value="">None</option>
                  {catalogues.currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="launchDate">Launch Date</Label>
                <Input
                  id="launchDate"
                  type="date"
                  value={overviewForm.textValue("launchDate")}
                  onChange={(event) => {
                    overviewForm.setField("launchDate", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retirementDate">Retirement Date</Label>
                <Input
                  id="retirementDate"
                  type="date"
                  value={overviewForm.textValue("retirementDate")}
                  onChange={(event) => {
                    overviewForm.setField("retirementDate", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PRODUCT_UI_LABELS.ownershipHeading}</CardTitle>
              <CardDescription>
                {PRODUCT_UI_LABELS.responsibleBusinessOwnerHint}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="ownerPartyId">
                  {PRODUCT_UI_LABELS.responsibleBusinessOwner}
                </Label>
                <select
                  id="ownerPartyId"
                  className="flex h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  value={overviewForm.textValue("ownerPartyId")}
                  onChange={(event) => {
                    overviewForm.setField("ownerPartyId", event.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                >
                  <option value="">Unassigned</option>
                  {catalogues.ownerParties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PRODUCT_UI_LABELS.capabilitiesHeading}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductCapabilitiesPanel
                productTypeCode={product.productTypeCode}
                values={{
                  isSellable: overviewForm.checkedValue("isSellable"),
                  isPurchasable: overviewForm.checkedValue("isPurchasable"),
                  isBookable: overviewForm.checkedValue("isBookable"),
                  isRentable: overviewForm.checkedValue("isRentable"),
                  isSubscription: overviewForm.checkedValue("isSubscription"),
                  isDigital: overviewForm.checkedValue("isDigital"),
                }}
                disabled={isArchived}
                onChange={(field, checked) => {
                  overviewForm.setField(field, checked);
                  setIsDirty(true);
                }}
              />
            </CardContent>
          </Card>

          {(product.legacyCode ||
            product.legacySystem ||
            product.migrationBatch) && (
            <Card>
              <CardHeader>
                <CardTitle>{PRODUCT_UI_LABELS.migrationHeading}</CardTitle>
                <CardDescription>
                  Legacy identifiers retained from import — read only.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {product.legacyCode ? (
                  <div>
                    <Label>Legacy Code</Label>
                    <p className="text-sm">{product.legacyCode}</p>
                  </div>
                ) : null}
                {product.legacySystem ? (
                  <div>
                    <Label>Legacy System</Label>
                    <p className="text-sm">{product.legacySystem}</p>
                  </div>
                ) : null}
                {product.migrationBatch ? (
                  <div>
                    <Label>Migration Batch</Label>
                    <p className="text-sm">{product.migrationBatch}</p>
                  </div>
                ) : null}
                {product.migrationDate ? (
                  <div>
                    <Label>Migration Date</Label>
                    <p className="text-sm">{formatDate(product.migrationDate)}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {!isArchived ? (
            <PlatformFormActionFooter
              result={overviewResult}
              isProcessing={isProcessing}
              processingLabel={PROCESSING_LABELS.saving}
              draftSavedAt={overviewDraftSavedAt}
            >
              <PlatformProcessingButton
                type="submit"
                isProcessing={isProcessing}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel="Save Changes"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => {
                  saveOverviewDraft(overviewForm.values);
                  setIsDirty(false);
                }}
              >
                Save Draft
              </Button>
            </PlatformFormActionFooter>
          ) : null}
        </form>
      ) : null}

      {activeTab === "classification" ? (
        <ProductClassificationPanel
          productId={product.id}
          initialData={classification}
          disabled={isArchived}
        />
      ) : null}

      {activeTab === "lifecycle" ? (
        <ProductLifecyclePanel productId={product.id} initialData={lifecycle} />
      ) : null}

      {activeTab === "documents" ? (
        <OfferingDocumentsPanel
          productId={product.id}
          initialData={documents}
        />
      ) : null}

      {activeTab === "compliance" ? (
        <OfferingCompliancePanel initialData={documents} />
      ) : null}

      {activeTab === "relationships" ? (
        <OfferingRelationshipsPanel
          productId={product.id}
          initialData={relationships}
        />
      ) : null}

      {activeTab === "timeline" ? (
        <ProductTimelinePanel productId={product.id} initialData={timeline} />
      ) : null}

      {activeTab === "audit-history" ? (
        <ProductAuditHistoryPanel
          productId={product.id}
          initialData={auditHistory}
        />
      ) : null}

      {PRODUCT_WORKSPACE_TABS.filter((tab) => !tab.available).map((tab) =>
        activeTab === tab.id ? (
          <PlatformEmptyState
            key={tab.id}
            title={`${tab.label} — Coming Soon`}
            description={`This capability will be delivered in ${tab.futureIp ?? "a future Implementation Package"}.`}
          />
        ) : null
      )}

      {unsavedChangesDialog}
    </main>
  );
}
