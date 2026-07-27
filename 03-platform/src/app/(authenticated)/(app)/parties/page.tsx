/**
 * Purpose:
 * Party Dashboard page for ACTIVE businesses.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { redirect } from "next/navigation";

import { getPartyDashboardAction } from "@/modules/party/actions/party-actions";
import { PartyDashboard } from "@/modules/party/components/party-dashboard";

export default async function PartiesPage() {
  const result = await getPartyDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return <PartyDashboard data={result.data} />;
}
