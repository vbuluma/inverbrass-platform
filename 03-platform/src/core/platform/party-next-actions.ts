/**
 * UX-001d — Contextual next-step links after successful Party create actions.
 * Lives in core so server actions can compose PlatformActionResult envelopes.
 */

import type { PlatformActionLink } from "@/core/platform/types";
import { PARTY_TYPE_CODES, type PartyTypeCode } from "@/modules/party/constants";

export function partyCreatedNextActions(
  partyId: string,
  partyTypeCode: PartyTypeCode
): PlatformActionLink[] {
  const workspace = `/parties/${partyId}`;
  const onboardingIdentity = `/parties/${partyId}/onboarding/identity-regulatory`;
  const base: PlatformActionLink[] = [
    {
      label: "Capture Identity & Regulatory",
      href: onboardingIdentity,
    },
    { label: "Create Contact", href: `${workspace}?tab=contacts` },
    { label: "Create Address", href: `${workspace}?tab=addresses` },
    { label: "Upload Documents", href: `${workspace}?tab=documents` },
  ];

  if (partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION) {
    return [
      {
        label: "Create Organization Structure",
        href: `${workspace}?tab=organization-structure&add=1`,
      },
      ...base,
      { label: "Assign Relationships", href: `${workspace}?tab=relationships` },
      { label: "Go to Party Workspace", href: workspace, variant: "outline" },
    ];
  }

  return [
    ...base,
    { label: "Assign Relationships", href: `${workspace}?tab=relationships` },
    { label: "Go to Party Workspace", href: workspace, variant: "outline" },
  ];
}

export function organizationCreatedNextActions(partyId: string): PlatformActionLink[] {
  return partyCreatedNextActions(partyId, PARTY_TYPE_CODES.ORGANIZATION);
}

export function individualCreatedNextActions(partyId: string): PlatformActionLink[] {
  return partyCreatedNextActions(partyId, PARTY_TYPE_CODES.INDIVIDUAL);
}

export function documentUploadedNextActions(partyId: string): PlatformActionLink[] {
  const workspace = `/parties/${partyId}?tab=documents`;
  return [
    { label: "Verify Document", href: workspace },
    { label: "Upload Another", href: workspace },
    { label: "Return to Party", href: `/parties/${partyId}`, variant: "outline" },
  ];
}

export function identityRegulatoryOnboardingNextActions(
  partyId: string
): PlatformActionLink[] {
  return [
    {
      label: "Continue to Documents",
      href: `/parties/${partyId}?tab=documents`,
    },
    {
      label: "Open Identity & Regulatory Tab",
      href: `/parties/${partyId}?tab=identity-regulatory`,
    },
    {
      label: "Finish — Go to Party Workspace",
      href: `/parties/${partyId}`,
      variant: "outline",
    },
  ];
}

export function contactCreatedNextActions(partyId: string): PlatformActionLink[] {
  return [
    { label: "Create Contact", href: `/parties/${partyId}?tab=contacts` },
    { label: "Create Address", href: `/parties/${partyId}?tab=addresses` },
    { label: "Go to Party Workspace", href: `/parties/${partyId}`, variant: "outline" },
  ];
}

export function addressCreatedNextActions(partyId: string): PlatformActionLink[] {
  return [
    { label: "Create Address", href: `/parties/${partyId}?tab=addresses` },
    { label: "Upload Documents", href: `/parties/${partyId}?tab=documents` },
    { label: "Go to Party Workspace", href: `/parties/${partyId}`, variant: "outline" },
  ];
}

export function groupCreatedNextActions(groupId: string): PlatformActionLink[] {
  return [
    { label: "Add Member", href: `/groups/${groupId}?tab=members` },
    { label: "Go to Group Workspace", href: `/groups/${groupId}`, variant: "outline" },
  ];
}

export function relationshipCreatedNextActions(partyId: string): PlatformActionLink[] {
  return [
    { label: "Create Relationship", href: `/parties/${partyId}?tab=relationships` },
    { label: "Go to Party Workspace", href: `/parties/${partyId}`, variant: "outline" },
  ];
}
