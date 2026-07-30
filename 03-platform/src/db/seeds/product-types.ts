/**
 * Purpose:
 * Static Product Type reference catalogue seed data.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export const productTypes = [
  {
    code: "PHYSICAL_PRODUCT",
    name: "Physical Product",
    description: "Tangible goods such as laptops, fertilizer, or merchandise.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "SERVICE",
    name: "Service",
    description: "Intangible services such as consultation or repairs.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "DIGITAL_PRODUCT",
    name: "Digital Product",
    description: "Software licences, e-books, and other digital goods.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "RENTAL_ASSET",
    name: "Rental Asset",
    description: "Rentable assets such as vehicles, equipment, or property units.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "SUBSCRIPTION",
    name: "Subscription",
    description: "Recurring subscription plans such as internet or SaaS.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "MEMBERSHIP",
    name: "Membership",
    description: "Club memberships and recurring member benefits.",
    displayOrder: 60,
    isActive: true,
  },
  {
    code: "INSURANCE",
    name: "Insurance Product",
    description: "Insurance covers such as motor or health policies.",
    displayOrder: 70,
    isActive: true,
  },
  {
    code: "LOAN_PRODUCT",
    name: "Loan Product",
    description: "Financial loan and credit products.",
    displayOrder: 80,
    isActive: true,
  },
  {
    code: "PROPERTY",
    name: "Property",
    description: "Property units, rooms, and real-estate offerings.",
    displayOrder: 90,
    isActive: true,
  },
  {
    code: "COURSE",
    name: "Course",
    description: "Education and training courses.",
    displayOrder: 100,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other product types not covered by standard categories.",
    displayOrder: 999,
    isActive: true,
  },
] as const;
