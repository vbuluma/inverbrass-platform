/**
 * Purpose:
 * Shared Party Foundation type contracts for UI, actions, and services.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import type {
  PartyStatusCode,
  PartyTypeCode,
} from "@/modules/party/constants";

export type ReferenceOption = {
  code: string;
  name: string;
};

export type RegisterIndividualPayload = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  preferredLanguageCode: string;
  notes?: string;
};

export type RegisterOrganizationPayload = {
  organizationName: string;
  registrationNumber?: string;
  taxNumber?: string;
  industryCode: string;
  organizationTypeCode: string;
  website?: string;
  notes?: string;
};

export type UpdatePartyOverviewPayload = {
  displayName: string;
  notes?: string;
  /** Individual-only fields (ignored for organizations). */
  dateOfBirth?: string;
  gender?: string;
  preferredLanguageCode?: string;
  /** Organization-only fields (ignored for individuals). */
  registrationNumber?: string;
  taxNumber?: string;
  industryCode?: string;
  organizationTypeCode?: string;
  website?: string;
};

export type IndividualProfileView = {
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  preferredLanguageCode: string | null;
};

export type OrganizationProfileView = {
  organizationName: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  industryCode: string;
  industryName: string | null;
  organizationTypeCode: string;
  organizationTypeName: string | null;
  website: string | null;
};

export type PartySummaryView = {
  id: string;
  partyNumber: string;
  partyTypeCode: PartyTypeCode;
  partyTypeName: string;
  displayName: string;
  statusCode: PartyStatusCode;
  statusName: string;
  registrationDate: string;
};

export type PartyDetailView = PartySummaryView & {
  notes: string | null;
  version: number;
  individual: IndividualProfileView | null;
  organization: OrganizationProfileView | null;
};

export type PartyDashboardView = {
  totalParties: number;
  individuals: number;
  organizations: number;
  activeParties: number;
  recentlyRegistered: PartySummaryView[];
};

export type PartyRegistrationCatalogues = {
  partyTypes: ReferenceOption[];
  organizationTypes: ReferenceOption[];
  industries: ReferenceOption[];
  languages: ReferenceOption[];
  genders: ReferenceOption[];
};
