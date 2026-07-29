/**
 * Purpose:
 * Party Groups dashboard page.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { redirect } from "next/navigation";

import { getPartyGroupDashboardAction } from "@/modules/party/actions/party-group-actions";
import { PartyGroupDashboard } from "@/modules/party/components/party-group-dashboard";

export default async function GroupsPage() {
  const result = await getPartyGroupDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Groups</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return <PartyGroupDashboard data={result.data} />;
}
