/**
 * Purpose:
 * Party Workspace Groups tab — memberships, join group, leave, view group.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

"use client";

import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addPartyToGroupAction,
  leavePartyGroupAction,
} from "@/modules/party/actions/party-group-actions";
import {
  PARTY_GROUP_MEMBER_STATUS_CODES,
  PARTY_GROUP_STATUS_CODES,
} from "@/modules/party/constants";
import type {
  PartyGroupMembershipView,
  PartyGroupsPanelView,
} from "@/modules/party/types";

type PartyGroupsPanelProps = {
  partyId: string;
  initialData: PartyGroupsPanelView;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export function PartyGroupsPanel({
  partyId,
  initialData,
}: PartyGroupsPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const {
    isPending,
    runPanelAction,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyGroupsPanelView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{
    selectedGroupId: string;
    membershipRoleCode: string;
    joinDate: string;
    isPrimaryContact: boolean;
    notes: string;
  }>(`party-${partyId}-groups-create-draft`);
  const [selectedGroupId, setSelectedGroupId] = useState(
    () =>
      draftValues?.selectedGroupId ??
      initialData.availableGroups[0]?.id ??
      ""
  );
  const [membershipRoleCode, setMembershipRoleCode] = useState(
    () =>
      draftValues?.membershipRoleCode ??
      initialData.availableMembershipRoles[0]?.code ??
      ""
  );
  const [joinDate, setJoinDate] = useState(
    () => draftValues?.joinDate ?? ""
  );
  const [isPrimaryContact, setIsPrimaryContact] = useState(() =>
    Boolean(draftValues?.isPrimaryContact)
  );
  const [notes, setNotes] = useState(() => draftValues?.notes ?? "");

  if (partyId !== syncedPartyId) {
    setSyncedPartyId(partyId);
    setSelectedGroupId("");
    setJoinDate("");
    setNotes("");
    setIsPrimaryContact(false);
  }

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setSelectedGroupId(initialData.availableGroups[0]?.id ?? "");
    setMembershipRoleCode(
      initialData.availableMembershipRoles[0]?.code ?? ""
    );
  }

  const activeMemberships = panel.memberships.filter(
    (m) => m.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
  );
  const historyMemberships = panel.memberships.filter(
    (m) => m.statusCode !== PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
  );

  function applySuccess(data: PartyGroupsPanelView) {
    setPanel(data);
    setSelectedGroupId(data.availableGroups[0]?.id ?? "");
    setJoinDate("");
    setNotes("");
    setIsPrimaryContact(false);
  }

  function onJoinGroup() {
    if (!selectedGroupId) {
      setValidationError("Select a group to join.");
      return;
    }
    if (!membershipRoleCode) {
      setValidationError("Select a membership role.");
      return;
    }
    runPanelAction(
      () =>
        addPartyToGroupAction(partyId, {
          partyGroupId: selectedGroupId,
          membershipRoleCode,
          joinDate: joinDate || undefined,
          isPrimaryContact,
          notes,
        }),
      {
        successTitle: "Joined group.",
        successMessage: "This party is now a member of the selected group.",
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function onSaveDraft() {
    saveDraft({
      selectedGroupId,
      membershipRoleCode,
      joinDate,
      isPrimaryContact,
      notes,
    });
  }

  function onLeaveGroup(partyGroupMemberId: string) {
    requestConfirm({
      title: "Leave Group?",
      description:
        "This party will exit the group. Membership history will be retained.",
      confirmLabel: "Leave Group",
      onConfirm: () => {
        runPanelAction(
          () => leavePartyGroupAction(partyId, partyGroupMemberId),
          {
            successTitle: "Left group.",
            successMessage: "This party is no longer an active member.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Memberships</CardTitle>
            <CardDescription>
              Groups this party currently belongs to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeMemberships.length === 0 ? (
              <PlatformEmptyState
                title="No Group Memberships Yet"
                description="Join an existing group to associate this party with a collection."
                actionLabel="Join Group"
                onAction={() =>
                  document.getElementById("selectedGroup")?.focus()
                }
                compact
              />
            ) : (
              <MembershipList
                memberships={activeMemberships}
                isPending={isPending}
                onLeave={onLeaveGroup}
              />
            )}
          </CardContent>
        </Card>

        {historyMemberships.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membership History</CardTitle>
              <CardDescription>
                Past group memberships retained for audit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MembershipList memberships={historyMemberships} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Join Group</CardTitle>
          <CardDescription>
            Join an existing group. Create new groups from the{" "}
            <Link href="/groups" className="text-emerald-800 underline">
              Group Workspace
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {panel.availableGroups.length === 0 ? (
            <PlatformEmptyState
              title="No Groups Available"
              description="Create a group first, then return here to join it."
              actionLabel="Create Group"
              actionHref="/groups"
              compact
            />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="selectedGroup">Group</Label>
                <select
                  id="selectedGroup"
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select group</option>
                  {panel.availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName} ({group.groupCode}) ·{" "}
                      {group.groupTypeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="membershipRoleCode">Membership Role</Label>
                <select
                  id="membershipRoleCode"
                  value={membershipRoleCode}
                  onChange={(event) =>
                    setMembershipRoleCode(event.target.value)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select role</option>
                  {panel.availableMembershipRoles.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date (optional)</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={joinDate}
                  onChange={(event) => setJoinDate(event.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrimaryContact}
                  onChange={(event) =>
                    setIsPrimaryContact(event.target.checked)
                  }
                  className="size-4 rounded border-input"
                />
                Primary contact for this group
              </label>
              <div className="space-y-2">
                <Label htmlFor="membershipNotes">Notes (optional)</Label>
                <Input
                  id="membershipNotes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={2000}
                />
              </div>
              <PlatformProcessingButton
                type="button"
                className="w-full"
                isProcessing={isPending}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel="Join Group"
                onClick={onJoinGroup}
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
                processingLabel={PROCESSING_LABELS.saving}
                draftSavedAt={draftSavedAt}
              />
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDialogHost />
    </div>
  );
}

function MembershipList({
  memberships,
  isPending,
  onLeave,
}: {
  memberships: PartyGroupMembershipView[];
  isPending?: boolean;
  onLeave?: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {memberships.map((membership) => (
        <li
          key={membership.id}
          className="space-y-2 rounded-lg border px-3 py-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {membership.groupName}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {membership.groupCode}
              </span>
            </p>
            <p className="text-sm">
              {membership.groupTypeName} · {membership.membershipRoleName}
              {membership.isPrimaryContact ? (
                <span className="ml-2 text-xs text-emerald-800">
                  Primary contact
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              Joined {formatDate(membership.joinDate)}
              {membership.exitDate
                ? ` · Exited ${formatDate(membership.exitDate)}`
                : ""}{" "}
              · Status: {membership.statusCode}
              {membership.groupStatusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE
                ? ` · Group: ${membership.groupStatusCode}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/groups/${membership.partyGroupId}`}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              View Group
            </Link>
            {onLeave &&
            membership.statusCode ===
              PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => onLeave(membership.id)}
              >
                Leave Group
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
