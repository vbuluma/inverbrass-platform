/**
 * Purpose:
 * Static CRM Type reference catalogue seed data.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

export const crmTypes = [
  {
    code: "INDIVIDUAL",
    name: "Individual",
    description: "Personal customer relationship.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "BUSINESS",
    name: "Business",
    description: "Standard business customer.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "SME",
    name: "SME",
    description: "Small and medium enterprise customer.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "CORPORATE",
    name: "Corporate",
    description: "Large corporate customer.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "GOVERNMENT",
    name: "Government",
    description: "Government or public sector customer.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "NGO",
    name: "NGO",
    description: "Non-governmental organisation customer.",
    displayOrder: 60,
    isActive: true,
  },
] as const;
