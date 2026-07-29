/**
 * Purpose:
 * Shared Party Foundation, Roles, and Contacts type contracts.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 * BP-002 / IP-002 – Party Roles
 * BP-002 / IP-003 – Contacts & Communication
 * BP-002 / IP-004 – Address Management
 * BP-002 / IP-005 – Organization Branch Management
 * BP-002 / IP-006 – Party Relationships
 * BP-002 / IP-007 – Party Documents
 */

import type {
  OrganizationalUnitStatusCode,
  PartyAddressStatusCode,
  PartyContactStatusCode,
  PartyDocumentStatusCode,
  PartyGroupMemberStatusCode,
  PartyGroupStatusCode,
  PartyRelationshipStatusCode,
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

export type AddPartyAddressPayload = {
  addressTypeCode: string;
  countryCode: string;
  stateProvince?: string;
  countyDistrict?: string;
  cityTown?: string;
  wardLocality?: string;
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  gpsLatitude?: string | number | null;
  gpsLongitude?: string | number | null;
  isDefault?: boolean;
  notes?: string;
};

export type UpdatePartyAddressPayload = {
  countryCode?: string;
  stateProvince?: string | null;
  countyDistrict?: string | null;
  cityTown?: string | null;
  wardLocality?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  gpsLatitude?: string | number | null;
  gpsLongitude?: string | number | null;
  notes?: string | null;
};

export type PartyAddressView = {
  id: string;
  partyId: string;
  addressTypeCode: string;
  addressTypeName: string;
  countryCode: string;
  countryName: string;
  stateProvince: string | null;
  countyDistrict: string | null;
  cityTown: string | null;
  wardLocality: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  gpsLatitude: string | null;
  gpsLongitude: string | null;
  isDefault: boolean;
  statusCode: PartyAddressStatusCode;
  notes: string | null;
  countyOrStateDisplay: string;
  /** Set when status is INACTIVE — reflects last status change (deactivation). */
  deactivatedAt: string | null;
};

export type PartyAddressesPanelView = {
  addresses: PartyAddressView[];
  availableAddressTypes: ReferenceOption[];
  countries: ReferenceOption[];
};

export type PartySearchResultView = {
  id: string;
  partyNumber: string;
  displayName: string;
  partyTypeCode: PartyTypeCode;
  partyTypeName: string;
};

export type AddPartyRelationshipPayload = {
  toPartyId: string;
  relationshipTypeCode: string;
  startDate?: string;
  endDate?: string | null;
  notes?: string;
};

export type UpdatePartyRelationshipPayload = {
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
};

export type PartyRelationshipView = {
  id: string;
  fromPartyId: string;
  toPartyId: string;
  relatedPartyId: string;
  relatedPartyNumber: string;
  relatedPartyName: string;
  relationshipTypeCode: string;
  relationshipTypeName: string;
  direction: "OUTGOING" | "INCOMING";
  startDate: string;
  endDate: string | null;
  statusCode: PartyRelationshipStatusCode;
  notes: string | null;
};

export type PartyRelationshipsPanelView = {
  relationships: PartyRelationshipView[];
  availableRelationshipTypes: ReferenceOption[];
};

export type InlinePhysicalAddressPayload = {
  countryCode: string;
  addressLine1: string;
  cityTown?: string;
  countyDistrict?: string;
  stateProvince?: string;
  wardLocality?: string;
  postalCode?: string;
  landmark?: string;
  gpsLatitude?: string | number | null;
  gpsLongitude?: string | number | null;
};

export type AddOrganizationalUnitPayload = {
  unitCode: string;
  unitName: string;
  organizationalUnitTypeCode: string;
  parentOrganizationalUnitId?: string | null;
  isHeadOffice?: boolean;
  phone?: string;
  email?: string;
  /** Select an existing organization physical address. */
  partyAddressId?: string | null;
  /** Capture a new physical address on the organization party. */
  newPhysicalAddress?: InlinePhysicalAddressPayload | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  openingDate?: string;
  closingDate?: string | null;
  notes?: string;
};

export type UpdateOrganizationalUnitPayload = {
  unitName?: string;
  organizationalUnitTypeCode?: string;
  parentOrganizationalUnitId?: string | null;
  phone?: string | null;
  email?: string | null;
  partyAddressId?: string | null;
  newPhysicalAddress?: InlinePhysicalAddressPayload | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  openingDate?: string;
  closingDate?: string | null;
  notes?: string | null;
};

export type OrganizationalUnitAddressOption = {
  id: string;
  label: string;
};

export type OrganizationalUnitView = {
  id: string;
  organizationPartyId: string;
  unitCode: string;
  unitName: string;
  organizationalUnitTypeCode: string;
  organizationalUnitTypeName: string;
  parentOrganizationalUnitId: string | null;
  parentUnitName: string | null;
  isHeadOffice: boolean;
  phone: string | null;
  email: string | null;
  partyAddressId: string | null;
  partyAddressLabel: string | null;
  countryCode: string | null;
  latitude: string | null;
  longitude: string | null;
  locationDisplay: string;
  statusCode: OrganizationalUnitStatusCode;
  openingDate: string | null;
  closingDate: string | null;
  notes: string | null;
};

export type OrganizationalUnitTreeNode = OrganizationalUnitView & {
  children: OrganizationalUnitTreeNode[];
};

export type OrganizationStructureSummaryView = {
  total: number;
  active: number;
  inactive: number;
  headOfficeName: string | null;
  hasOnlyHeadOffice: boolean;
};

export type OrganizationStructurePanelView = {
  isOrganization: boolean;
  units: OrganizationalUnitView[];
  tree: OrganizationalUnitTreeNode[];
  availableUnitTypes: ReferenceOption[];
  /** Existing physical/branch/office addresses selectable for a unit. */
  physicalAddressOptions: OrganizationalUnitAddressOption[];
  countries: ReferenceOption[];
  parentUnitOptions: ReferenceOption[];
  summary: OrganizationStructureSummaryView;
};

export type SearchOrganizationalUnitsPayload = {
  query?: string;
  organizationalUnitTypeCode?: string;
  statusCode?: string;
};

/** @deprecated Use AddOrganizationalUnitPayload */
export type AddOrganizationBranchPayload = AddOrganizationalUnitPayload;
/** @deprecated Use OrganizationStructurePanelView */
export type OrganizationBranchesPanelView = OrganizationStructurePanelView;

export type PartyDocumentView = {
  id: string;
  partyId: string;
  documentTypeCode: string;
  documentTypeName: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeDisplay: string;
  fileHash: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  statusCode: PartyDocumentStatusCode;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationMethodCode: string | null;
  notes: string | null;
  createdAt: string;
  supersedesDocumentId: string | null;
};

export type ComplianceRequirementStatus =
  | "MISSING"
  | "UPLOADED"
  | "VERIFIED"
  | "EXPIRED";

export type PartyComplianceSummaryView = {
  countryCode: string;
  countryName: string;
  ruleSetCode: string;
  ruleSetName: string;
  compliancePercent: number;
  requiredCount: number;
  uploadedCount: number;
  verifiedCount: number;
  expiredCount: number;
  missingCount: number;
};

export type PartyDocumentRequirementView = {
  documentTypeCode: string;
  documentTypeName: string;
  isRequired: boolean;
  status: ComplianceRequirementStatus;
  partyDocumentId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
};

export type PartyDocumentVerificationView = {
  partyDocumentId: string;
  documentTypeName: string;
  originalFileName: string;
  verificationStatus: "PENDING" | "VERIFIED";
  verifiedByDisplay: string | null;
  verifiedAt: string | null;
  verificationMethod: string;
  comments: string | null;
};

export type PartyDocumentsPanelView = {
  complianceSummary: PartyComplianceSummaryView;
  requiredDocuments: PartyDocumentRequirementView[];
  documents: PartyDocumentView[];
  verifications: PartyDocumentVerificationView[];
  availableDocumentTypes: ReferenceOption[];
  maxUploadSizeBytes: number;
  allowedMimeTypes: readonly string[];
};

export type UploadPartyDocumentMetadata = {
  documentTypeCode: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
};

export type VerifyPartyDocumentPayload = {
  notes?: string;
};

export type CreatePartyGroupPayload = {
  groupName: string;
  groupCode: string;
  groupTypeCode: string;
  description?: string;
  countryCode?: string;
};

export type UpdatePartyGroupPayload = {
  groupName?: string;
  groupTypeCode?: string;
  description?: string | null;
  countryCode?: string | null;
};

export type AddPartyGroupMemberPayload = {
  partyId: string;
  membershipRoleCode: string;
  joinDate?: string;
  isPrimaryContact?: boolean;
  notes?: string;
};

export type AddPartyToGroupPayload = {
  partyGroupId: string;
  membershipRoleCode: string;
  joinDate?: string;
  isPrimaryContact?: boolean;
  notes?: string;
};

export type UpdatePartyGroupMemberPayload = {
  membershipRoleCode?: string;
  joinDate?: string;
  exitDate?: string | null;
  isPrimaryContact?: boolean;
  notes?: string | null;
};

export type PartyGroupSummaryView = {
  id: string;
  groupName: string;
  groupCode: string;
  groupTypeCode: string;
  groupTypeName: string;
  statusCode: PartyGroupStatusCode;
  memberCount: number;
  countryCode: string | null;
};

export type PartyGroupDetailView = {
  id: string;
  groupName: string;
  groupCode: string;
  groupTypeCode: string;
  groupTypeName: string;
  statusCode: PartyGroupStatusCode;
  description: string | null;
  countryCode: string | null;
  countryName: string | null;
  activeMemberCount: number;
  totalMemberCount: number;
};

export type PartyGroupMemberView = {
  id: string;
  partyGroupId: string;
  partyId: string;
  partyNumber: string;
  partyName: string;
  partyTypeCode: PartyTypeCode;
  partyTypeName: string;
  membershipRoleCode: string;
  membershipRoleName: string;
  joinDate: string;
  exitDate: string | null;
  statusCode: PartyGroupMemberStatusCode;
  isPrimaryContact: boolean;
  notes: string | null;
};

export type PartyGroupMembershipView = {
  id: string;
  partyGroupId: string;
  groupName: string;
  groupCode: string;
  groupTypeCode: string;
  groupTypeName: string;
  groupStatusCode: PartyGroupStatusCode;
  membershipRoleCode: string;
  membershipRoleName: string;
  joinDate: string;
  exitDate: string | null;
  statusCode: PartyGroupMemberStatusCode;
  isPrimaryContact: boolean;
  notes: string | null;
};

export type PartyGroupsPanelView = {
  memberships: PartyGroupMembershipView[];
  availableGroups: PartyGroupSummaryView[];
  availableMembershipRoles: ReferenceOption[];
};

export type PartyGroupDashboardView = {
  groups: PartyGroupSummaryView[];
  availableGroupTypes: ReferenceOption[];
  countries: ReferenceOption[];
};

export type PartyGroupMembersPanelView = {
  group: PartyGroupDetailView;
  members: PartyGroupMemberView[];
  availableMembershipRoles: ReferenceOption[];
};

export type PartyGroupSearchResultView = {
  id: string;
  groupName: string;
  groupCode: string;
  groupTypeName: string;
};

export type PartyTimelineEventView = {
  id: string;
  eventDateTime: string;
  eventType: string;
  eventCategory: string;
  eventCategoryLabel: string;
  sourceModule: string;
  sourceModuleLabel: string;
  referenceEntity: string | null;
  referenceId: string | null;
  summary: string;
  description: string | null;
  performedByName: string | null;
  visibility: string;
  systemGenerated: boolean;
  metadata: Record<string, unknown> | null;
};

export type PartyTimelinePanelView = {
  events: PartyTimelineEventView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: {
    categories: Array<{ code: string; label: string }>;
    sourceModules: Array<{ code: string; label: string }>;
  };
};

export type PartyAuditHistoryEntryView = {
  id: string;
  changedDateTime: string;
  changedByName: string | null;
  operation: string;
  operationLabel: string;
  entityName: string;
  entityLabel: string;
  entityId: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  sourceModule: string;
  sourceModuleLabel: string;
  correlationId: string | null;
  systemGenerated: boolean;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  browserClient: string | null;
  device: string | null;
};

export type PartyAuditHistoryPanelView = {
  entries: PartyAuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  filterOptions: {
    operations: Array<{ code: string; label: string }>;
    entities: Array<{ code: string; label: string }>;
    users: Array<{ id: string; name: string }>;
    sourceModules: Array<{ code: string; label: string }>;
  };
};

export type PartyCommunicationPreferencesPanelView =
  import("@/core/communication-preference/types").CommunicationPreferencePanelView & {
    consentEvents: import("@/core/consent/services/consent-engine-service").ConsentEventView[];
  };
