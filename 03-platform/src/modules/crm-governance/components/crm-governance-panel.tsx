/**
 * Party CRM governance panel (Settings contribution).
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
  detectCrmDuplicatesAction,
  runCrmGovernanceValidationAction,
  toggleCrmGovernanceLockAction,
  updateCrmGovernanceNotesAction,
  updateCrmGovernanceOwnershipAction,
} from "@/modules/crm-governance/actions/crm-governance-actions";
import { CRM_GOVERNANCE_CHECKLIST_STATUSES } from "@/modules/crm-governance/constants";
import type { CrmPartyGovernancePanelView } from "@/modules/crm-governance/types";

type Props = {
  partyId: string;
  initialData: CrmPartyGovernancePanelView;
};

type OwnershipFormValues = {
  ownerUserId: string;
  relationshipManagerUserId: string;
  stewardUserId: string;
  notes: string;
};

function ChecklistIcon({ status }: { status: string }) {
  if (status === CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED) {
    return <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />;
  }
  if (status === CRM_GOVERNANCE_CHECKLIST_STATUSES.WARNING) {
    return <AlertTriangleIcon className="size-4 text-amber-600" aria-hidden />;
  }
  return <CircleIcon className="size-4 text-muted-foreground" aria-hidden />;
}

function buildForm(data: CrmPartyGovernancePanelView): OwnershipFormValues {
  return {
    ownerUserId: textFieldValue(data.ownerUserId),
    relationshipManagerUserId: textFieldValue(data.relationshipManagerUserId),
    stewardUserId: textFieldValue(data.stewardUserId),
    notes: textFieldValue(data.notes),
  };
}

export function CrmGovernancePanel({ partyId, initialData }: Props) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const { isPending, runPanelAction, FormFeedback } =
    usePanelFeedback<CrmPartyGovernancePanelView>();
  const ownershipForm = useControlledForm<OwnershipFormValues>({
    initial: buildForm(panel),
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    ownershipForm.reset(buildForm(initialData));
  }

  function applyPanel(data: CrmPartyGovernancePanelView) {
    setPanel(data);
    ownershipForm.reset(buildForm(data));
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
          <ShieldCheckIcon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Party governance
          </h1>
          <p className="text-sm text-muted-foreground">
            {panel.partyDisplayName} · {panel.architectureNote}
          </p>
        </div>
      </div>

      <FormFeedback />

      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformKpiCard
          label="Readiness"
          value={panel.readinessScoreLabel}
        />
        <PlatformKpiCard label="Status" value={panel.governanceStatusLabel} />
        <PlatformKpiCard
          label="Activation"
          value={panel.activationBlocked ? "Blocked" : "Allowed"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ownership</CardTitle>
          <CardDescription>
            Platform user IDs (owner / relationship manager / steward).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["ownerUserId", "Owner"],
                ["relationshipManagerUserId", "Relationship manager"],
                ["stewardUserId", "Steward"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field}>{label}</Label>
                <select
                  id={field}
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={!panel.editable || isPending}
                  value={ownershipForm.values[field]}
                  onChange={(e) =>
                    ownershipForm.setField(field, e.target.value)
                  }
                >
                  <option value="">— Unassigned —</option>
                  {panel.ownerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              disabled={!panel.editable || isPending}
              value={ownershipForm.values.notes}
              onChange={(event) =>
                ownershipForm.setField("notes", event.target.value)
              }
              placeholder="Governance notes…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <PlatformProcessingButton
              type="button"
              disabled={!panel.editable}
              isProcessing={isPending}
              processingLabel="Saving…"
              idleLabel="Save ownership"
              onClick={() =>
                runPanelAction(
                  () =>
                    updateCrmGovernanceOwnershipAction({
                      partyId,
                      ownerUserId:
                        ownershipForm.textValue("ownerUserId") || undefined,
                      relationshipManagerUserId:
                        ownershipForm.textValue("relationshipManagerUserId") ||
                        undefined,
                      stewardUserId:
                        ownershipForm.textValue("stewardUserId") || undefined,
                    }),
                  {
                    successTitle: "Ownership updated.",
                    successMessage: "Ownership and readiness were refreshed.",
                    onSuccess: applyPanel,
                  }
                )
              }
            />
            <Button
              type="button"
              variant="outline"
              disabled={!panel.editable || isPending}
              onClick={() =>
                runPanelAction(
                  () =>
                    updateCrmGovernanceNotesAction({
                      partyId,
                      notes: ownershipForm.textValue("notes"),
                    }),
                  {
                    successTitle: "Notes saved.",
                    successMessage: "Governance notes were updated.",
                    onSuccess: applyPanel,
                  }
                )
              }
            >
              Save notes
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                runPanelAction(
                  () =>
                    toggleCrmGovernanceLockAction({
                      partyId,
                      isLocked: !panel.isLocked,
                    }),
                  {
                    successTitle: panel.isLocked
                      ? "Governance unlocked."
                      : "Governance locked.",
                    successMessage: panel.isLocked
                      ? "Changes are allowed again."
                      : "Governance changes are now locked.",
                    onSuccess: applyPanel,
                  }
                )
              }
            >
              {panel.isLocked ? "Unlock" : "Lock"}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() =>
                runPanelAction(
                  () => runCrmGovernanceValidationAction({ partyId }),
                  {
                    successTitle: "Validation complete.",
                    successMessage:
                      "Readiness score and governance status were recalculated.",
                    onSuccess: applyPanel,
                  }
                )
              }
            >
              Run validation
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                runPanelAction(
                  async () => {
                    const result = await detectCrmDuplicatesAction({ partyId });
                    if (!result.success) return result;
                    return runCrmGovernanceValidationAction({ partyId });
                  },
                  {
                    successTitle: "Duplicate detection completed.",
                    successMessage:
                      "Matching parties were queued when not already pending.",
                    onSuccess: applyPanel,
                  }
                )
              }
            >
              Detect duplicates
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness checklist</CardTitle>
          <CardDescription>ENG-003l local foundation.</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.checklist.length === 0 ? (
            <PlatformEmptyState
              title="No checklist items"
              description="Defaults seed on first open."
            />
          ) : (
            <ul className="space-y-2">
              {panel.checklist.map((item) => (
                <li
                  key={item.code}
                  className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <ChecklistIcon status={item.status} />
                  <div>
                    <p className="font-medium">
                      {item.name}
                      {item.isMandatory ? " *" : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {item.statusLabel}
                      {item.detail ? ` — ${item.detail}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {panel.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {panel.history.map((row) => (
                <li key={row.id} className="border-b py-1">
                  <span className="font-medium">{row.changeTypeLabel}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {new Date(row.changeDate).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
