/**
 * Purpose:
 * Group Workspace page — overview and members.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { redirect } from "next/navigation";

import { getPartyGroupMembersPanelAction } from "@/modules/party/actions/party-group-actions";
import { PartyGroupWorkspace } from "@/modules/party/components/party-group-workspace";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function GroupWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { groupId } = await params;
  const { tab } = await searchParams;
  const result = await getPartyGroupMembersPanelAction(groupId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Group Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  const initialTab = tab === "members" ? "members" : tab ?? "overview";

  return (
    <PartyGroupWorkspace
      partyGroupId={groupId}
      initialData={result.data}
      initialTab={initialTab}
    />
  );
}
