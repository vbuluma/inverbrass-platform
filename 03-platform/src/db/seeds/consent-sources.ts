/**
 * ENG-003b — Consent Source seed data (global defaults).
 */

export type ConsentSourceSeedRow = {
  code: string;
  name: string;
  countryCode: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

export const consentSourceSeedRows: ConsentSourceSeedRow[] = [
  {
    code: "ONLINE_REGISTRATION",
    name: "Online Registration",
    countryCode: null,
    description: "Consent captured during online registration flow.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "CUSTOMER_PORTAL",
    name: "Customer Portal",
    countryCode: null,
    description: "Self-service customer portal preference centre.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "MOBILE_APP",
    name: "Mobile App",
    countryCode: null,
    description: "Consent captured via mobile application.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "BRANCH",
    name: "Branch",
    countryCode: null,
    description: "Manual branch capture — only permitted manual consent entry.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "CALL_CENTRE",
    name: "Call Centre",
    countryCode: null,
    description: "Consent captured during call centre interaction.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "PAPER_FORM",
    name: "Paper Form",
    countryCode: null,
    description: "Signed paper consent form digitized into the platform.",
    displayOrder: 60,
    isActive: true,
  },
  {
    code: "WHATSAPP",
    name: "WhatsApp",
    countryCode: null,
    description: "Consent captured via WhatsApp channel.",
    displayOrder: 70,
    isActive: true,
  },
  {
    code: "SMS",
    name: "SMS",
    countryCode: null,
    description: "Consent captured via SMS opt-in.",
    displayOrder: 80,
    isActive: true,
  },
  {
    code: "EMAIL_LINK",
    name: "Email Link",
    countryCode: null,
    description: "Consent captured via email confirmation link.",
    displayOrder: 90,
    isActive: true,
  },
  {
    code: "API",
    name: "API",
    countryCode: null,
    description: "Consent captured via partner or integration API.",
    displayOrder: 100,
    isActive: true,
  },
  {
    code: "IMPORTED",
    name: "Imported",
    countryCode: null,
    description: "Consent imported from legacy or external system.",
    displayOrder: 110,
    isActive: true,
  },
  {
    code: "SELF_SERVICE",
    name: "Self Service",
    countryCode: null,
    description: "Consent captured through self-service kiosk or portal.",
    displayOrder: 120,
    isActive: true,
  },
];
