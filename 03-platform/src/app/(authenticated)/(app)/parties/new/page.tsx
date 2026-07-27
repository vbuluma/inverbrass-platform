/**
 * Purpose:
 * Party Registration page.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { redirect } from "next/navigation";

import { getPartyRegistrationCataloguesAction } from "@/modules/party/actions/party-actions";
import { PartyRegistrationForm } from "@/modules/party/components/party-registration-form";
import {
  PARTY_TYPE_CODES,
  type PartyTypeCode,
} from "@/modules/party/constants";

type PageProps = {
  searchParams: Promise<{ type?: string }>;
};

function resolveInitialType(value: string | undefined): PartyTypeCode | undefined {
  if (value === PARTY_TYPE_CODES.INDIVIDUAL) {
    return PARTY_TYPE_CODES.INDIVIDUAL;
  }
  if (value === PARTY_TYPE_CODES.ORGANIZATION) {
    return PARTY_TYPE_CODES.ORGANIZATION;
  }
  return undefined;
}

export default async function NewPartyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const catalogues = await getPartyRegistrationCataloguesAction();

  if (!catalogues.success) {
    if (
      catalogues.error.code === "SESSION_REQUIRED" ||
      catalogues.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Registration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {catalogues.error.message}
        </p>
      </main>
    );
  }

  return (
    <PartyRegistrationForm
      catalogues={catalogues.data}
      initialType={resolveInitialType(params.type)}
    />
  );
}
