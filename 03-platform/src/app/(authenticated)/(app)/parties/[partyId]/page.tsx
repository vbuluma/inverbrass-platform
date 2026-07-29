/**
 * Purpose:
 * Party Workspace page — loads Organization Structure and related panels.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import { redirect } from "next/navigation";

import {
  getPartyAction,
  getPartyRegistrationCataloguesAction,
} from "@/modules/party/actions/party-actions";
import { listOrganizationStructureAction } from "@/modules/party/actions/organizational-unit-actions";
import { listPartyAddressesAction } from "@/modules/party/actions/party-address-actions";
import { listPartyContactsAction } from "@/modules/party/actions/party-contact-actions";
import { listPartyDocumentsAction } from "@/modules/party/actions/party-document-actions";
import { listPartyIdentityRegulatoryAction } from "@/modules/party/actions/party-identity-regulatory-actions";
import { listPartyGroupsAction } from "@/modules/party/actions/party-group-actions";
import { listPartyAuditHistoryAction } from "@/modules/party/actions/party-audit-actions";
import { getPartyCommunicationPreferencesAction } from "@/modules/party/actions/party-communication-preference-actions";
import { listPartyTimelineAction } from "@/modules/party/actions/party-timeline-actions";
import { listPartyRelationshipsAction } from "@/modules/party/actions/party-relationship-actions";
import { listPartyRolesAction } from "@/modules/party/actions/party-role-actions";
import { PartyWorkspace } from "@/modules/party/components/party-workspace";
import { buildEmptyIdentityRegulatoryPanelView } from "@/modules/party/services/party-identity-regulatory-fallback";

type PageProps = {
  params: Promise<{ partyId: string }>;
  searchParams: Promise<{ tab?: string; add?: string }>;
};

export default async function PartyWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { partyId } = await params;
  const { tab, add } = await searchParams;
  const [
    partyResult,
    cataloguesResult,
    rolesResult,
    contactsResult,
    addressesResult,
    structureResult,
    relationshipsResult,
    documentsResult,
    groupsResult,
    identityRegulatoryResult,
    timelineResult,
    auditHistoryResult,
    communicationPreferencesResult,
  ] = await Promise.all([
    getPartyAction(partyId),
    getPartyRegistrationCataloguesAction(),
    listPartyRolesAction(partyId),
    listPartyContactsAction(partyId),
    listPartyAddressesAction(partyId),
    listOrganizationStructureAction(partyId),
    listPartyRelationshipsAction(partyId),
    listPartyDocumentsAction(partyId),
    listPartyGroupsAction(partyId),
    listPartyIdentityRegulatoryAction(partyId),
    listPartyTimelineAction(partyId),
    listPartyAuditHistoryAction(partyId),
    getPartyCommunicationPreferencesAction(partyId),
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

  if (!rolesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {rolesResult.error.message}
        </p>
      </main>
    );
  }

  if (!contactsResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {contactsResult.error.message}
        </p>
      </main>
    );
  }

  if (!addressesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {addressesResult.error.message}
        </p>
      </main>
    );
  }

  if (!structureResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {structureResult.error.message}
        </p>
      </main>
    );
  }

  if (!relationshipsResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {relationshipsResult.error.message}
        </p>
      </main>
    );
  }

  if (!documentsResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {documentsResult.error.message}
        </p>
      </main>
    );
  }

  if (!groupsResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {groupsResult.error.message}
        </p>
      </main>
    );
  }

  const identityRegulatory = identityRegulatoryResult.success
    ? identityRegulatoryResult.data
    : buildEmptyIdentityRegulatoryPanelView(identityRegulatoryResult.error.message);

  if (!timelineResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {timelineResult.error.message}
        </p>
      </main>
    );
  }

  if (!auditHistoryResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {auditHistoryResult.error.message}
        </p>
      </main>
    );
  }

  if (!communicationPreferencesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {communicationPreferencesResult.error.message}
        </p>
      </main>
    );
  }

  const initialTab =
    tab === "organization-structure" ? "organization-structure" : tab ?? "overview";

  return (
    <PartyWorkspace
      party={partyResult.data}
      catalogues={cataloguesResult.data}
      roles={rolesResult.data}
      contacts={contactsResult.data}
      addresses={addressesResult.data}
      organizationStructure={structureResult.data}
      relationships={relationshipsResult.data}
      documents={documentsResult.data}
      groups={groupsResult.data}
      identityRegulatory={identityRegulatory}
      timeline={timelineResult.data}
      auditHistory={auditHistoryResult.data}
      communicationPreferences={communicationPreferencesResult.data}
      initialTab={initialTab}
      showAddOrganizationalUnit={add === "1"}
    />
  );
}
