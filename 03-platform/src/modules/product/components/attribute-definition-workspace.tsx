/**
 * Purpose:
 * Attribute Definition Workspace — overview, options, scope assignment.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

"use client";

import { useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
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
import {
  assignAttributeScopeAction,
  createAttributeOptionAction,
  removeAttributeScopeAction,
  updateAttributeDefinitionAction,
} from "@/modules/product/actions/attribute-actions";
import { ATTRIBUTE_UI_LABELS } from "@/modules/product/attribute-ui-labels";
import {
  ATTRIBUTE_DEFINITION_WORKSPACE_TABS,
} from "@/modules/product/attribute-ui-labels";
import { ATTRIBUTE_SCOPE_TYPES } from "@/modules/product/constants";
import type { AttributeDefinitionWorkspaceView } from "@/modules/product/types";

type AttributeDefinitionWorkspaceProps = {
  initialData: AttributeDefinitionWorkspaceView;
  initialTab?: string;
};

export function AttributeDefinitionWorkspace({
  initialData,
  initialTab = "overview",
}: AttributeDefinitionWorkspaceProps) {
  const [workspace, setWorkspace] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [optionCode, setOptionCode] = useState("");
  const [optionLabel, setOptionLabel] = useState("");
  const [scopeProductType, setScopeProductType] = useState(
    initialData.productTypes[0]?.code ?? ""
  );
  const { isProcessing, run } = useAsyncAction();

  async function saveOverview(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    await run(async () => {
      const actionResult = await updateAttributeDefinitionAction(
        workspace.definition.id,
        {
          name: workspace.definition.name,
          description: workspace.definition.description ?? undefined,
        }
      );
      if (!actionResult.success) {
        setResult(platformError("Could not save", actionResult.error.message));
        return;
      }
      setWorkspace((current) => ({
        ...current,
        definition: actionResult.data,
      }));
      setResult(platformSuccess("Saved", "Attribute definition updated."));
    });
  }

  async function addOption() {
    setResult(null);
    await run(async () => {
      const actionResult = await createAttributeOptionAction(
        workspace.definition.id,
        { optionCode, optionLabel }
      );
      if (!actionResult.success) {
        setResult(platformError("Could not add option", actionResult.error.message));
        return;
      }
      setWorkspace((current) => ({
        ...current,
        options: [...current.options, actionResult.data],
      }));
      setOptionCode("");
      setOptionLabel("");
      setResult(platformSuccess("Option added", "Select option created."));
    });
  }

  async function assignProductTypeScope() {
    setResult(null);
    await run(async () => {
      const actionResult = await assignAttributeScopeAction({
        attributeDefinitionId: workspace.definition.id,
        scopeType: ATTRIBUTE_SCOPE_TYPES.PRODUCT_TYPE,
        productTypeCode: scopeProductType,
      });
      if (!actionResult.success) {
        setResult(platformError("Could not assign", actionResult.error.message));
        return;
      }
      setWorkspace((current) => ({
        ...current,
        scopes: [...current.scopes, actionResult.data],
      }));
      setResult(platformSuccess("Assigned", "Attribute assigned to product type."));
    });
  }

  async function removeScope(scopeId: string) {
    setResult(null);
    await run(async () => {
      const actionResult = await removeAttributeScopeAction(
        workspace.definition.id,
        scopeId
      );
      if (!actionResult.success) {
        setResult(platformError("Could not remove", actionResult.error.message));
        return;
      }
      setWorkspace((current) => ({
        ...current,
        scopes: current.scopes.filter((scope) => scope.id !== scopeId),
      }));
      setResult(platformSuccess("Removed", "Scope assignment removed."));
    });
  }

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Products", href: "/products" },
          { label: ATTRIBUTE_UI_LABELS.moduleName, href: "/products/attributes" },
          { label: workspace.definition.name },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/products/attributes"
        backLabel="Back to attributes"
        workspaceLabel={ATTRIBUTE_UI_LABELS.definitionWorkspaceTitle}
        title={workspace.definition.name}
        subtitle={`${workspace.definition.code} · ${workspace.definition.groupName} · ${workspace.definition.dataTypeLabel}`}
        statusLabel={workspace.definition.statusLabel}
      />

      <PlatformTabs
        tabs={ATTRIBUTE_DEFINITION_WORKSPACE_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Attribute definition workspace sections"
      />

      {activeTab === "overview" ? (
        <form onSubmit={saveOverview}>
          <Card>
            <CardHeader>
              <CardTitle>Definition</CardTitle>
              <CardDescription>Core attribute metadata and flags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={workspace.definition.name}
                  onChange={(event) =>
                    setWorkspace((current) => ({
                      ...current,
                      definition: {
                        ...current.definition,
                        name: event.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Mandatory</p>
                  <p>{workspace.definition.isMandatory ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Read-only</p>
                  <p>{workspace.definition.isReadOnly ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hidden</p>
                  <p>{workspace.definition.isHidden ? "Yes" : "No"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <PlatformFormActionFooter
            result={result}
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
        </form>
      ) : null}

      {activeTab === "options" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>For select, multi-select, radio, and checkbox types.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workspace.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {option.optionLabel}{" "}
                    <span className="text-muted-foreground">({option.optionCode})</span>
                  </span>
                  <span className="text-muted-foreground">{option.status}</span>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Option code"
                  value={optionCode}
                  onChange={(event) => setOptionCode(event.target.value)}
                />
                <Input
                  placeholder="Option label"
                  value={optionLabel}
                  onChange={(event) => setOptionLabel(event.target.value)}
                />
              </div>
              <Button type="button" disabled={isProcessing} onClick={addOption}>
                Add Option
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "assignment" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{ATTRIBUTE_UI_LABELS.assignmentHeading}</CardTitle>
              <CardDescription>{ATTRIBUTE_UI_LABELS.assignmentDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.scopes.map((scope) => (
                <div
                  key={scope.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {scope.scopeType}
                    {scope.productTypeCode ? `: ${scope.productTypeCode}` : ""}
                    {scope.classificationId ? `: ${scope.classificationId}` : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => removeScope(scope.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="productType">Product Type</Label>
                  <select
                    id="productType"
                    className="flex h-10 min-w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={scopeProductType}
                    onChange={(event) => setScopeProductType(event.target.value)}
                  >
                    {workspace.productTypes.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  disabled={isProcessing || !scopeProductType}
                  onClick={assignProductTypeScope}
                >
                  Assign to Product Type
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <Card>
          <CardHeader>
            <CardTitle>{ATTRIBUTE_UI_LABELS.timelineHeading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspace.timeline.events.map((event) => (
              <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{event.summary}</p>
                <p className="text-xs text-muted-foreground">{event.eventDateTime}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "audit-history" ? (
        <Card>
          <CardHeader>
            <CardTitle>{ATTRIBUTE_UI_LABELS.auditHeading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspace.audit.entries.map((entry) => (
              <div key={entry.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{entry.operationLabel}</p>
                <p className="text-xs text-muted-foreground">{entry.changedDateTime}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result && activeTab !== "overview" && result.message ? (
        <p className="text-sm text-muted-foreground">{result.message}</p>
      ) : null}
    </main>
  );
}
