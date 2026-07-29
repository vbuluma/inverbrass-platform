/**
 * Purpose:
 * Pure business rules for identifier validity and profile assembly.
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

import {
  IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES,
  IDENTIFIER_STATUS_CODES,
  IDENTIFIER_VERIFICATION_STATUSES,
} from "@/core/identity-regulatory/constants";
import type {
  BuildRequirementRowsInput,
  CapturedIdentifierRecord,
  IdentifierProfileSummary,
  IdentifierRequirementRow,
} from "@/core/identity-regulatory/types";
import { maskIdentifierValue } from "@/core/identity-regulatory/helpers/masking";

function isExpired(expiryDate: string | null, referenceDate: Date): boolean {
  if (!expiryDate) {
    return false;
  }
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return false;
  }
  return expiry < referenceDate;
}

function resolveDisplayStatus(
  captured: CapturedIdentifierRecord | undefined,
  referenceDate: Date
): (typeof IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES)[keyof typeof IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES] {
  if (!captured) {
    return IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.MISSING;
  }

  if (
    captured.statusCode === IDENTIFIER_STATUS_CODES.EXPIRED ||
    isExpired(captured.expiryDate, referenceDate)
  ) {
    return IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.EXPIRED;
  }

  if (captured.verificationStatus === IDENTIFIER_VERIFICATION_STATUSES.VERIFIED) {
    return IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.VERIFIED;
  }

  return IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.CAPTURED;
}

export function buildIdentifierRequirementRows(
  input: BuildRequirementRowsInput
): IdentifierRequirementRow[] {
  const referenceDate = input.referenceDate ?? new Date();
  const capturedByType = new Map<string, CapturedIdentifierRecord>();

  for (const row of input.captured) {
    if (!capturedByType.has(row.identifierTypeCode)) {
      capturedByType.set(row.identifierTypeCode, row);
    }
  }

  return input.requirements
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((requirement) => {
      const captured = capturedByType.get(requirement.identifierTypeCode);
      const displayStatus = resolveDisplayStatus(captured, referenceDate);

      return {
        identifierTypeCode: requirement.identifierTypeCode,
        identifierTypeName:
          input.typeNameByCode.get(requirement.identifierTypeCode) ??
          requirement.identifierTypeCode,
        isRequired: requirement.requirementLevel === "REQUIRED",
        displayStatus,
        capturedIdentifierId: captured?.id ?? null,
        maskedValue: captured ? maskIdentifierValue(captured.identifierValue) : null,
        expiryDate: captured?.expiryDate ?? null,
        verificationStatus: captured?.verificationStatus ?? null,
      };
    });
}

export function buildIdentifierProfileSummary(input: {
  countryCode: string;
  countryName: string;
  ruleSetCode: string;
  ruleSetName: string;
  requirementRows: IdentifierRequirementRow[];
}): IdentifierProfileSummary {
  const requiredRows = input.requirementRows.filter((row) => row.isRequired);
  const requiredCount = requiredRows.length;
  const capturedCount = input.requirementRows.filter(
    (row) => row.displayStatus !== IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.MISSING
  ).length;
  const verifiedCount = requiredRows.filter(
    (row) => row.displayStatus === IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.VERIFIED
  ).length;
  const missingCount = requiredRows.filter(
    (row) => row.displayStatus === IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.MISSING
  ).length;
  const expiredCount = input.requirementRows.filter(
    (row) => row.displayStatus === IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.EXPIRED
  ).length;

  const verificationPercent =
    requiredCount === 0 ? 100 : Math.round((verifiedCount / requiredCount) * 100);

  return {
    countryCode: input.countryCode,
    countryName: input.countryName,
    ruleSetCode: input.ruleSetCode,
    ruleSetName: input.ruleSetName,
    verificationPercent,
    requiredCount,
    capturedCount,
    verifiedCount,
    missingCount,
    expiredCount,
  };
}

export function validateIdentifierPattern(
  value: string,
  pattern: string | null | undefined
): boolean {
  if (!pattern?.trim()) {
    return true;
  }

  try {
    const regex = new RegExp(pattern);
    return regex.test(value.trim());
  } catch {
    return true;
  }
}
