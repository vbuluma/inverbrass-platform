/**
 * Purpose:
 * Account & Contact Management view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import type { WorkAssignmentSummaryView } from "@/core/work-assignment-sla";
import type {
  CrmBranchOption,
  CrmPartyOption,
  CrmReferenceOption,
} from "@/modules/crm/types";

export type AccountRegistrationCatalogues = {
  accountTypes: CrmReferenceOption[];
  accountStatuses: CrmReferenceOption[];
  contactRoles: CrmReferenceOption[];
  influenceLevels: CrmReferenceOption[];
  branches: CrmBranchOption[];
  ownerParties: CrmPartyOption[];
};

export type CreateAccountPayload = {
  name: string;
  accountTypeCode: string;
  statusCode?: string;
  partyId?: string | null;
  crmRecordId?: string | null;
  parentAccountId?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  segmentCode?: string | null;
  classificationTags?: string[] | null;
  notes?: string | null;
};

export type UpdateAccountPayload = {
  name?: string;
  accountTypeCode?: string;
  statusCode?: string;
  partyId?: string | null;
  crmRecordId?: string | null;
  parentAccountId?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  segmentCode?: string | null;
  classificationTags?: string[] | null;
  notes?: string | null;
  version: number;
};

export type AssignAccountContactPayload = {
  contactPartyId: string;
  roleCode: string;
  influenceLevel?: string | null;
  isPrimary?: boolean;
  opportunityId?: string | null;
  notes?: string | null;
};

export type UpdateAccountContactPayload = {
  roleCode?: string;
  influenceLevel?: string | null;
  isPrimary?: boolean;
  opportunityId?: string | null;
  notes?: string | null;
  version: number;
};

export type AccountSummaryView = {
  accountId: string;
  accountNumber: string;
  name: string;
  accountTypeCode: string;
  accountTypeName: string;
  statusCode: string;
  statusName: string;
  partyId: string | null;
  partyDisplayName: string | null;
  crmRecordId: string | null;
  parentAccountId: string | null;
  parentAccountName: string | null;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  segmentCode: string | null;
  contactCount: number;
  childCount: number;
  updatedAt: string;
};

export type AccountContactView = {
  accountContactId: string;
  contactPartyId: string;
  contactDisplayName: string;
  contactPartyNumber: string;
  roleCode: string;
  roleName: string;
  influenceLevel: string | null;
  isPrimary: boolean;
  opportunityId: string | null;
  notes: string | null;
  preferredEmail: string | null;
  preferredPhone: string | null;
  marketingConsent: boolean | null;
  transactionalConsent: boolean | null;
  emailEnabled: boolean | null;
  smsEnabled: boolean | null;
  canCommunicateOutbound: boolean;
  version: number;
};

export type AccountDetailView = AccountSummaryView & {
  branchId: string | null;
  branchName: string | null;
  classificationTags: string[];
  notes: string | null;
  version: number;
  children: AccountSummaryView[];
  contacts: AccountContactView[];
  assignmentSummary: WorkAssignmentSummaryView | null;
};

export type AccountDashboardView = {
  totalAccounts: number;
  activeCount: number;
  prospectCount: number;
  inactiveCount: number;
  recentlyUpdated: AccountSummaryView[];
  typeSummary: Array<{ typeCode: string; typeName: string; count: number }>;
};

export type AccountListFilters = {
  search?: string;
  statusCode?: string;
  accountTypeCode?: string;
  ownerPartyId?: string;
  crmRecordId?: string;
  partyId?: string;
  parentAccountId?: string;
  limit?: number;
  offset?: number;
};

export type AccountListView = {
  items: AccountSummaryView[];
  total: number;
  limit: number;
  offset: number;
};

export type AccountHierarchyWidgetSummary = {
  accountCount: number;
  primaryAccount: AccountSummaryView | null;
  primaryContactName: string | null;
  childCount: number;
};
