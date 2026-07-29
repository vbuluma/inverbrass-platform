/**
 * Purpose:
 * Onboarding step page — Identity & Regulatory identifier capture after Party Registration.
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

import { redirect } from "next/navigation";

import { getPartyAction } from "@/modules/party/actions/party-actions";
import { listPartyIdentityRegulatoryAction } from "@/modules/party/actions/party-identity-regulatory-actions";
import { PartyIdentityRegulatoryOnboardingStep } from "@/modules/party/components/party-identity-regulatory-onboarding-step";

type PageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function PartyIdentityRegulatoryOnboardingPage({
  params,
}: PageProps) {
  const { partyId } = await params;

  const [partyResult, panelResult] = await Promise.all([
    getPartyAction(partyId),
    listPartyIdentityRegulatoryAction(partyId),
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
        <h1 className="text-xl font-semibold">Identity & Regulatory</h1>
        <p className="mt-2 text-sm text-muted-foreground">{partyResult.error.message}</p>
      </main>
    );
  }

  if (!panelResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Identity & Regulatory</h1>
        <p className="mt-2 text-sm text-muted-foreground">{panelResult.error.message}</p>
      </main>
    );
  }

  return (
    <PartyIdentityRegulatoryOnboardingStep
      party={partyResult.data}
      initialPanel={panelResult.data}
    />
  );
}
