/**
 * Purpose:
 * Party Group Dashboard — list groups, create new groups.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

"use client";

import { UsersRoundIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  groupCreatedNextActions,
  useFormDraft,
  usePanelFeedback,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
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
import { createPartyGroupAction } from "@/modules/party/actions/party-group-actions";
import { PARTY_GROUP_STATUS_CODES } from "@/modules/party/constants";
import type { PartyGroupDashboardView } from "@/modules/party/types";

type PartyGroupDashboardProps = {
  data: PartyGroupDashboardView;
};

export function PartyGroupDashboard({ data: initialData }: PartyGroupDashboardProps) {
  const [dashboard, setDashboard] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
    isPending,
    runPanelAction,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyGroupDashboardView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{
    groupName: string;
    groupCode: string;
    groupTypeCode: string;
    description: string;
    countryCode: string;
  }>("party-groups-create-draft");
  const [groupName, setGroupName] = useState(
    () => draftValues?.groupName ?? ""
  );
  const [groupCode, setGroupCode] = useState(
    () => draftValues?.groupCode ?? ""
  );
  const [groupTypeCode, setGroupTypeCode] = useState(
    () =>
      draftValues?.groupTypeCode ??
      initialData.availableGroupTypes[0]?.code ??
      ""
  );
  const [description, setDescription] = useState(
    () => draftValues?.description ?? ""
  );
  const [countryCode, setCountryCode] = useState(
    () => draftValues?.countryCode ?? ""
  );

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setDashboard(initialData);
    setGroupTypeCode(initialData.availableGroupTypes[0]?.code ?? "");
  }

  const activeGroups = dashboard.groups.filter(
    (g) => g.statusCode === PARTY_GROUP_STATUS_CODES.ACTIVE
  );
  const inactiveGroups = dashboard.groups.filter(
    (g) => g.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE
  );

  function onCreateGroup() {
    const createdCode = groupCode;
    runPanelAction(
      () =>
        createPartyGroupAction({
          groupName,
          groupCode,
          groupTypeCode,
          description,
          countryCode,
        }),
      {
        successTitle: "Group created successfully.",
        successMessage: "The group is ready for members.",
        nextActions: (data) => {
          const created = data.groups.find((g) => g.groupCode === createdCode);
          return created ? groupCreatedNextActions(created.id) : [];
        },
        onSuccess: (data) => {
          setDashboard(data);
          setGroupName("");
          setGroupCode("");
          setDescription("");
          setCountryCode("");
          setShowCreateForm(false);
          clearDraft();
        },
      }
    );
  }

  function onSaveDraft() {
    saveDraft({
      groupName,
      groupCode,
      groupTypeCode,
      description,
      countryCode,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/parties" label="Back to Parties" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <UsersRoundIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Party Groups
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Configurable collections of parties — Chamas, farmer groups,
              project teams, customer segments, and more.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
          >
            {showCreateForm ? "Cancel" : "Create Group"}
          </Button>
        </div>
      </div>

      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Group</CardTitle>
            <CardDescription>
              Groups are party aggregations — not organizations or
              organizational units.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupCode">Group Code</Label>
              <Input
                id="groupCode"
                value={groupCode}
                onChange={(event) => setGroupCode(event.target.value)}
                maxLength={50}
                placeholder="e.g. FG-NORTH-01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupTypeCode">Group Type</Label>
              <select
                id="groupTypeCode"
                value={groupTypeCode}
                onChange={(event) => setGroupTypeCode(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {dashboard.availableGroupTypes.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="countryCode">Country (optional)</Label>
              <select
                id="countryCode"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select country</option>
                {dashboard.countries.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <PlatformProcessingButton
                type="button"
                disabled={isPending}
                onClick={onCreateGroup}
                isProcessing={isPending}
                processingLabel={PROCESSING_LABELS.creatingGroup}
                idleLabel="Create Group"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onSaveDraft}
              >
                Save Draft
              </Button>
            </div>
            <div className="sm:col-span-2">
              <FormFeedback
                processingLabel={PROCESSING_LABELS.creatingGroup}
                draftSavedAt={draftSavedAt}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Groups</CardTitle>
          <CardDescription>
            {activeGroups.length} active group
            {activeGroups.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeGroups.length === 0 ? (
            <PlatformEmptyState
              title="No Groups Yet"
              description="Create your first group to start adding members."
              actionLabel="Create Group"
              onAction={() => setShowCreateForm(true)}
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Code</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Members</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeGroups.map((group) => (
                    <tr key={group.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {group.groupName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {group.groupCode}
                      </td>
                      <td className="py-3 pr-4">{group.groupTypeName}</td>
                      <td className="py-3 pr-4">{group.memberCount}</td>
                      <td className="py-3">
                        <Link
                          href={`/groups/${group.id}`}
                          className="text-emerald-800 underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {inactiveGroups.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inactive Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Code</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveGroups.map((group) => (
                    <tr key={group.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {group.groupName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {group.groupCode}
                      </td>
                      <td className="py-3 pr-4">{group.groupTypeName}</td>
                      <td className="py-3">
                        <Link
                          href={`/groups/${group.id}`}
                          className="text-emerald-800 underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialogHost />
    </main>
  );
}
