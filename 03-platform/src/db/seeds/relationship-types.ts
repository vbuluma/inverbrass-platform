/**
 * Purpose:
 * Seed data for Party Relationship Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

export const relationshipTypes = [
  {
    code: "PARENT",
    name: "Parent",
    description: "Parent of another party.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "GUARDIAN",
    name: "Guardian",
    description: "Legal or appointed guardian.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "STUDENT",
    name: "Student",
    description: "Student linked to a parent, school, or guardian.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "EMPLOYEE",
    name: "Employee",
    description: "Employee of an organization.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "EMPLOYER",
    name: "Employer",
    description: "Employing organization.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "LANDLORD",
    name: "Landlord",
    description: "Property owner or lessor.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "TENANT",
    name: "Tenant",
    description: "Property tenant or lessee.",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "PROPERTY_MANAGER",
    name: "Property Manager",
    description: "Manages property on behalf of an owner.",
    displayOrder: 8,
    isActive: true,
  },
  {
    code: "CUSTOMER",
    name: "Customer",
    description: "Customer in a commercial relationship.",
    displayOrder: 9,
    isActive: true,
  },
  {
    code: "SUPPLIER",
    name: "Supplier",
    description: "Supplier in a commercial relationship.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "GUARANTOR",
    name: "Guarantor",
    description: "Guarantor for another party.",
    displayOrder: 11,
    isActive: true,
  },
  {
    code: "NEXT_OF_KIN",
    name: "Next of Kin",
    description: "Emergency or next-of-kin contact.",
    displayOrder: 12,
    isActive: true,
  },
  {
    code: "DOCTOR",
    name: "Doctor",
    description: "Healthcare provider.",
    displayOrder: 13,
    isActive: true,
  },
  {
    code: "PATIENT",
    name: "Patient",
    description: "Healthcare patient.",
    displayOrder: 14,
    isActive: true,
  },
  {
    code: "ORGANIZATION_CONTACT",
    name: "Organization Contact",
    description: "Contact person for an organization.",
    displayOrder: 15,
    isActive: true,
  },
  {
    code: "COOPERATIVE_MEMBER",
    name: "Cooperative Member",
    description: "Member of a cooperative.",
    displayOrder: 16,
    isActive: true,
  },
  {
    code: "DONOR",
    name: "Donor",
    description: "Donor in a philanthropic relationship.",
    displayOrder: 17,
    isActive: true,
  },
  {
    code: "BENEFICIARY",
    name: "Beneficiary",
    description: "Beneficiary of support or aid.",
    displayOrder: 18,
    isActive: true,
  },
  {
    code: "PARTNER",
    name: "Partner",
    description: "Business or strategic partner.",
    displayOrder: 19,
    isActive: true,
  },
  {
    code: "CONTRACTOR",
    name: "Contractor",
    description: "Contractor providing services.",
    displayOrder: 20,
    isActive: true,
  },
] as const;
