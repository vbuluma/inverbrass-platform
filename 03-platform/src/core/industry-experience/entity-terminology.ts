/**
 * ENG-003k — Industry-native entity labels (party, branch, CRM roles).
 */

export type EntityLabelPair = {
  plural: string;
  singular: string;
};

export type EntityTerminology = {
  party: EntityLabelPair;
  customer: EntityLabelPair;
  supplier: EntityLabelPair;
  employee: EntityLabelPair;
  member: EntityLabelPair;
  branch: EntityLabelPair;
  tenant: EntityLabelPair;
  student: EntityLabelPair;
  patient: EntityLabelPair;
  client: EntityLabelPair;
  teacher: EntityLabelPair;
  campus: EntityLabelPair;
  clinic: EntityLabelPair;
  outlet: EntityLabelPair;
  building: EntityLabelPair;
  landlord: EntityLabelPair;
  staff: EntityLabelPair;
  practitioner: EntityLabelPair;
  stylist: EntityLabelPair;
};

const DEFAULT_ENTITY_TERMINOLOGY: EntityTerminology = {
  party: { plural: "Parties", singular: "Party" },
  customer: { plural: "Customers", singular: "Customer" },
  supplier: { plural: "Suppliers", singular: "Supplier" },
  employee: { plural: "Employees", singular: "Employee" },
  member: { plural: "Members", singular: "Member" },
  branch: { plural: "Branches", singular: "Branch" },
  tenant: { plural: "Tenants", singular: "Tenant" },
  student: { plural: "Students", singular: "Student" },
  patient: { plural: "Patients", singular: "Patient" },
  client: { plural: "Clients", singular: "Client" },
  teacher: { plural: "Teachers", singular: "Teacher" },
  campus: { plural: "Campuses", singular: "Campus" },
  clinic: { plural: "Clinics", singular: "Clinic" },
  outlet: { plural: "Outlets", singular: "Outlet" },
  building: { plural: "Buildings", singular: "Building" },
  landlord: { plural: "Landlords", singular: "Landlord" },
  staff: { plural: "Staff", singular: "Staff Member" },
  practitioner: { plural: "Practitioners", singular: "Practitioner" },
  stylist: { plural: "Stylists", singular: "Stylist" },
};

type EntityProfilePatch = Partial<EntityTerminology>;

const INDUSTRY_ENTITY_PROFILES: Record<string, EntityProfilePatch> = {
  EDUCATION: {
    customer: { plural: "Students", singular: "Student" },
    member: { plural: "Students", singular: "Student" },
    employee: { plural: "Teachers", singular: "Teacher" },
    teacher: { plural: "Teachers", singular: "Teacher" },
    branch: { plural: "Campuses", singular: "Campus" },
    campus: { plural: "Campuses", singular: "Campus" },
  },
  PROPERTY: {
    customer: { plural: "Tenants", singular: "Tenant" },
    tenant: { plural: "Tenants", singular: "Tenant" },
    supplier: { plural: "Landlords", singular: "Landlord" },
    landlord: { plural: "Landlords", singular: "Landlord" },
    branch: { plural: "Buildings", singular: "Building" },
    building: { plural: "Buildings", singular: "Building" },
  },
  HEALTHCARE: {
    customer: { plural: "Patients", singular: "Patient" },
    patient: { plural: "Patients", singular: "Patient" },
    employee: { plural: "Practitioners", singular: "Practitioner" },
    practitioner: { plural: "Practitioners", singular: "Practitioner" },
    staff: { plural: "Practitioners", singular: "Practitioner" },
    branch: { plural: "Clinics", singular: "Clinic" },
    clinic: { plural: "Clinics", singular: "Clinic" },
  },
  COMMERCE: {
    customer: { plural: "Customers", singular: "Customer" },
    branch: { plural: "Outlets", singular: "Outlet" },
    outlet: { plural: "Outlets", singular: "Outlet" },
  },
  HOSPITALITY: {
    customer: { plural: "Guests", singular: "Guest" },
    branch: { plural: "Outlets", singular: "Outlet" },
    outlet: { plural: "Outlets", singular: "Outlet" },
  },
  PROFESSIONAL: {
    customer: { plural: "Clients", singular: "Client" },
    client: { plural: "Clients", singular: "Client" },
    employee: { plural: "Staff", singular: "Staff Member" },
    staff: { plural: "Staff", singular: "Staff Member" },
  },
  SALON: {
    customer: { plural: "Clients", singular: "Client" },
    client: { plural: "Clients", singular: "Client" },
    employee: { plural: "Stylists", singular: "Stylist" },
    stylist: { plural: "Stylists", singular: "Stylist" },
    staff: { plural: "Stylists", singular: "Stylist" },
    branch: { plural: "Salons", singular: "Salon" },
    outlet: { plural: "Salons", singular: "Salon" },
  },
  FINANCIAL: {
    customer: { plural: "Customers", singular: "Customer" },
    member: { plural: "Members", singular: "Member" },
  },
  NGO: {
    member: { plural: "Members", singular: "Member" },
    customer: { plural: "Beneficiaries", singular: "Beneficiary" },
  },
  NON_PROFIT: {
    member: { plural: "Members", singular: "Member" },
    customer: { plural: "Beneficiaries", singular: "Beneficiary" },
  },
};

function mergeEntityProfile(
  base: EntityTerminology,
  patch?: EntityProfilePatch
): EntityTerminology {
  if (!patch) {
    return base;
  }
  return { ...base, ...patch };
}

export function resolveEntityTerminology(
  industryCode: string | null | undefined
): EntityTerminology {
  if (!industryCode) {
    return DEFAULT_ENTITY_TERMINOLOGY;
  }
  return mergeEntityProfile(
    DEFAULT_ENTITY_TERMINOLOGY,
    INDUSTRY_ENTITY_PROFILES[industryCode]
  );
}
