/**
 * Purpose:
 * Unit Workspace — overview, conversion rules, timeline, audit.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
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
import {
  activateUnitAction,
  archiveUnitAction,
  convertUnitsAction,
  suspendUnitAction,
  updateUnitAction,
} from "@/modules/product/actions/unit-actions";
import { UnitAuditHistoryPanel } from "@/modules/product/components/unit-audit-history-panel";
import { UnitTimelinePanel } from "@/modules/product/components/unit-timeline-panel";
import { UNIT_STATUS_CODES } from "@/modules/product/constants";
import type { UnitWorkspaceView } from "@/modules/product/types";
import { UNIT_WORKSPACE_TABS } from "@/modules/product/constants";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type UnitWorkspaceProps = {
  initialData: UnitWorkspaceView;
  initialTab?: string;
};

export function UnitWorkspace({
  initialData,
  initialTab = "overview",
}: UnitWorkspaceProps) {
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
  const [convertValue, setConvertValue] = useState("1");
  const [convertTargetId, setConvertTargetId] = useState(
    initialData.conversionExamples[0]?.targetUnitId ?? ""
  );
  const [convertResult, setConvertResult] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const { isProcessing, run } = useAsyncAction();

  const overviewForm = useControlledForm({
    initial: {
      name: textFieldValue(workspace.unit.name),
      symbol: textFieldValue(workspace.unit.symbol),
      conversionFactor: textFieldValue(workspace.unit.conversionFactor),
      decimalPrecision: textFieldValue(String(workspace.unit.decimalPrecision)),
      roundingRule: textFieldValue(workspace.unit.roundingRule),
    },
    draftHydrated: true,
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setWorkspace(initialData);
  }

  const isArchived = workspace.unit.status === UNIT_STATUS_CODES.ARCHIVED;
  const isActive = workspace.unit.status === UNIT_STATUS_CODES.ACTIVE;

  async function saveOverview(event: React.FormEvent) {
    event.preventDefault();
    setOverviewResult(null);

    await run(async () => {
      const result = await updateUnitAction(workspace.unit.id, {
        name: overviewForm.textValue("name"),
        symbol: overviewForm.textValue("symbol"),
        conversionFactor: Number(overviewForm.textValue("conversionFactor")),
        decimalPrecision: Number(overviewForm.textValue("decimalPrecision")),
        roundingRule: overviewForm.textValue("roundingRule"),
      });

      if (!result.success) {
        setOverviewResult(
          platformError(labels.actions.couldNotSave, result.error.message)
        );
        return;
      }

      setWorkspace(result.data);
      setOverviewResult(
        platformSuccess(labels.actions.unitUpdated, labels.actions.changesSaved)
      );
    });
  }

  async function runLifecycle(
    action: typeof activateUnitAction,
    successMessage: string
  ) {
    setHeaderResult(null);
    await run(async () => {
      const result = await action(workspace.unit.id);
      if (!result.success) {
        setHeaderResult(platformError(labels.actions.actionFailed, result.error.message));
        return;
      }
      setWorkspace(result.data);
      setHeaderResult(platformSuccess(labels.actions.statusUpdated, successMessage));
    });
  }

  async function runConversion() {
    setConvertResult(null);
    await run(async () => {
      const result = await convertUnitsAction({
        fromUnitId: workspace.unit.id,
        toUnitId: convertTargetId,
        value: Number(convertValue),
      });
      if (!result.success) {
        setConvertResult(result.error.message);
        return;
      }
      setConvertResult(
        `${result.data.inputValue} ${result.data.fromSymbol} = ${result.data.convertedValue} ${result.data.toSymbol}`
      );
    });
  }

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          labels.workspace.hubBreadcrumb,
          { label: labels.unit.moduleName, href: "/products/units" },
          { label: workspace.unit.name },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/products/units"
        backLabel={labels.unit.backToModule}
        workspaceLabel={labels.unit.workspaceTitle}
        title={
          workspace.unit.isBaseUnit
            ? `${workspace.unit.name} (Base)`
            : workspace.unit.name
        }
        subtitle={`${workspace.unit.code} · ${workspace.unit.categoryName} · ${workspace.unit.symbol}`}
        statusLabel={workspace.unit.statusLabel}
        primaryActions={
          !isArchived ? (
            <div className="flex flex-wrap gap-2">
              {!isActive ? (
                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    runLifecycle(activateUnitAction, labels.actions.unitActivated)
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
                    runLifecycle(suspendUnitAction, labels.actions.unitSuspended)
                  }
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
        tabs={UNIT_WORKSPACE_TABS.map((tab) => ({
          id: tab.id,
          label:
            tab.id === "conversion-rules"
              ? labels.unit.workspaceTabs.conversionRules
              : labels.unit.workspaceTabs[
                  tab.id === "audit-history"
                    ? "auditHistory"
                    : (tab.id as "overview" | "timeline")
                ] ?? tab.id,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel={labels.unit.workspaceAriaLabel}
      />

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Unit definition, precision, and conversion factor relative to the category base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveOverview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit-name">Name</Label>
                  <Input
                    id="unit-name"
                    value={overviewForm.textValue("name")}
                    onChange={(event) =>
                      overviewForm.setField("name", event.target.value)
                    }
                    disabled={isArchived}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-symbol">Symbol</Label>
                  <Input
                    id="unit-symbol"
                    value={overviewForm.textValue("symbol")}
                    onChange={(event) =>
                      overviewForm.setField("symbol", event.target.value)
                    }
                    disabled={isArchived}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-factor">Conversion factor</Label>
                  <Input
                    id="unit-factor"
                    type="number"
                    step="any"
                    min="0.0000000001"
                    value={overviewForm.textValue("conversionFactor")}
                    onChange={(event) =>
                      overviewForm.setField("conversionFactor", event.target.value)
                    }
                    disabled={isArchived || workspace.unit.isBaseUnit}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-precision">Decimal precision</Label>
                  <Input
                    id="unit-precision"
                    type="number"
                    min="0"
                    max="10"
                    value={overviewForm.textValue("decimalPrecision")}
                    onChange={(event) =>
                      overviewForm.setField("decimalPrecision", event.target.value)
                    }
                    disabled={isArchived}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="unit-rounding">Rounding rule</Label>
                  <Input
                    id="unit-rounding"
                    value={overviewForm.textValue("roundingRule")}
                    onChange={(event) =>
                      overviewForm.setField("roundingRule", event.target.value)
                    }
                    disabled={isArchived}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current label: {workspace.unit.roundingRuleLabel}
                  </p>
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
                  <Link href="/products/units" className="text-sm text-muted-foreground">
                    Back to dashboard
                  </Link>
                  <PlatformProcessingButton
                    type="submit"
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel="Save changes"
                  >
                    Save changes
                  </PlatformProcessingButton>
                </PlatformFormActionFooter>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "conversion-rules" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{labels.unit.conversionHeading}</CardTitle>
              <CardDescription>{labels.unit.conversionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.conversionExamples.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other units in this category to convert against.
                </p>
              ) : (
                <>
                  <ul className="space-y-2 text-sm">
                    {workspace.conversionExamples.map((example) => (
                      <li key={example.targetUnitId} className="text-muted-foreground">
                        {example.description}
                      </li>
                    ))}
                  </ul>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="convert-value">Value</Label>
                      <Input
                        id="convert-value"
                        type="number"
                        step="any"
                        value={convertValue}
                        onChange={(event) => setConvertValue(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="convert-target">Convert to</Label>
                      <select
                        id="convert-target"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={convertTargetId}
                        onChange={(event) => setConvertTargetId(event.target.value)}
                      >
                        {workspace.conversionExamples.map((example) => (
                          <option key={example.targetUnitId} value={example.targetUnitId}>
                            {example.targetUnitName} ({example.targetUnitSymbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <PlatformProcessingButton
                    type="button"
                    isProcessing={isProcessing}
                    processingLabel="Converting…"
                    idleLabel="Test conversion"
                    onClick={runConversion}
                  >
                    Test conversion
                  </PlatformProcessingButton>
                  {convertResult ? (
                    <p className="text-sm font-medium text-foreground">{convertResult}</p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <UnitTimelinePanel initialData={workspace.timeline} />
      ) : null}

      {activeTab === "audit-history" ? (
        <UnitAuditHistoryPanel initialData={workspace.audit} />
      ) : null}

      <PlatformConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title={labels.unit.archiveConfirmTitle}
        description={labels.unit.archiveConfirmDescription}
        confirmLabel={labels.unit.archiveConfirmLabel}
        isProcessing={isProcessing}
        onConfirm={async () => {
          await run(async () => {
            const result = await archiveUnitAction(workspace.unit.id);
            if (!result.success) {
              setHeaderResult(platformError(labels.actions.actionFailed, result.error.message));
              return;
            }
            setWorkspace(result.data);
            setShowArchiveConfirm(false);
            setHeaderResult(
              platformSuccess(labels.actions.unitArchived, labels.actions.statusUpdatedDetail)
            );
          });
        }}
      />
    </main>
  );
}
