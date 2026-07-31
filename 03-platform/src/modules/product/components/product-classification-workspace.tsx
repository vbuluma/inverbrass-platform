/**
 * Purpose:
 * Product Classification Workspace — overview, children, products, audit.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { useControlledForm } from "@/lib/forms";
import {
  PlatformConfirmDialog,
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
import { ClassificationBreadcrumbPath } from "@/modules/product/components/classification-breadcrumb-path";
import { ProductClassificationTimelinePanel } from "@/modules/product/components/product-classification-timeline-panel";
import {
  activateProductClassificationAction,
  archiveProductClassificationAction,
  deactivateProductClassificationAction,
  moveProductClassificationAction,
  updateProductClassificationAction,
} from "@/modules/product/actions/product-classification-actions";
import { CATALOGUE_STRUCTURE_UI_LABELS } from "@/modules/product/catalogue-structure-ui-labels";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import {
  PRODUCT_CLASSIFICATION_STATUS_CODES,
  PRODUCT_CLASSIFICATION_WORKSPACE_TABS,
} from "@/modules/product/constants";
import type { ProductClassificationWorkspaceView } from "@/modules/product/types";

type ProductClassificationWorkspaceProps = {
  initialData: ProductClassificationWorkspaceView;
  initialTab?: string;
};

export function ProductClassificationWorkspace({
  initialData,
  initialTab = "overview",
}: ProductClassificationWorkspaceProps) {
  const [workspace, setWorkspace] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [headerResult, setHeaderResult] = useState<PlatformActionResult | null>(
    null
  );
  const [overviewResult, setOverviewResult] = useState<PlatformActionResult | null>(
    null
  );
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const { isProcessing, run } = useAsyncAction();

  const overviewForm = useControlledForm({
    initial: {
      name: textFieldValue(workspace.classification.name),
      description: textFieldValue(workspace.classification.description),
      parentClassificationId: textFieldValue(
        workspace.classification.parentClassificationId
      ),
    },
    draftHydrated: true,
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setWorkspace(initialData);
  }

  const isArchived =
    workspace.classification.status ===
    PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED;
  const isDraft =
    workspace.classification.status === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT;
  const isActive =
    workspace.classification.status === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE;

  async function saveOverview(event: React.FormEvent) {
    event.preventDefault();
    setOverviewResult(null);

    await run(async () => {
      const updateResult = await updateProductClassificationAction(
        workspace.classification.id,
        {
          name: overviewForm.textValue("name"),
          description: overviewForm.textValue("description") || null,
        }
      );

      if (!updateResult.success) {
        setOverviewResult(
          platformError("Could not save", updateResult.error.message)
        );
        return;
      }

      const currentParent = workspace.classification.parentClassificationId;
      const nextParent =
        overviewForm.textValue("parentClassificationId") || null;

      if (currentParent !== nextParent) {
        const moveResult = await moveProductClassificationAction(
          workspace.classification.id,
          { parentClassificationId: nextParent }
        );
        if (!moveResult.success) {
          setOverviewResult(
            platformError("Could not move", moveResult.error.message)
          );
          return;
        }
        setWorkspace(moveResult.data);
      } else {
        setWorkspace(updateResult.data);
      }

      setOverviewResult(
        platformSuccess("Category updated", "Changes saved successfully.")
      );
    });
  }

  async function runLifecycle(
    action: typeof activateProductClassificationAction,
    successMessage: string
  ) {
    setHeaderResult(null);
    await run(async () => {
      const result = await action(workspace.classification.id);
      if (!result.success) {
        setHeaderResult(platformError("Action failed", result.error.message));
        return;
      }
      setWorkspace(result.data);
      setHeaderResult(platformSuccess("Status updated", successMessage));
    });
  }

  async function archive() {
    setHeaderResult(null);
    await run(async () => {
      const result = await archiveProductClassificationAction(
        workspace.classification.id
      );
      if (!result.success) {
        setHeaderResult(platformError("Action failed", result.error.message));
        return;
      }
      setWorkspace(result.data);
      setShowDeactivateConfirm(false);
      setHeaderResult(platformSuccess("Category archived", "Status updated."));
    });
  }

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Products", href: "/products" },
          { label: CATALOGUE_STRUCTURE_UI_LABELS.moduleName, href: "/products/classifications" },
          { label: workspace.classification.name },
        ]}
      />

      <ClassificationBreadcrumbPath items={workspace.breadcrumbPath} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard
          label={CATALOGUE_STRUCTURE_UI_LABELS.metricsProducts}
          value={workspace.summary.assignedProductCount}
        />
        <PlatformKpiCard
          label={CATALOGUE_STRUCTURE_UI_LABELS.metricsActiveProducts}
          value={workspace.summary.activeProductCount}
        />
        <PlatformKpiCard
          label={CATALOGUE_STRUCTURE_UI_LABELS.metricsArchivedProducts}
          value={workspace.summary.archivedProductCount}
        />
        <PlatformKpiCard
          label={CATALOGUE_STRUCTURE_UI_LABELS.metricsChildren}
          value={workspace.summary.childCount}
        />
      </section>

      <PlatformWorkspaceHeader
        backHref="/products/classifications"
        backLabel={CATALOGUE_STRUCTURE_UI_LABELS.backToCatalogue}
        workspaceLabel={CATALOGUE_STRUCTURE_UI_LABELS.workspaceLabel}
        title={
          workspace.classification.icon
            ? `${workspace.classification.icon} ${workspace.classification.name}`
            : workspace.classification.name
        }
        subtitle={`${workspace.classification.code} · ${workspace.classification.classificationTypeName}`}
        statusLabel={workspace.classification.statusLabel}
        completionItems={[
          {
            id: "children",
            label: "Child categories configured",
            completed: workspace.summary.childCount > 0,
            href: `?tab=children`,
          },
          {
            id: "products",
            label: "Products assigned",
            completed: workspace.summary.assignedProductCount > 0,
            href: `?tab=assigned-products`,
          },
        ]}
        primaryActions={
          !isArchived ? (
            <div className="flex flex-wrap gap-2">
              {isDraft ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(
                      activateProductClassificationAction,
                      "Category is now active."
                    )
                  }
                >
                  Activate
                </Button>
              ) : null}
              {isActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => setShowDeactivateConfirm(true)}
                >
                  Archive
                </Button>
              ) : null}
            </div>
          ) : null
        }
        headerResult={headerResult}
      />

      <PlatformTabs
        tabs={PRODUCT_CLASSIFICATION_WORKSPACE_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Classification workspace sections"
      />

      {activeTab === "overview" ? (
        <form onSubmit={saveOverview} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Level {workspace.classification.hierarchyLevel + 1} ·{" "}
                {workspace.summary.descendantCount} descendants
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Code</Label>
                <p className="text-sm font-medium">{workspace.classification.code}</p>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <p className="text-sm">{workspace.classification.statusLabel}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={overviewForm.textValue("name")}
                  onChange={(event) =>
                    overviewForm.setField("name", event.target.value)
                  }
                  disabled={isArchived}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={overviewForm.textValue("description")}
                  onChange={(event) =>
                    overviewForm.setField("description", event.target.value)
                  }
                  disabled={isArchived}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="parentClassificationId">Parent</Label>
                <select
                  id="parentClassificationId"
                  className="flex h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  value={overviewForm.textValue("parentClassificationId")}
                  onChange={(event) =>
                    overviewForm.setField(
                      "parentClassificationId",
                      event.target.value
                    )
                  }
                  disabled={isArchived}
                >
                  <option value="">Root level</option>
                  {workspace.parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {!isArchived ? (
            <PlatformFormActionFooter
              result={overviewResult}
              isProcessing={isProcessing}
              processingLabel={PROCESSING_LABELS.saving}
            >
              <PlatformProcessingButton
                type="submit"
                isProcessing={isProcessing}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel="Save Changes"
              />
            </PlatformFormActionFooter>
          ) : null}
        </form>
      ) : null}

      {activeTab === "children" ? (
        <Card>
          <CardHeader>
            <CardTitle>Child Classifications</CardTitle>
            <CardDescription>
              Direct children of {workspace.classification.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.children.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No child classifications. Create children from the dashboard.
              </p>
            ) : (
              <ul className="divide-y">
                {workspace.children.map((child) => (
                  <li key={child.id} className="py-3">
                    <Link
                      href={`/products/classifications/${child.id}`}
                      className="font-medium hover:underline"
                    >
                      {child.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{child.code}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "assigned-products" ? (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Products</CardTitle>
            <CardDescription>
              Products linked to this classification node.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.assignedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products assigned. Assign from a product workspace Classification tab.
              </p>
            ) : (
              <ul className="divide-y">
                {workspace.assignedProducts.map((assignment) => (
                  <li key={assignment.id} className="flex justify-between py-3">
                    <div>
                      <Link
                        href={`/products/${assignment.productId}?tab=classification`}
                        className="font-medium hover:underline"
                      >
                        {assignment.productName}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {assignment.productCode}
                      </p>
                    </div>
                    {assignment.isPrimary ? (
                      <span className="text-xs text-amber-700">Primary</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "timeline" ? (
        <ProductClassificationTimelinePanel initialData={workspace.timeline} />
      ) : null}

      {activeTab === "audit-history" ? (
        <Card>
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
            <CardDescription>
              Immutable record of classification changes (ENG-013).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Audit entries for entity{" "}
              <code className="text-xs">product_classification</code> are recorded
              on create, update, move, and deactivate operations.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <PlatformConfirmDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        title="Archive catalogue node?"
        description="Archived nodes cannot receive new products and remain read-only."
        confirmLabel="Archive"
        isProcessing={isProcessing}
        onConfirm={archive}
      />
    </main>
  );
}
