/**
 * Purpose:
 * Seed data for Party Role Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

export const roleTypes = [
  {
    code: "CUSTOMER",
    name: "Customer",
    description: "Buys goods or services from the business.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "SUPPLIER",
    name: "Supplier",
    description: "Supplies goods or services to the business.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "FARMER",
    name: "Farmer",
    description: "Agricultural producer participating in programmes.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "PARENT",
    name: "Parent / Guardian",
    description: "Parent or guardian related to a student or beneficiary.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "STUDENT",
    name: "Student",
    description: "Learner enrolled with an education provider.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "PATIENT",
    name: "Patient",
    description: "Healthcare recipient.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "TENANT",
    name: "Tenant",
    description: "Occupies property managed by the business.",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "LANDLORD",
    name: "Landlord",
    description: "Property owner leasing through the platform.",
    displayOrder: 8,
    isActive: true,
  },
  {
    code: "BENEFICIARY",
    name: "Beneficiary",
    description: "Programme or aid beneficiary.",
    displayOrder: 9,
    isActive: true,
  },
  {
    code: "EMPLOYEE",
    name: "Employee",
    description: "Works for the business (workforce link).",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "DONOR",
    name: "Donor",
    description: "Provides funding or in-kind support.",
    displayOrder: 11,
    isActive: true,
  },
  {
    code: "PARTNER",
    name: "Partner",
    description: "Strategic or operational partner organisation/person.",
    displayOrder: 12,
    isActive: true,
  },
  {
    code: "CONTRACTOR",
    name: "Contractor",
    description: "Provides contracted services.",
    displayOrder: 13,
    isActive: true,
  },
  {
    code: "PROSPECT",
    name: "Prospect",
    description: "Potential customer or lead.",
    displayOrder: 14,
    isActive: true,
  },
] as const;
