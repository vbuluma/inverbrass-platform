/**
 * Purpose:
 * Constants for the reusable Enterprise Audit capability.
 *
 * Implementation Package:
 * BP-002 / IP-011 â€“ Enterprise Audit History
 */

export const AUDIT_OPERATIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  RESTORE: "RESTORE",
  VERIFY: "VERIFY",
  ACTIVATE: "ACTIVATE",
  DEACTIVATE: "DEACTIVATE",
  ARCHIVE: "ARCHIVE",
} as const;

export type AuditOperation =
  (typeof AUDIT_OPERATIONS)[keyof typeof AUDIT_OPERATIONS];

export const AUDIT_OPERATION_LABELS: Record<AuditOperation, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  RESTORE: "Restore",
  VERIFY: "Verify",
  ACTIVATE: "Activate",
  DEACTIVATE: "Deactivate",
  ARCHIVE: "Archive",
};

export const AUDIT_ENTITY_NAMES = {
  PARTY: "party",
  INDIVIDUAL_PROFILE: "individual_profile",
  ORGANIZATION_PROFILE: "organization_profile",
  PARTY_ROLE: "party_role",
  PARTY_CONTACT: "party_contact",
  PARTY_ADDRESS: "party_address",
  ORGANIZATIONAL_UNIT: "organizational_unit",
  PARTY_RELATIONSHIP: "party_relationship",
  PARTY_DOCUMENT: "party_document",
  PARTY_GROUP: "party_group",
  PARTY_GROUP_MEMBER: "party_group_member",
  PARTY_TIMELINE: "party_timeline",
  PARTY_COMMUNICATION_PREFERENCE: "party_communication_preference",
  PARTY_IDENTITY_IDENTIFIER: "party_identity_identifier",
  PRODUCT: "product",
  PRODUCT_CLASSIFICATION: "product_classification",
  PRODUCT_CLASSIFICATION_ASSIGNMENT: "product_classification_assignment",
  UNIT_OF_MEASURE: "unit_of_measure",
  UNIT_CATEGORY: "unit_category",
  ATTRIBUTE_GROUP: "attribute_group",
  PRODUCT_ATTRIBUTE_DEFINITION: "product_attribute_definition",
  PRODUCT_ATTRIBUTE_ASSIGNMENT: "product_attribute_assignment",
  PRODUCT_VARIANT: "product_variant",
  PRODUCT_VARIANT_ATTRIBUTE: "product_variant_attribute",
  PRODUCT_BUNDLE: "product_bundle",
  PRODUCT_BUNDLE_ITEM: "product_bundle_item",
  PRODUCT_CATALOGUE_PUBLICATION: "product_catalogue_publication",
  PRODUCT_LIFECYCLE: "product_lifecycle",
  OFFERING_DOCUMENT: "offering_document",
  OFFERING_RELATIONSHIP: "offering_relationship",
  PRICING_CATALOGUE: "pricing_catalogue",
  PRICING_ITEM: "pricing_item",
  OFFERING_METRIC_DEFINITION: "offering_metric_definition",
  OFFERING_GOVERNANCE: "offering_governance",
  CRM_RECORD: "crm_record",
  CRM_LEAD: "crm_lead",
  CRM_OPPORTUNITY: "crm_opportunity",
  CRM_ACCOUNT: "crm_account",
  CRM_ACCOUNT_CONTACT: "crm_account_contact",
  CRM_ACTIVITY: "crm_activity",
  CRM_APPOINTMENT: "crm_appointment",
  CRM_VISIT: "crm_visit",
  CRM_COMMUNICATION: "crm_communication",
  CRM_CASE: "crm_case",
  CRM_GOVERNANCE: "crm_governance",
  CRM_MERGE_PROPOSAL: "crm_merge_proposal",
  CRM_SLA_POLICY: "crm_sla_policy",
  COMMERCIAL_RULE_VERSION: "commercial_rule_version",
  COMMERCIAL_OVERRIDE_REQUEST: "commercial_override_request",
} as const;

export type AuditEntityName =
  (typeof AUDIT_ENTITY_NAMES)[keyof typeof AUDIT_ENTITY_NAMES];

