/**
 * UX-001.1 — Workspace sidebar helpers (completion, recommendations, quick actions).
 */

import type { CompletionItem } from "@/components/platform/platform-completion-meter";
import type { PlatformRecommendation } from "@/components/platform/platform-recommendations-card";
import type { PlatformActionLink } from "@/core/platform/types";
import { ADDRESS_TYPE_CODES, PARTY_TYPE_CODES } from "@/modules/party/constants";
import type {
  OrganizationStructurePanelView,
  PartyAddressesPanelView,
  PartyContactsPanelView,
  PartyDetailView,
  PartyDocumentsPanelView,
  PartyGroupsPanelView,
  PartyRelationshipsPanelView,
  PartyRolesPanelView,
  PartyTimelineEventView,
} from "@/modules/party/types";

export function buildPartyCompletionItems(input: {
  party: PartyDetailView;
  contacts: PartyContactsPanelView;
  addresses: PartyAddressesPanelView;
  documents: PartyDocumentsPanelView;
  relationships: PartyRelationshipsPanelView;
  groups: PartyGroupsPanelView;
  organizationStructure: OrganizationStructurePanelView;
  roles: PartyRolesPanelView;
}): CompletionItem[] {
  const workspace = `/parties/${input.party.id}`;
  const isOrganization = input.party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION;

  const items: CompletionItem[] = [
    {
      id: "contacts",
      label: "Contacts",
      completed: input.contacts.contacts.length > 0,
      href: `${workspace}?tab=contacts`,
    },
    {
      id: "addresses",
      label: "Addresses",
      completed: input.addresses.addresses.length > 0,
      href: `${workspace}?tab=addresses`,
    },
    {
      id: "documents",
      label: "Documents",
      completed: input.documents.documents.length > 0,
      href: `${workspace}?tab=documents`,
    },
    {
      id: "relationships",
      label: "Relationships",
      completed: input.relationships.relationships.length > 0,
      href: `${workspace}?tab=relationships`,
    },
    {
      id: "roles",
      label: "Roles",
      completed: input.roles.activeRoles.length > 0,
      href: `${workspace}?tab=roles`,
    },
    {
      id: "groups",
      label: "Groups",
      completed: input.groups.memberships.length > 0,
      href: `${workspace}?tab=groups`,
    },
  ];

  if (isOrganization) {
    items.splice(2, 0, {
      id: "organization",
      label: "Organization Structure",
      completed: input.organizationStructure.units.length > 0,
      href: `${workspace}?tab=organization-structure`,
    });
  }

  return items;
}

export function buildPartyQuickActions(partyId: string, partyTypeCode: string): PlatformActionLink[] {
  const workspace = `/parties/${partyId}`;
  const actions: PlatformActionLink[] = [
    { label: "Create Contact", href: `${workspace}?tab=contacts` },
    { label: "Upload Document", href: `${workspace}?tab=documents` },
    { label: "Assign Relationship", href: `${workspace}?tab=relationships` },
    { label: "Create Group", href: `${workspace}?tab=groups` },
  ];

  if (partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION) {
    actions.push({
      label: "Create Organization Unit",
      href: `${workspace}?tab=organization-structure&add=1`,
    });
  }

  return actions;
}

export function buildPartyRecommendations(input: {
  party: PartyDetailView;
  contacts: PartyContactsPanelView;
  addresses: PartyAddressesPanelView;
  documents: PartyDocumentsPanelView;
  organizationStructure: OrganizationStructurePanelView;
}): PlatformRecommendation[] {
  const recommendations: PlatformRecommendation[] = [];
  const isOrganization = input.party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION;

  if (input.contacts.contacts.length === 0) {
    recommendations.push({
      id: "no-contacts",
      message: "No contacts on file. Create a primary contact.",
      severity: "warning",
    });
  }

  if (input.addresses.addresses.length === 0) {
    recommendations.push({
      id: "no-address",
      message: "Address missing. Add a registered or head office address.",
      severity: "warning",
    });
  }

  const hasHeadOffice = input.addresses.addresses.some(
    (address) => address.addressTypeCode === ADDRESS_TYPE_CODES.HEAD_OFFICE
  );
  if (isOrganization && input.addresses.addresses.length > 0 && !hasHeadOffice) {
    recommendations.push({
      id: "no-head-office",
      message: "Organization has no Head Office address.",
      severity: "warning",
    });
  }

  const missingDocs = input.documents.requiredDocuments.filter(
    (req) => req.status === "MISSING" || req.status === "EXPIRED"
  );
  if (missingDocs.length > 0) {
    recommendations.push({
      id: "missing-docs",
      message: `${missingDocs.length} compliance document(s) missing or expired.`,
      severity: "warning",
    });
  }

  const expiringSoon = input.documents.documents.filter((doc) => {
    if (!doc.expiryDate) {
      return false;
    }
    const days =
      (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  });
  if (expiringSoon.length > 0) {
    recommendations.push({
      id: "expiring-docs",
      message: `Documents expire within 30 days (${expiringSoon.length}).`,
      severity: "info",
    });
  }

  if (isOrganization && input.organizationStructure.units.length === 0) {
    recommendations.push({
      id: "no-org-structure",
      message: "Organization structure not defined. Create organizational units.",
      severity: "info",
    });
  }

  return recommendations;
}

export function buildGroupQuickActions(groupId: string): PlatformActionLink[] {
  return [
    { label: "Add Member", href: `/groups/${groupId}?tab=members` },
    { label: "Edit Group", href: `/groups/${groupId}?tab=overview` },
  ];
}

export function toRecentActivityItems(events: PartyTimelineEventView[]) {
  return events.map((event) => ({
    id: event.id,
    summary: event.summary,
    eventDateTime: event.eventDateTime,
  }));
}
