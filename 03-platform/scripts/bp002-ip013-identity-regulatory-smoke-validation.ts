/**
 * Purpose:
 * Smoke-validate BP-002 / IP-013 Identity & Regulatory Information.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip013-identity-regulatory-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import {
  IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES,
  IDENTIFIER_VERIFICATION_STATUSES,
  buildIdentifierProfileSummary,
  buildIdentifierRequirementRows,
  createIdentityRegulatoryService,
  maskIdentifierValue,
  validateIdentifierPattern,
} from "@/core/identity-regulatory";
import { createRegulatoryIdentifierRequirementsService } from "@/core/localization-regulatory";
import { PARTY_WORKSPACE_TABS } from "@/modules/party/constants";
import { capturePartyIdentifierSchema } from "@/modules/party/validators/party-identity-regulatory-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/identifier-type.ts",
  "src/db/schema/required-identifier.ts",
  "src/db/schema/party-identity-identifier.ts",
  "drizzle/0026_eng003b_required_identifiers.sql",
  "drizzle/0027_bp002_ip013_party_identity_identifier.sql",
  "src/core/identity-regulatory/constants.ts",
  "src/core/identity-regulatory/types.ts",
  "src/core/identity-regulatory/services/identity-regulatory-service.ts",
  "src/core/identity-regulatory/repositories/party-identity-identifier-repository.ts",
  "src/core/identity-regulatory/providers/verification-provider.ts",
  "src/core/identity-regulatory/providers/ocr-comparison-provider.ts",
  "src/core/localization-regulatory/services/regulatory-identifier-requirements-service.ts",
  "src/modules/party/services/party-identity-regulatory-service.ts",
  "src/modules/party/actions/party-identity-regulatory-actions.ts",
  "src/modules/party/components/party-identity-regulatory-panel.tsx",
  "src/modules/party/components/party-identity-regulatory-onboarding-step.tsx",
];

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolute = path.join(ROOT, relativePath);
    const ok = existsSync(absolute);
    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "Missing required Identity & Regulatory file.",
    };
  });
}

function checkMaskingAndRules(): SmokeResult[] {
  const requirementRows = buildIdentifierRequirementRows({
    requirements: [
      {
        identifierTypeCode: "NATIONAL_ID",
        requirementLevel: "REQUIRED",
        displayOrder: 1,
      },
    ],
    captured: [],
    typeNameByCode: new Map([["NATIONAL_ID", "National ID"]]),
  });

  const summary = buildIdentifierProfileSummary({
    countryCode: "KE",
    countryName: "Kenya",
    ruleSetCode: "KE_INDIVIDUAL",
    ruleSetName: "Individual - Kenya",
    requirementRows,
  });

  return [
    {
      name: "masking:masks suffix",
      ok: maskIdentifierValue("12345678") === "****5678",
    },
    {
      name: "rules:missing requirement row",
      ok: requirementRows[0]?.displayStatus === IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.MISSING,
    },
    {
      name: "rules:summary missing count",
      ok: summary.missingCount === 1,
    },
    {
      name: "rules:validation pattern accepts match",
      ok: validateIdentifierPattern("12345678", "^[0-9]{7,10}$"),
    },
    {
      name: "rules:validation pattern rejects mismatch",
      ok: !validateIdentifierPattern("ABC", "^[0-9]{7,10}$"),
    },
    {
      name: "constants:verification pending",
      ok: IDENTIFIER_VERIFICATION_STATUSES.PENDING === "PENDING",
    },
  ];
}

function checkValidatorsAndTabs(): SmokeResult[] {
  const identityTab = PARTY_WORKSPACE_TABS.find((tab) => tab.id === "identity-regulatory");

  return [
    {
      name: "validator:capture happy path",
      ok: capturePartyIdentifierSchema.safeParse({
        identifierTypeCode: "NATIONAL_ID",
        identifierValue: "12345678",
      }).success,
    },
    {
      name: "workspace:identity-regulatory tab available",
      ok: identityTab?.available === true,
    },
    {
      name: "workspace:identity-regulatory tab between groups and timeline",
      ok: (() => {
        const groupsIndex = PARTY_WORKSPACE_TABS.findIndex((tab) => tab.id === "groups");
        const identityIndex = PARTY_WORKSPACE_TABS.findIndex(
          (tab) => tab.id === "identity-regulatory"
        );
        const timelineIndex = PARTY_WORKSPACE_TABS.findIndex((tab) => tab.id === "timeline");
        return groupsIndex < identityIndex && identityIndex < timelineIndex;
      })(),
    },
    {
      name: "service:identity regulatory factory",
      ok: createIdentityRegulatoryService() instanceof Object,
    },
    {
      name: "service:regulatory identifier requirements factory",
      ok: createRegulatoryIdentifierRequirementsService() instanceof Object,
    },
  ];
}

function printResults(results: SmokeResult[]) {
  let failed = 0;

  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
    if (!result.ok) {
      failed += 1;
    }
  }

  console.log("");
  console.log(
    failed === 0
      ? `✅ BP-002 / IP-013 smoke validation passed (${results.length} checks).`
      : `❌ BP-002 / IP-013 smoke validation failed (${failed}/${results.length}).`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

const results = [
  ...checkRequiredFiles(),
  ...checkMaskingAndRules(),
  ...checkValidatorsAndTabs(),
];

printResults(results);
