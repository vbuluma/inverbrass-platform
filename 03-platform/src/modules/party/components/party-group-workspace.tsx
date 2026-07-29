/**
 * Purpose:
 * Group Workspace — Overview, Members, and future tabs.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
  PlatformSearchState,
  PlatformTabs,
  PROCESSING_LABELS,
  type PlatformSearchStateStatus,
  useFormDraft,
  usePanelFeedback,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
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
  addPartyGroupMemberAction,
  deactivatePartyGroupAction,
  exitPartyGroupMemberAction,
  reactivatePartyGroupAction,
  rejoinPartyGroupMemberAction,
  searchPartiesForGroupMemberAction,
  updatePartyGroupAction,
  updatePartyGroupMemberAction,
} from "@/modules/party/actions/party-group-actions";
import {
  FUTURE_TAB_MESSAGE,
  GROUP_WORKSPACE_TABS,
  PARTY_GROUP_MEMBER_STATUS_CODES,
  PARTY_GROUP_STATUS_CODES,
} from "@/modules/party/constants";
import type {
  PartyGroupMemberView,
  PartyGroupMembersPanelView,
  PartySearchResultView,
} from "@/modules/party/types";

type PartyGroupWorkspaceProps = {
  partyGroupId: string;
  initialData: PartyGroupMembersPanelView;
  initialTab?: string;
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

export function PartyGroupWorkspace({
  partyGroupId,
  initialData,
  initialTab = "overview",
}: PartyGroupWorkspaceProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const {
    isPending,
    runPanelAction,
    clearResult,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyGroupMembersPanelView>();
  const {
    draftValues: overviewDraftValues,
    saveDraft: saveOverviewDraft,
    clearDraft: clearOverviewDraft,
    draftSavedAt: overviewDraftSavedAt,
  } = useFormDraft<{
    editGroupName: string;
    editDescription: string;
  }>(`party-group-${partyGroupId}-overview-draft`);
  const {
    draftValues: memberDraftValues,
    saveDraft: saveMemberDraft,
    clearDraft: clearMemberDraft,
    draftSavedAt: memberDraftSavedAt,
  } = useFormDraft<{
    searchQuery: string;
    selectedPartyId: string;
    membershipRoleCode: string;
    joinDate: string;
    isPrimaryContact: boolean;
    memberNotes: string;
  }>(`party-group-${partyGroupId}-members-create-draft`);

  const [editGroupName, setEditGroupName] = useState(
    () => overviewDraftValues?.editGroupName ?? initialData.group.groupName
  );
  const [editDescription, setEditDescription] = useState(
    () => overviewDraftValues?.editDescription ?? initialData.group.description ?? ""
  );

  const [searchQuery, setSearchQuery] = useState(
    () => memberDraftValues?.searchQuery ?? ""
  );
  const [searchResults, setSearchResults] = useState<PartySearchResultView[]>(
    []
  );
  const [selectedPartyId, setSelectedPartyId] = useState(
    () => memberDraftValues?.selectedPartyId ?? ""
  );
  const [membershipRoleCode, setMembershipRoleCode] = useState(
    () =>
      memberDraftValues?.membershipRoleCode ??
      initialData.availableMembershipRoles[0]?.code ??
      ""
  );
  const [joinDate, setJoinDate] = useState(
    () => memberDraftValues?.joinDate ?? ""
  );
  const [isPrimaryContact, setIsPrimaryContact] = useState(() =>
    Boolean(memberDraftValues?.isPrimaryContact)
  );
  const [memberNotes, setMemberNotes] = useState(
    () => memberDraftValues?.memberNotes ?? ""
  );
  const [searchStatus, setSearchStatus] =
    useState<PlatformSearchStateStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setEditGroupName(initialData.group.groupName);
    setEditDescription(initialData.group.description ?? "");
    setMembershipRoleCode(
      initialData.availableMembershipRoles[0]?.code ?? ""
    );
  }

  const group = panel.group;
  const activeTabLabel =
    GROUP_WORKSPACE_TABS.find((tab) => tab.id === activeTab)?.label ??
    "Overview";

  const breadcrumbs = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Groups", href: "/groups" },
      { label: group.groupName, href: `/groups/${partyGroupId}` },
      { label: activeTabLabel },
    ],
    [group.groupName, partyGroupId, activeTabLabel]
  );

  function applySuccess(data: PartyGroupMembersPanelView) {
    setPanel(data);
    setEditGroupName(data.group.groupName);
    setEditDescription(data.group.description ?? "");
  }

  function onSaveOverview() {
    runPanelAction(
      () =>
        updatePartyGroupAction(partyGroupId, {
          groupName: editGroupName,
          description: editDescription,
        }),
      {
        successTitle: "Group updated.",
        successMessage: "Group details were saved.",
        onSuccess: (data) => {
          applySuccess(data);
          clearOverviewDraft();
        },
      }
    );
  }

  function onSaveOverviewDraft() {
    saveOverviewDraft({
      editGroupName,
      editDescription,
    });
  }

  function runGroupLifecycle(
    action: typeof deactivatePartyGroupAction | typeof reactivatePartyGroupAction,
    confirm?: { title: string; description: string; confirmLabel: string }
  ) {
    const execute = () => {
      runPanelAction(() => action(partyGroupId), {
        successTitle: "Group status updated.",
        successMessage: "The group status was changed.",
        onSuccess: applySuccess,
      });
    };

    if (confirm) {
      requestConfirm({
        ...confirm,
        onConfirm: execute,
      });
      return;
    }

    execute();
  }

  function onDeactivateGroup() {
    runGroupLifecycle(deactivatePartyGroupAction, {
      title: "Deactivate Group?",
      description:
        "This group will be deactivated. Members cannot be added until it is reactivated.",
      confirmLabel: "Deactivate",
    });
  }

  function onReactivateGroup() {
    runGroupLifecycle(reactivatePartyGroupAction);
  }

  function onSearchParty() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setValidationError("Enter at least 2 characters to search.");
      return;
    }
    setSearchError(null);
    setSearchResults([]);
    setSelectedPartyId("");
    setSearchStatus("searching");
    runPanelAction(
      async () => {
        try {
          const result = await searchPartiesForGroupMemberAction(
            partyGroupId,
            query
          );
          if (!result.success) {
            setSearchStatus("error");
            setSearchError(result.error.message);
            return result;
          }

          const activeMemberIds = new Set(
            panel.members
              .filter(
                (member) =>
                  member.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
              )
              .map((member) => member.partyId)
          );

          const available = result.data.filter(
            (party) => !activeMemberIds.has(party.id)
          );

          setSearchResults(available);
          setSelectedPartyId(available[0]?.id ?? "");
          setSearchStatus(available.length > 0 ? "success" : "empty");

          return { success: true, data: panel };
        } catch {
          setSearchStatus("error");
          setSearchError("Unable to complete search.");
          return {
            success: false,
            error: { code: "SEARCH_FAILED", message: "Unable to complete search." },
          };
        }
      },
      {
        successTitle: "Search complete.",
        successMessage: "Select a party from the results.",
        onSuccess: () => clearResult(),
      }
    );
  }

  function onAddMember() {
    if (!selectedPartyId) {
      setValidationError("Search and select a party.");
      return;
    }
    if (!membershipRoleCode) {
      setValidationError("Select a membership role.");
      return;
    }
    runPanelAction(
      () =>
        addPartyGroupMemberAction(partyGroupId, {
          partyId: selectedPartyId,
          membershipRoleCode,
          joinDate: joinDate || undefined,
          isPrimaryContact,
          notes: memberNotes,
        }),
      {
        successTitle: "Member added.",
        successMessage: "The party was added to this group.",
        onSuccess: (data) => {
          applySuccess(data);
          setSearchQuery("");
          setSearchResults([]);
          setSelectedPartyId("");
          setJoinDate("");
          setMemberNotes("");
          setIsPrimaryContact(false);
          setSearchStatus("idle");
          setSearchError(null);
          clearMemberDraft();
        },
      }
    );
  }

  function onSaveMemberDraft() {
    saveMemberDraft({
      searchQuery,
      selectedPartyId,
      membershipRoleCode,
      joinDate,
      isPrimaryContact,
      memberNotes,
    });
  }

  function onExitMember(partyGroupMemberId: string) {
    requestConfirm({
      title: "Remove Group Member?",
      description:
        "This member will exit the group. Membership history will be retained.",
      confirmLabel: "Remove Member",
      onConfirm: () => {
        runPanelAction(
          () => exitPartyGroupMemberAction(partyGroupId, partyGroupMemberId),
          {
            successTitle: "Member removed.",
            successMessage: "The member is no longer active in this group.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  function onRejoinMember(partyGroupMemberId: string) {
    runPanelAction(
      () => rejoinPartyGroupMemberAction(partyGroupId, partyGroupMemberId),
      {
        successTitle: "Member rejoined.",
        successMessage: "The member is active again in this group.",
        onSuccess: applySuccess,
      }
    );
  }

  function onTogglePrimaryContact(member: PartyGroupMemberView) {
    runPanelAction(
      () =>
        updatePartyGroupMemberAction(partyGroupId, member.id, {
          isPrimaryContact: !member.isPrimaryContact,
        }),
      {
        successTitle: "Primary contact updated.",
        successMessage: "The primary contact designation was changed.",
        onSuccess: applySuccess,
      }
    );
  }

  const activeMembers = panel.members.filter(
    (m) => m.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
  );
  const exitedMembers = panel.members.filter(
    (m) => m.statusCode !== PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <SetBreadcrumbs items={breadcrumbs} />
      <div className="space-y-3">
        <PageBackLink href="/groups" label="Back to Groups" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Group Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {group.groupName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {group.groupCode} · {group.groupTypeName} · {group.statusCode} ·{" "}
              {group.activeMemberCount} active member
              {group.activeMemberCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onReactivateGroup}
              >
                Reactivate
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onDeactivateGroup}
              >
                Deactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      <PlatformTabs
        tabs={GROUP_WORKSPACE_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Group workspace tabs"
      />

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>
                Group details. Groups aggregate parties — they are not
                organizations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Group Code" value={group.groupCode} />
                <ReadOnlyField label="Group Type" value={group.groupTypeName} />
                <ReadOnlyField label="Status" value={group.statusCode} />
                <ReadOnlyField
                  label="Country"
                  value={group.countryName ?? "—"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGroupName">Group Name</Label>
                <Input
                  id="editGroupName"
                  value={editGroupName}
                  onChange={(event) => setEditGroupName(event.target.value)}
                  maxLength={200}
                  disabled={
                    group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={
                    group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              {group.statusCode === PARTY_GROUP_STATUS_CODES.ACTIVE ? (
                <>
                  <PlatformProcessingButton
                    type="button"
                    disabled={isPending}
                    onClick={onSaveOverview}
                    isProcessing={isPending}
                    processingLabel={PROCESSING_LABELS.savingOverview}
                    idleLabel="Save Overview"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={onSaveOverviewDraft}
                  >
                    Save Draft
                  </Button>
                  <FormFeedback
                    processingLabel={PROCESSING_LABELS.savingOverview}
                    draftSavedAt={overviewDraftSavedAt}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Active Members" value={String(group.activeMemberCount)} />
              <SummaryRow label="Total Members" value={String(group.totalMemberCount)} />
              <SummaryRow label="Type" value={group.groupTypeName} />
              <SummaryRow label="Status" value={group.statusCode} />
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "members" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Members</CardTitle>
                <CardDescription>
                  Individuals and organizations in this group.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeMembers.length === 0 ? (
                  <PlatformEmptyState
                    title="No Members Yet"
                    description="Search for an existing party to add your first group member."
                    actionLabel="Add Member"
                    onAction={() =>
                      document.getElementById("memberSearch")?.focus()
                    }
                    compact
                  />
                ) : (
                  <MemberList
                    members={activeMembers}
                    isPending={isPending}
                    onExit={onExitMember}
                    onTogglePrimary={onTogglePrimaryContact}
                  />
                )}
              </CardContent>
            </Card>
            {exitedMembers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Membership History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MemberList
                    members={exitedMembers}
                    isPending={isPending}
                    onRejoin={onRejoinMember}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Add Member</CardTitle>
              <CardDescription>
                Search existing parties — membership never creates duplicate
                parties.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE ? (
                <p className="text-sm text-muted-foreground">
                  Reactivate this group before adding members.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="memberSearch">Search Party</Label>
                    <div className="flex gap-2">
                      <Input
                        id="memberSearch"
                        value={searchQuery}
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          setSearchStatus("idle");
                          setSearchError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onSearchParty();
                          }
                        }}
                        placeholder="Name, Party ID, mobile…"
                        disabled={searchStatus === "searching"}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={searchStatus === "searching" || isPending}
                        onClick={onSearchParty}
                      >
                        {searchStatus === "searching" ? "Searching…" : "Search"}
                      </Button>
                    </div>
                  </div>
                  <PlatformSearchState
                    status={searchStatus}
                    onRetry={onSearchParty}
                    errorMessage={searchError ?? undefined}
                    emptyHints={[
                      "Different keywords",
                      "Removing filters",
                      "Create a new party first",
                    ]}
                    compact
                  >
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="selectedMemberParty">Party</Label>
                        <select
                          id="selectedMemberParty"
                          value={selectedPartyId}
                          onChange={(event) =>
                            setSelectedPartyId(event.target.value)
                          }
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        >
                          {searchResults.map((result) => (
                            <option key={result.id} value={result.id}>
                              {result.displayName} ({result.partyNumber}) ·{" "}
                              {result.partyTypeName}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </PlatformSearchState>
                  <div className="space-y-2">
                    <Label htmlFor="memberRoleCode">Membership Role</Label>
                    <select
                      id="memberRoleCode"
                      value={membershipRoleCode}
                      onChange={(event) =>
                        setMembershipRoleCode(event.target.value)
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      {panel.availableMembershipRoles.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberJoinDate">Join Date (optional)</Label>
                    <Input
                      id="memberJoinDate"
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
                    Primary contact
                  </label>
                  <div className="space-y-2">
                    <Label htmlFor="memberNotes">Notes (optional)</Label>
                    <Input
                      id="memberNotes"
                      value={memberNotes}
                      onChange={(event) => setMemberNotes(event.target.value)}
                      maxLength={2000}
                    />
                  </div>
                  <PlatformProcessingButton
                    type="button"
                    className="w-full"
                    disabled={isPending}
                    onClick={onAddMember}
                    isProcessing={isPending}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel="Add Member"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isPending}
                    onClick={onSaveMemberDraft}
                  >
                    Save Draft
                  </Button>
                  <FormFeedback
                    processingLabel={PROCESSING_LABELS.saving}
                    draftSavedAt={memberDraftSavedAt}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {GROUP_WORKSPACE_TABS.find((tab) => tab.id === activeTab)?.label}
            </CardTitle>
            <CardDescription>{FUTURE_TAB_MESSAGE}</CardDescription>
          </CardHeader>
        </Card>
      )}
      <ConfirmDialogHost />
    </main>
  );
}

function MemberList({
  members,
  isPending,
  onExit,
  onRejoin,
  onTogglePrimary,
}: {
  members: PartyGroupMemberView[];
  isPending?: boolean;
  onExit?: (id: string) => void;
  onRejoin?: (id: string) => void;
  onTogglePrimary?: (member: PartyGroupMemberView) => void;
}) {
  return (
    <ul className="space-y-3">
      {members.map((member) => (
        <li
          key={member.id}
          className="space-y-2 rounded-lg border px-3 py-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">
              <Link
                href={`/parties/${member.partyId}`}
                className="text-emerald-900 hover:underline"
              >
                {member.partyName}
              </Link>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {member.partyNumber}
              </span>
            </p>
            <p className="text-sm">
              {member.membershipRoleName} · {member.partyTypeName}
              {member.isPrimaryContact ? (
                <span className="ml-2 text-xs text-emerald-800">
                  Primary contact
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              Joined {formatDate(member.joinDate)}
              {member.exitDate
                ? ` · Exited ${formatDate(member.exitDate)}`
                : ""}{" "}
              · {member.statusCode}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onTogglePrimary &&
            member.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onTogglePrimary(member)}
              >
                {member.isPrimaryContact
                  ? "Remove Primary"
                  : "Set Primary Contact"}
              </Button>
            ) : null}
            {onExit &&
            member.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => onExit(member.id)}
              >
                Remove Member
              </Button>
            ) : null}
            {onRejoin &&
            member.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.EXITED ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onRejoin(member.id)}
              >
                Rejoin
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
