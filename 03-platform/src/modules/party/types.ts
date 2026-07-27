/**
 * Purpose:
 * Shared Party Foundation, Roles, and Contacts type contracts.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 * BP-002 / IP-002 – Party Roles
 * BP-002 / IP-003 – Contacts & Communication
 */

import type {
  PartyContactStatusCode,
  PartyRoleStatusCode,
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
  mobile: string;
  notes?: string;
};

export type RegisterOrganizationPayload = {
  organizationName: string;
  registrationNumber?: string;
  taxNumber?: string;
  industryCode: string;
  organizationTypeCode: string;
  website?: string;
  mobile?: string;
  email?: string;
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

export type PartyRoleCountView = {
  roleTypeCode: string;
  roleTypeName: string;
  count: number;
};

export type PartyDashboardView = {
  totalParties: number;
  individuals: number;
  organizations: number;
  activeParties: number;
  recentlyRegistered: PartySummaryView[];
  roleCounts: PartyRoleCountView[];
};

export type PartyRegistrationCatalogues = {
  partyTypes: ReferenceOption[];
  organizationTypes: ReferenceOption[];
  industries: ReferenceOption[];
  languages: ReferenceOption[];
  genders: ReferenceOption[];
};

export type AssignPartyRolePayload = {
  roleTypeCode: string;
  effectiveDate?: string;
  isPrimary?: boolean;
};

export type UpdatePartyRolePayload = {
  isPrimary?: boolean;
  effectiveDate?: string;
  endDate?: string | null;
  reactivate?: boolean;
};

export type PartyRoleView = {
  id: string;
  partyId: string;
  roleTypeCode: string;
  roleTypeName: string;
  statusCode: PartyRoleStatusCode;
  isPrimary: boolean;
  effectiveDate: string;
  endDate: string | null;
};

export type PartyRolesPanelView = {
  activeRoles: PartyRoleView[];
  historyRoles: PartyRoleView[];
  availableRoleTypes: ReferenceOption[];
};

export type AddPartyContactPayload = {
  contactTypeCode: string;
  contactValue: string;
  isPreferred?: boolean;
  notes?: string;
};

export type UpdatePartyContactPayload = {
  contactValue?: string;
  notes?: string | null;
};

export type PartyContactView = {
  id: string;
  partyId: string;
  contactTypeCode: string;
  contactTypeName: string;
  contactValue: string;
  isPreferred: boolean;
  isVerified: boolean;
  statusCode: PartyContactStatusCode;
  notes: string | null;
};

export type PartyContactsPanelView = {
  contacts: PartyContactView[];
  availableContactTypes: ReferenceOption[];
};
