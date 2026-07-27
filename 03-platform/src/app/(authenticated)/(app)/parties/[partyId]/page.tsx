/**
 * Purpose:
 * Party Workspace page (Overview tab + future placeholders).
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { redirect } from "next/navigation";

import {
  getPartyAction,
  getPartyRegistrationCataloguesAction,
} from "@/modules/party/actions/party-actions";
import { PartyWorkspace } from "@/modules/party/components/party-workspace";

type PageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function PartyWorkspacePage({ params }: PageProps) {
  const { partyId } = await params;
  const [partyResult, cataloguesResult] = await Promise.all([
    getPartyAction(partyId),
    getPartyRegistrationCataloguesAction(),
  ]);

  if (!partyResult.success) {
    if (
      partyResult.error.code === "SESSION_REQUIRED" ||
      partyResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {partyResult.error.message}
        </p>
      </main>
    );
  }

  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <PartyWorkspace
      party={partyResult.data}
      catalogues={cataloguesResult.data}
    />
  );
}
