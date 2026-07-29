/**
 * Purpose:
 * Party Workspace Roles tab — assign, remove, set primary, view history.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

"use client";

import { useState } from "react";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useFormDraft,
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
import { Label } from "@/components/ui/label";
import {
  assignPartyRoleAction,
  removePartyRoleAction,
  setPrimaryPartyRoleAction,
  updatePartyRoleAction,
} from "@/modules/party/actions/party-role-actions";
import type { PartyRolesPanelView } from "@/modules/party/types";

type PartyRolesPanelProps = {
  partyId: string;
  initialData: PartyRolesPanelView;
};

export function PartyRolesPanel({
  partyId,
  initialData,
}: PartyRolesPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const {
    isPending,
    runPanelAction,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyRolesPanelView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{ roleTypeCode: string }>(
    `party-${partyId}-roles-create-draft`
  );
  const [roleTypeCode, setRoleTypeCode] = useState(
    () =>
      draftValues?.roleTypeCode ??
      initialData.availableRoleTypes[0]?.code ??
      ""
  );

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setRoleTypeCode(initialData.availableRoleTypes[0]?.code ?? "");
  }

  function applySuccess(data: PartyRolesPanelView) {
    setPanel(data);
    setRoleTypeCode(data.availableRoleTypes[0]?.code ?? "");
  }

  function onAssign() {
    if (!roleTypeCode) {
      setValidationError("Select a role type.");
      return;
    }
    runPanelAction(() => assignPartyRoleAction(partyId, { roleTypeCode }), {
      successTitle: "Role assigned.",
      successMessage: "The role is now active on this party.",
      onSuccess: (data) => {
        applySuccess(data);
        clearDraft();
      },
    });
  }

  function onSaveDraft() {
    saveDraft({ roleTypeCode });
  }

  function onRemove(partyRoleId: string) {
    requestConfirm({
      title: "Remove Role?",
      description:
        "This role will be ended and retained in history. It cannot be undone from this screen.",
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(() => removePartyRoleAction(partyId, partyRoleId), {
          successTitle: "Role removed.",
          successMessage: "The role was ended and retained in history.",
          onSuccess: applySuccess,
        });
      },
    });
  }

  function onSetPrimary(partyRoleId: string) {
    runPanelAction(() => setPrimaryPartyRoleAction(partyId, partyRoleId), {
      successTitle: "Primary role updated.",
      successMessage: "The primary role for this party was changed.",
      onSuccess: applySuccess,
    });
  }

  function onReactivate(partyRoleId: string) {
    runPanelAction(
      () =>
        updatePartyRoleAction(partyId, partyRoleId, {
          reactivate: true,
        }),
      {
        successTitle: "Role reactivated.",
        successMessage: "The role is active again.",
        onSuccess: applySuccess,
      }
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Roles</CardTitle>
            <CardDescription>
              A Party may hold multiple active roles. One may be primary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {panel.activeRoles.length === 0 ? (
              <PlatformEmptyState
                title="No Active Roles Yet"
                description="Assign a role to define how this party participates in the platform."
                actionLabel="Assign Role"
                onAction={() =>
                  document.getElementById("roleTypeCode")?.focus()
                }
                compact
              />
            ) : (
              <ul className="space-y-2">
                {panel.activeRoles.map((role) => (
                  <li
                    key={role.id}
                    className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        ✓ {role.roleTypeName}
                        {role.isPrimary ? (
                          <span className="ml-2 text-xs font-medium text-emerald-800">
                            Primary
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Effective {role.effectiveDate}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!role.isPrimary ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => onSetPrimary(role.id)}
                        >
                          Set Primary
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => onRemove(role.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role History</CardTitle>
            <CardDescription>
              Ended roles are retained for audit — never physically deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {panel.historyRoles.length === 0 ? (
              <PlatformEmptyState
                title="No Role History"
                description="Ended roles will appear here when a role is removed."
                compact
              />
            ) : (
              <ul className="space-y-2">
                {panel.historyRoles.map((role) => (
                  <li
                    key={role.id}
                    className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{role.roleTypeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.effectiveDate}
                        {role.endDate ? ` → ${role.endDate}` : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => onReactivate(role.id)}
                    >
                      Reactivate
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Assign Role</CardTitle>
          <CardDescription>
            Role types come from configurable reference data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleTypeCode">Role Type</Label>
            <select
              id="roleTypeCode"
              value={roleTypeCode}
              onChange={(event) => setRoleTypeCode(event.target.value)}
              disabled={
                isPending || panel.availableRoleTypes.length === 0
              }
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {panel.availableRoleTypes.length === 0 ? (
                <option value="">All role types assigned</option>
              ) : (
                panel.availableRoleTypes.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <PlatformProcessingButton
            type="button"
            disabled={isPending || panel.availableRoleTypes.length === 0}
            onClick={onAssign}
            className="w-full"
            isProcessing={isPending}
            processingLabel={PROCESSING_LABELS.assigningRole}
            idleLabel="Assign Role"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={onSaveDraft}
          >
            Save Draft
          </Button>
          <FormFeedback
            processingLabel={PROCESSING_LABELS.assigningRole}
            draftSavedAt={draftSavedAt}
          />
        </CardContent>
      </Card>
      <ConfirmDialogHost />
    </div>
  );
}
