/**
 * Purpose:
 * Seed data for verification method catalogue.
 *
 * Module:
 * Core Platform – Document & Compliance
 */

export const verificationMethods = [
  {
    code: "MANUAL",
    name: "Manual",
    description: "Verified manually by a platform user.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "GOVERNMENT_API",
    name: "Government API",
    description: "Verified through a government or regulator API.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "THIRD_PARTY_API",
    name: "Third-party API",
    description: "Verified through an approved third-party integration.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "OCR_ASSISTED",
    name: "OCR Assisted",
    description: "Verified with OCR-assisted extraction and review.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "AI_ASSISTED",
    name: "AI Assisted",
    description: "Verified with AI-assisted analysis and review.",
    displayOrder: 5,
    isActive: true,
  },
] as const;
