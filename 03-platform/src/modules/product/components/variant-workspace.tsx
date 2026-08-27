/**
 * Purpose:
 * Variant Workspace — overview, attributes, timeline, audit.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
import {
  activateVariantAction,
  archiveVariantAction,
  cloneVariantAction,
  suspendVariantAction,
  updateVariantAction,
} from "@/modules/product/actions/variant-actions";
import { DynamicAttributeRenderer } from "@/modules/product/components/dynamic-attribute-renderer";
import { VariantAuditHistoryPanel } from "@/modules/product/components/variant-audit-history-panel";
import { VariantTimelinePanel } from "@/modules/product/components/variant-timeline-panel";
import { VARIANT_STATUS_CODES } from "@/modules/product/constants";
import type { VariantWorkspaceView } from "@/modules/product/types";
import { VARIANT_WORKSPACE_TABS } from "@/modules/product/constants";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type VariantWorkspaceProps = {
  initialData: VariantWorkspaceView;
  initialTab?: string;
};

function buildAttributeValues(
  workspace: VariantWorkspaceView
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of workspace.attributeFields) {
    const existing = workspace.attributes.find(
      (item) => item.attributeDefinitionId === field.definition.id
    );
    values[field.definition.code] = existing?.value ?? null;
  }
  return values;
}

export function VariantWorkspace({
  initialData,
  initialTab = "overview",
}: VariantWorkspaceProps) {
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
  const [attributesResult, setAttributesResult] =
    useState<PlatformActionResult | null>(null);
  const [attributeValues, setAttributeValues] = useState(() =>
    buildAttributeValues(initialData)
  );
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const { isProcessing, run } = useAsyncAction();

  const overviewForm = useControlledForm({
    initial: {
      variantName: textFieldValue(workspace.variant.variantName),
      displayOrder: textFieldValue(String(workspace.variant.displayOrder)),
    },
    draftHydrated: true,
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setWorkspace(initialData);
    setAttributeValues(buildAttributeValues(initialData));
  }

  const isArchived = workspace.variant.status === VARIANT_STATUS_CODES.ARCHIVED;
  const isActive = workspace.variant.status === VARIANT_STATUS_CODES.ACTIVE;

  const workspaceTabLabel = (tabId: string) => {
    if (tabId === "audit-history") {
      return labels.variant.workspaceTabs.auditHistory;
    }
    return (
      labels.variant.workspaceTabs[
        tabId as keyof typeof labels.variant.workspaceTabs
      ] ?? tabId
    );
  };

  const attributePayload = useMemo(
    () =>
      workspace.attributeFields.map((field) => ({
        attributeDefinitionId: field.definition.id,
        value: attributeValues[field.definition.code] ?? null,
      })),
    [workspace.attributeFields, attributeValues]
  );

  async function saveOverview(event: React.FormEvent) {
    event.preventDefault();
    setOverviewResult(null);

    await run(async () => {
      const result = await updateVariantAction(workspace.variant.id, {
        variantName: overviewForm.textValue("variantName"),
        displayOrder: Number(overviewForm.textValue("displayOrder")),
      });

      if (!result.success) {
        setOverviewResult(
          platformError("Could not save", result.error.message)
        );
        return;
      }

      setWorkspace(result.data);
      setOverviewResult(
        platformSuccess(
          labels.actions.variantUpdated,
          labels.actions.changesSaved
        )
      );
    });
  }

  async function saveAttributes(event: React.FormEvent) {
    event.preventDefault();
    setAttributesResult(null);

    await run(async () => {
      const result = await updateVariantAction(workspace.variant.id, {
        attributes: attributePayload,
      });

      if (!result.success) {
        setAttributesResult(
          platformError("Could not save attributes", result.error.message)
        );
        return;
      }

      setWorkspace(result.data);
      setAttributeValues(buildAttributeValues(result.data));
      setAttributesResult(
        platformSuccess(labels.actions.attributesSaved, labels.actions.variantAttributesSaved)
      );
    });
  }

  async function runLifecycle(
    action: typeof activateVariantAction,
    successMessage: string
  ) {
    setHeaderResult(null);
    await run(async () => {
      const result = await action(workspace.variant.id);
      if (!result.success) {
        setHeaderResult(platformError("Action failed", result.error.message));
        return;
      }
      setWorkspace(result.data);
      setHeaderResult(platformSuccess(labels.actions.statusUpdated, successMessage));
    });
  }

  async function runClone() {
    setHeaderResult(null);
    await run(async () => {
      const result = await cloneVariantAction(workspace.variant.id);
      if (!result.success) {
        setHeaderResult(platformError("Clone failed", result.error.message));
        return;
      }
      setHeaderResult(
        platformSuccess(labels.actions.variantCloned, labels.actions.openingClone)
      );
      window.location.assign(`/products/variants/${result.data.variant.id}`);
    });
  }

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          labels.workspace.hubBreadcrumb,
          { label: labels.variant.moduleName, href: "/products/variants" },
          {
            label: workspace.variant.productName,
            href: `/products/${workspace.variant.productId}`,
          },
          { label: workspace.variant.variantName },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/products/variants"
        backLabel={labels.variant.backToModule}
        workspaceLabel={labels.variant.workspaceTitle}
        title={workspace.variant.variantName}
        subtitle={`${workspace.variant.variantCode} · ${workspace.variant.productName} (${workspace.variant.productCode})`}
        statusLabel={workspace.variant.statusLabel}
        primaryActions={
          !isArchived ? (
            <div className="flex flex-wrap gap-2">
              {!isActive ? (
                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(activateVariantAction, "Variant activated.")
                  }
                >
                  Activate
                </Button>
              ) : null}
              {isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(suspendVariantAction, "Variant suspended.")
                  }
                >
                  Suspend
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={runClone}
              >
                {labels.variant.cloneAction}
              </Button>
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
        tabs={VARIANT_WORKSPACE_TABS.filter((tab) => tab.available).map((tab) => ({
          id: tab.id,
          label: workspaceTabLabel(tab.id),
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Variant workspace sections"
      />

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Variant identity and display order on the parent offering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveOverview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="variant-code">Variant code</Label>
                  <Input
                    id="variant-code"
                    value={workspace.variant.variantCode}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="variant-name">Variant name</Label>
                  <Input
                    id="variant-name"
                    value={overviewForm.textValue("variantName")}
                    onChange={(event) =>
                      overviewForm.setField("variantName", event.target.value)
                    }
                    disabled={isArchived}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-order">Display order</Label>
                  <Input
                    id="display-order"
                    type="number"
                    min="0"
                    value={overviewForm.textValue("displayOrder")}
                    onChange={(event) =>
                      overviewForm.setField("displayOrder", event.target.value)
                    }
                    disabled={isArchived}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent offering</Label>
                  <Link
                    href={`/products/${workspace.variant.productId}`}
                    className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {workspace.variant.productName}
                  </Link>
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
                  <Link href="/products/variants" className="text-sm text-muted-foreground">
                    Back to dashboard
                  </Link>
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

      {activeTab === "attributes" ? (
        <Card>
          <CardHeader>
            <CardTitle>Distinguishing attributes</CardTitle>
            <CardDescription>
              Variant-specific attribute overrides inherited from IP-004 definitions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.attributeFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No variant-scoped attributes are configured for this parent offering.
              </p>
            ) : (
              <form onSubmit={saveAttributes} className="space-y-4">
                <DynamicAttributeRenderer
                  fields={workspace.attributeFields}
                  values={attributeValues}
                  disabled={isArchived}
                  onChange={(code, value) =>
                    setAttributeValues((current) => ({ ...current, [code]: value }))
                  }
                />

                {attributesResult ? (
                  <p
                    className={
                      attributesResult.success
                        ? "text-sm text-emerald-700"
                        : "text-sm text-destructive"
                    }
                  >
                    {attributesResult.message}
                  </p>
                ) : null}

                {!isArchived ? (
                  <PlatformFormActionFooter>
                    <PlatformProcessingButton
                      type="submit"
                      isProcessing={isProcessing}
                      processingLabel={PROCESSING_LABELS.saving}
                      idleLabel="Save attributes"
                    />
                  </PlatformFormActionFooter>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "timeline" ? (
        <VariantTimelinePanel initialData={workspace.timeline} />
      ) : null}

      {activeTab === "audit-history" ? (
        <VariantAuditHistoryPanel initialData={workspace.audit} />
      ) : null}

      <PlatformConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive variant?"
        description="Archived variants cannot be modified or transacted."
        confirmLabel="Archive"
        isProcessing={isProcessing}
        onConfirm={async () => {
          setShowArchiveConfirm(false);
          await runLifecycle(archiveVariantAction, "Variant archived.");
        }}
      />
    </main>
  );
}
