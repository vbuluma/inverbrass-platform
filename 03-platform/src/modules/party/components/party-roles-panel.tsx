/**
 * Purpose:
 * Party Workspace Roles tab — assign, remove, set primary, view history.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const router = useRouter();
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [roleTypeCode, setRoleTypeCode] = useState(
    initialData.availableRoleTypes[0]?.code ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setRoleTypeCode(initialData.availableRoleTypes[0]?.code ?? "");
  }

  function applyResult(
    result: { success: true; data: PartyRolesPanelView } | {
      success: false;
      error: { message: string };
    },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setPanel(result.data);
    setRoleTypeCode(result.data.availableRoleTypes[0]?.code ?? "");
    router.refresh();
  }

  function onAssign() {
    if (!roleTypeCode) {
      setError("Select a role type.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await assignPartyRoleAction(partyId, { roleTypeCode });
      applyResult(result, "Role assigned.");
    });
  }

  function onRemove(partyRoleId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await removePartyRoleAction(partyId, partyRoleId);
      applyResult(result, "Role ended and retained in history.");
    });
  }

  function onSetPrimary(partyRoleId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      // Dedicated action — always runs changePrimaryRole (clear previous + set new).
      // Avoids updateRole fallthrough that only touches updatedBy when isPrimary
      // is missing from the shared update payload.
      const result = await setPrimaryPartyRoleAction(partyId, partyRoleId);
      applyResult(result, "Primary role updated.");
    });
  }

  function onReactivate(partyRoleId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePartyRoleAction(partyId, partyRoleId, {
        reactivate: true,
      });
      applyResult(result, "Role reactivated.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Roles</CardTitle>
            <CardDescription>
              A Party may hold multiple active roles. One may be primary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {panel.activeRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active roles yet. Assign a role to begin.
              </p>
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
                        variant="outline"
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
              <p className="text-sm text-muted-foreground">
                No historical roles.
              </p>
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
          <CardTitle className="text-base">Assign New Role</CardTitle>
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
          <Button
            type="button"
            disabled={isPending || panel.availableRoleTypes.length === 0}
            onClick={onAssign}
            className="w-full"
          >
            {isPending ? "Saving…" : "Assign Role"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