export const AUDIT_ENTITY_LABELS: Record<AuditEntityName, string> = {
  party: "Party",
  individual_profile: "Individual Profile",
  organization_profile: "Organization Profile",
  party_role: "Role",
  party_contact: "Contact",
  party_address: "Address",
  organizational_unit: "Organizational Unit",
  party_relationship: "Relationship",
  party_document: "Document",
  party_group: "Group",
  party_group_member: "Group Member",
  party_timeline: "Timeline",
  party_communication_preference: "Communication & Consent Preferences",
  party_identity_identifier: "Identity Identifier",
  product: "Product",
  product_classification: "Product Classification",
  product_classification_assignment: "Classification Assignment",
  unit_of_measure: "Unit of Measure",
  unit_category: "Unit Category",
  attribute_group: "Attribute Group",
  product_attribute_definition: "Attribute Definition",
  product_attribute_assignment: "Attribute Assignment",
  product_variant: "Product Variant",
  product_variant_attribute: "Variant Attribute Override",
  product_bundle: "Product Bundle",
  product_bundle_item: "Bundle Item",
  product_catalogue_publication: "Catalogue Publication",
  product_lifecycle: "Product Lifecycle",
  offering_document: "Offering Document",
  offering_relationship: "Offering Relationship",
  pricing_catalogue: "Pricing Catalogue",
  pricing_item: "Pricing Item",
  offering_metric_definition: "Offering Metric Definition",
  offering_governance: "Offering Governance",
  crm_record: "CRM Record",
  crm_lead: "CRM Lead",
  crm_opportunity: "CRM Opportunity",
  crm_account: "CRM Account",
  crm_account_contact: "CRM Account Contact",
  crm_activity: "CRM Activity",
  crm_appointment: "CRM Appointment",
  crm_visit: "CRM Visit",
  crm_communication: "CRM Communication",
  crm_case: "CRM Case",
  crm_governance: "CRM Governance",
  crm_merge_proposal: "CRM Merge Proposal",
  crm_sla_policy: "CRM SLA Policy",
  commercial_rule_version: "Commercial Rule Version",
  commercial_override_request: "Commercial Override Request",
};

/**
 * Source modules for audit provenance.
 * CRM_MANAGEMENT = CRM Core (records, leads, accounts, opportunities).
 * CRM_* = later BP-004 IP capability modules (distinct audit sources).
 */
export const AUDIT_SOURCE_MODULES = {
  PARTY_MANAGEMENT: "party_management",
  PARTY_ROLES: "party_roles",
  PARTY_CONTACTS: "party_contacts",
  PARTY_ADDRESSES: "party_addresses",
  ORGANIZATION_STRUCTURE: "organization_structure",
  PARTY_RELATIONSHIPS: "party_relationships",
  PARTY_DOCUMENTS: "party_documents",
  PARTY_GROUPS: "party_groups",
  PARTY_TIMELINE: "party_timeline",
  PARTY_COMMUNICATION_PREFERENCES: "party_communication_preferences",
  PARTY_IDENTITY_REGULATORY: "party_identity_regulatory",
  PRODUCT_MANAGEMENT: "product_management",
  PRODUCT_LIFECYCLE: "product_lifecycle",
  OFFERING_DOCUMENTS: "offering_documents",
  OFFERING_RELATIONSHIPS: "offering_relationships",
  OFFERING_PRICING: "offering_pricing",
  OFFERING_ANALYTICS: "offering_analytics",
  OFFERING_GOVERNANCE: "offering_governance",
  CRM_MANAGEMENT: "crm_management",
  CRM_ACTIVITY: "crm_activity",
  CRM_APPOINTMENT: "crm_appointment",
  CRM_VISIT: "crm_visit",
  CRM_COMMUNICATION: "crm_communication",
  CRM_CASE: "crm_case",
  CRM_GOVERNANCE: "crm_governance",
  COMMERCIAL_GOVERNANCE: "commercial_governance",
} as const;

export type AuditSourceModule =
  (typeof AUDIT_SOURCE_MODULES)[keyof typeof AUDIT_SOURCE_MODULES];

export const AUDIT_SOURCE_MODULE_LABELS: Record<AuditSourceModule, string> = {
  party_management: "Party Management",
  party_roles: "Party Roles",
  party_contacts: "Party Contacts",
  party_addresses: "Party Addresses",
  organization_structure: "Organization Structure",
  party_relationships: "Party Relationships",
  party_documents: "Party Documents",
  party_groups: "Party Groups",
  party_timeline: "Party Timeline",
  party_communication_preferences: "Party Communication & Consent Preferences",
  party_identity_regulatory: "Party Identity & Regulatory",
  product_management: "Product Management",
  product_lifecycle: "Product Lifecycle",
  offering_documents: "Offering Documents",
  offering_relationships: "Offering Relationships",
  offering_pricing: "Offering Pricing",
  offering_analytics: "Offering Analytics",
  offering_governance: "Offering Governance",
  crm_management: "CRM Management",
  crm_activity: "CRM Activity",
  crm_appointment: "CRM Appointment",
  crm_visit: "CRM Visit",
  crm_communication: "CRM Communication",
  crm_case: "CRM Case",
  crm_governance: "CRM Governance",
  commercial_governance: "Commercial Governance",
};

export const AUDIT_DEFAULT_PAGE_SIZE = 25;





