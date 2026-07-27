/**
 * Purpose:
 * Seed data for Party Contact Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

export const contactTypes = [
  {
    code: "MOBILE",
    name: "Mobile",
    description: "Mobile phone number.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "OFFICE_PHONE",
    name: "Office Phone",
    description: "Office or business landline.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "HOME_PHONE",
    name: "Home Phone",
    description: "Home landline.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "EMAIL",
    name: "Email",
    description: "Email address.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "WHATSAPP",
    name: "WhatsApp",
    description: "WhatsApp number or identifier.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "FAX",
    name: "Fax",
    description: "Fax number.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "WEBSITE",
    name: "Website",
    description: "Website URL (typically for Organizations).",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "SOCIAL_MEDIA",
    name: "Social Media",
    description: "Social media handle or profile URL.",
    displayOrder: 8,
    isActive: true,
  },
  {
    code: "EMERGENCY",
    name: "Emergency Contact",
    description: "Emergency communication channel.",
    displayOrder: 9,
    isActive: true,
  },
] as const;
