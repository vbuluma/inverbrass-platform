/**
 * Purpose:
 * Product Workspace Governance panel — ownership, readiness, checklist, history.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";

import {
  PlatformEmptyState,
  PlatformKpiCard,
  PlatformProcessingButton,
  usePanelFeedback,
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
import { useControlledForm } from "@/lib/forms";
import { textFieldValue } from "@/lib/forms/form-field-values";
import {
  runOfferingGovernanceValidationAction,
  toggleOfferingGovernanceLockAction,
  updateOfferingGovernanceNotesAction,
  updateOfferingGovernanceOwnershipAction,
} from "@/modules/product/actions/offering-governance-actions";
import { OFFERING_GOVERNANCE_CHECKLIST_STATUSES } from "@/modules/product/constants";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { ProductGovernancePanelView } from "@/modules/product/types";

type ProductGovernancePanelProps = {
  productId: string;
  initialData: ProductGovernancePanelView;
  disabled?: boolean;
};

type OwnershipFormValues = {
  responsibleBusinessOwnerPartyId: string;
  technicalOwnerPartyId: string;
  productStewardPartyId: string;
  notes: string;
};

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ChecklistIcon({ status }: { status: string }) {
  if (status === OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED) {
    return <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />;
  }
  if (status === OFFERING_GOVERNANCE_CHECKLIST_STATUSES.WARNING) {
    return <AlertTriangleIcon className="size-4 text-amber-600" aria-hidden />;
  }
  return <CircleIcon className="size-4 text-muted-foreground" aria-hidden />;
}

function buildOwnershipForm(data: ProductGovernancePanelView): OwnershipFormValues {
  return {
    responsibleBusinessOwnerPartyId: textFieldValue(
      data.responsibleBusinessOwnerPartyId
    ),
    technicalOwnerPartyId: textFieldValue(data.technicalOwnerPartyId),
    productStewardPartyId: textFieldValue(data.productStewardPartyId),
    notes: textFieldValue(data.notes),
  };
}

export function ProductGovernancePanel({
  productId,
  initialData,
  disabled = false,
}: ProductGovernancePanelProps) {
  const { governance: uiLabels } = useProductUiLabels();
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const { isPending, runPanelAction, FormFeedback } =
    usePanelFeedback<ProductGovernancePanelView>();

  const ownershipForm = useControlledForm<OwnershipFormValues>({
    initial: buildOwnershipForm(panel),
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    ownershipForm.reset(buildOwnershipForm(initialData));
  }

  function applyPanel(data: ProductGovernancePanelView) {
    setPanel(data);
    ownershipForm.reset(buildOwnershipForm(data));
  }

  function onSaveOwnership() {
    runPanelAction(
      () =>
        updateOfferingGovernanceOwnershipAction({
          offeringId: productId,
          responsibleBusinessOwnerPartyId:
            ownershipForm.textValue("responsibleBusinessOwnerPartyId") ||
            undefined,
          technicalOwnerPartyId:
            ownershipForm.textValue("technicalOwnerPartyId") || undefined,
          productStewardPartyId:
            ownershipForm.textValue("productStewardPartyId") || undefined,
        }),
      {
        successTitle: "Ownership updated.",
        successMessage: "Governance ownership and readiness were refreshed.",
        onSuccess: applyPanel,
      }
    );
  }

  function onSaveNotes() {
    runPanelAction(
      () =>
        updateOfferingGovernanceNotesAction({
          offeringId: productId,
          notes: ownershipForm.textValue("notes"),
        }),
      {
        successTitle: "Notes saved.",
        successMessage: "Governance notes were updated.",
        onSuccess: applyPanel,
      }
    );
  }

  function onRunValidation() {
    runPanelAction(
      () => runOfferingGovernanceValidationAction({ offeringId: productId }),
      {
        successTitle: "Validation complete.",
        successMessage: "Readiness score and governance status were recalculated.",
        onSuccess: applyPanel,
      }
    );
  }

  function onToggleLock() {
    runPanelAction(
      () =>
        toggleOfferingGovernanceLockAction({
          offeringId: productId,
          isLocked: !panel.isLocked,
        }),
      {
        successTitle: panel.isLocked ? "Governance unlocked." : "Governance locked.",
        successMessage: panel.isLocked
          ? "Changes are allowed again."
          : "Governance changes are now locked.",
        onSuccess: applyPanel,
      }
    );
  }

  const isEditable = panel.editable && !disabled;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-5 text-sky-700" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">
            {uiLabels.panelTitle}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {uiLabels.panelDescription}
        </p>
      </div>

      <FormFeedback />

      <div className="flex flex-wrap gap-2">
        <PlatformProcessingButton
          type="button"
          isProcessing={isPending}
          processingLabel="Validating…"
          idleLabel={uiLabels.runValidation}
          onClick={onRunValidation}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isPending}
          onClick={onToggleLock}
        >
          {panel.isLocked
            ? uiLabels.unlockGovernance
            : uiLabels.lockGovernance}
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard
          label={uiLabels.governanceStatus}
          value={panel.governanceStatusLabel}
        />
        <PlatformKpiCard
          label={uiLabels.readinessScore}
          value={panel.readinessScoreLabel}
        />
        <PlatformKpiCard
          label={uiLabels.lastValidation}
          value={formatDateTime(panel.lastValidationDate)}
        />
        <PlatformKpiCard
          label={uiLabels.locked}
          value={panel.isLocked ? "Yes" : "No"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{uiLabels.sectionOwnership}</CardTitle>
          <CardDescription>
            {uiLabels.ownershipSectionDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="governance-business-owner">
              {uiLabels.businessOwner}
            </Label>
            <select
              id="governance-business-owner"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={ownershipForm.textValue("responsibleBusinessOwnerPartyId")}
              disabled={!isEditable || isPending}
              onChange={(event) =>
                ownershipForm.setField(
                  "responsibleBusinessOwnerPartyId",
                  event.target.value
                )
              }
            >
              <option value="">Select owner…</option>
              {panel.ownerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="governance-technical-owner">
              {uiLabels.technicalOwner}
            </Label>
            <select
              id="governance-technical-owner"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={ownershipForm.textValue("technicalOwnerPartyId")}
              disabled={!isEditable || isPending}
              onChange={(event) =>
                ownershipForm.setField("technicalOwnerPartyId", event.target.value)
              }
            >
              <option value="">Select owner…</option>
              {panel.ownerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="governance-steward">
              {uiLabels.offeringSteward}
            </Label>
            <select
              id="governance-steward"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={ownershipForm.textValue("productStewardPartyId")}
              disabled={!isEditable || isPending}
              onChange={(event) =>
                ownershipForm.setField("productStewardPartyId", event.target.value)
              }
            >
              <option value="">Select steward…</option>
              {panel.ownerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              processingLabel="Saving…"
              idleLabel={uiLabels.saveOwnership}
              onClick={onSaveOwnership}
              disabled={!isEditable}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiLabels.sectionReadinessChecklist}</CardTitle>
        </CardHeader>
        <CardContent>
          {panel.checklist.length === 0 ? (
            <PlatformEmptyState
              title={uiLabels.noChecklist}
              description="Configure checklist definitions for this business."
            />
          ) : (
            <ul className="space-y-3">
              {panel.checklist.map((item) => (
                <li
                  key={item.code}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <ChecklistIcon status={item.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.isMandatory ? (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">
                          Mandatory
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {item.statusLabel}
                      </span>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    {item.detail ? (
                      <p className="mt-1 text-sm text-amber-700">{item.detail}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiLabels.sectionValidationResults}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {panel.validationResults.map((result) => (
              <li
                key={result.label}
                className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span>{result.label}</span>
                <span className="text-muted-foreground">{result.statusLabel}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiLabels.notes}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={ownershipForm.textValue("notes")}
            disabled={!isEditable || isPending}
            onChange={(event) => ownershipForm.setField("notes", event.target.value)}
            placeholder="Governance notes…"
          />
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Saving…"
            idleLabel={uiLabels.saveNotes}
            onClick={onSaveNotes}
            disabled={!isEditable}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiLabels.sectionGovernanceHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {panel.history.length === 0 ? (
            <PlatformEmptyState
              title={uiLabels.noHistory}
              description="Ownership, readiness, and validation changes will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {panel.history.map((entry) => (
                <li key={entry.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{entry.changeTypeLabel}</span>
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.changeDate)}
                    </span>
                  </div>
                  {entry.oldValue || entry.newValue ? (
                    <p className="mt-1 text-muted-foreground">
                      {entry.oldValue ?? "—"} → {entry.newValue ?? "—"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
