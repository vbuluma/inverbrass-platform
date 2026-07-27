/**
 * Purpose:
 * Smoke-validate BP-002 / IP-001 Party Foundation.
 *
 * WHY:
 * Confirms structural completeness, validators, lifecycle rules, and
 * read-only reference-data presence without mutating business data.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 *
 * Usage:
 *   npx tsx scripts/bp002-ip001-party-smoke-validation.ts
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 * If required Party reference catalogues are missing, it fails clearly.
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { industry } from "@/db/schema/industry";
import { language } from "@/db/schema/language";
import { organizationType } from "@/db/schema/organization-type";
import { partyStatus } from "@/db/schema/party-status";
import { partyType } from "@/db/schema/party-type";
import {
  FUTURE_TAB_MESSAGE,
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import { createIndividualProfileService } from "@/modules/party/services/individual-profile-service";
import { createOrganizationProfileService } from "@/modules/party/services/organization-profile-service";
import {
  assertPartyTypeImmutable,
  canTransitionPartyStatus,
  generatePartyNumber,
  isPartyTypeCode,
  resolveDefaultPartyStatus,
} from "@/modules/party/services/party-rules";
import { createPartyService } from "@/modules/party/services/party-service";
import {
  registerIndividualSchema,
  registerOrganizationSchema,
  updatePartyOverviewSchema,
} from "@/modules/party/validators/party-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/party-type.ts",
  "src/db/schema/party-status.ts",
  "src/db/schema/organization-type.ts",
  "src/db/schema/party.ts",
  "src/db/schema/individual-profile.ts",
  "src/db/schema/organization-profile.ts",
  "src/db/seeds/party-types.ts",
  "src/db/seeds/party-types-seed.ts",
  "src/db/seeds/party-statuses.ts",
  "src/db/seeds/party-statuses-seed.ts",
  "src/db/seeds/organization-types.ts",
  "src/db/seeds/organization-types-seed.ts",
  "src/db/seeds/languages.ts",
  "src/db/seeds/languages-seed.ts",
  "drizzle/0010_bp002_ip001_party_foundation.sql",
  "drizzle/0011_bp002_ip001_language_catalogue.sql",
  "src/modules/party/constants.ts",
  "src/modules/party/errors.ts",
  "src/modules/party/types.ts",
  "src/modules/party/validators/party-validators.ts",
  "src/modules/party/services/party-rules.ts",
  "src/modules/party/services/party-service.ts",
  "src/modules/party/services/individual-profile-service.ts",
  "src/modules/party/services/organization-profile-service.ts",
  "src/modules/party/repositories/party-repository.ts",
  "src/modules/party/repositories/individual-profile-repository.ts",
  "src/modules/party/repositories/organization-profile-repository.ts",
  "src/modules/party/repositories/party-reference-repository.ts",
  "src/modules/party/actions/party-actions.ts",
  "src/modules/party/components/party-dashboard.tsx",
  "src/modules/party/components/party-registration-form.tsx",
  "src/modules/party/components/party-workspace.tsx",
  "src/app/(authenticated)/(app)/parties/page.tsx",
  "src/app/(authenticated)/(app)/parties/new/page.tsx",
  "src/app/(authenticated)/(app)/parties/[partyId]/page.tsx",
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
      detail: ok ? undefined : "Missing required Party Foundation file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  const individualOk = registerIndividualSchema.safeParse({
    fullName: "Ada Lovelace",
    dateOfBirth: "1815-12-10",
    gender: "FEMALE",
    preferredLanguageCode: "en",
    notes: "",
  }).success;

  const individualBad = !registerIndividualSchema.safeParse({
    fullName: "A",
    dateOfBirth: "bad",
    gender: "X",
    preferredLanguageCode: "",
  }).success;

  const organizationOk = registerOrganizationSchema.safeParse({
    organizationName: "InverBrass Ltd",
    industryCode: "COMMERCE",
    organizationTypeCode: "COMPANY",
  }).success;

  const organizationBad = !registerOrganizationSchema.safeParse({
    organizationName: "",
    industryCode: "",
    organizationTypeCode: "",
  }).success;

  const overviewOk = updatePartyOverviewSchema.safeParse({
    displayName: "Updated Name",
    notes: "Note",
  }).success;

  return [
    {
      name: "validator:registerIndividual happy path",
      ok: individualOk,
    },
    {
      name: "validator:registerIndividual rejects invalid input",
      ok: individualBad,
    },
    {
      name: "validator:registerOrganization happy path",
      ok: organizationOk,
    },
    {
      name: "validator:registerOrganization rejects invalid input",
      ok: organizationBad,
    },
    {
      name: "validator:updateOverview happy path",
      ok: overviewOk,
    },
  ];
}

function checkRules(): SmokeResult[] {
  const partyNumber = generatePartyNumber();
  const partyNumbers = new Set(
    Array.from({ length: 20 }, () => generatePartyNumber())
  );

  return [
    {
      name: "rule:partyNumber format",
      ok: /^PTY-\d{8}-[A-F0-9]{8}$/.test(partyNumber),
      detail: partyNumber,
    },
    {
      name: "rule:partyNumbers are unique across generation batch",
      ok: partyNumbers.size === 20,
    },
    {
      name: "rule:default status is ACTIVE",
      ok: resolveDefaultPartyStatus(false) === PARTY_STATUS_CODES.ACTIVE,
    },
    {
      name: "rule:party type codes recognized",
      ok:
        isPartyTypeCode(PARTY_TYPE_CODES.INDIVIDUAL) &&
        isPartyTypeCode(PARTY_TYPE_CODES.ORGANIZATION) &&
        !isPartyTypeCode("BRANCH"),
    },
    {
      name: "rule:party type immutable",
      ok:
        assertPartyTypeImmutable("INDIVIDUAL", "INDIVIDUAL") &&
        !assertPartyTypeImmutable("INDIVIDUAL", "ORGANIZATION"),
    },
    {
      name: "rule:lifecycle ACTIVE → SUSPENDED",
      ok: canTransitionPartyStatus(
        PARTY_STATUS_CODES.ACTIVE,
        PARTY_STATUS_CODES.SUSPENDED
      ),
    },
    {
      name: "rule:lifecycle SUSPENDED → ACTIVE",
      ok: canTransitionPartyStatus(
        PARTY_STATUS_CODES.SUSPENDED,
        PARTY_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rule:lifecycle ACTIVE → ARCHIVED",
      ok: canTransitionPartyStatus(
        PARTY_STATUS_CODES.ACTIVE,
        PARTY_STATUS_CODES.ARCHIVED
      ),
    },
    {
      name: "rule:lifecycle ARCHIVED is terminal",
      ok: !canTransitionPartyStatus(
        PARTY_STATUS_CODES.ARCHIVED,
        PARTY_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rule:workspace placeholders configured",
      ok:
        PARTY_WORKSPACE_TABS.filter((tab) => !tab.available).length >= 10 &&
        FUTURE_TAB_MESSAGE.includes("future Implementation Package"),
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  return [
    {
      name: "factory:createPartyService",
      ok: Boolean(createPartyService()),
    },
    {
      name: "factory:createIndividualProfileService",
      ok: Boolean(createIndividualProfileService()),
    },
    {
      name: "factory:createOrganizationProfileService",
      ok: Boolean(createOrganizationProfileService()),
    },
  ];
}

async function checkReferenceDataReadonly(): Promise<SmokeResult[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        name: "reference-data:DATABASE_URL",
        ok: false,
        detail:
          "DATABASE_URL is missing. Cannot verify Party reference catalogues.",
      },
    ];
  }

  try {
    const db = getDb();
    const [
      partyTypes,
      partyStatuses,
      organizationTypes,
      industries,
      languages,
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(partyType)
        .where(eq(partyType.isActive, true)),
      db
        .select({ value: count() })
        .from(partyStatus)
        .where(eq(partyStatus.isActive, true)),
      db
        .select({ value: count() })
        .from(organizationType)
        .where(eq(organizationType.isActive, true)),
      db
        .select({ value: count() })
        .from(industry)
        .where(eq(industry.isActive, true)),
      db
        .select({ value: count() })
        .from(language)
        .where(eq(language.isActive, true)),
    ]);

    const checks = [
      { label: "party_type", count: Number(partyTypes[0]?.value ?? 0) },
      { label: "party_status", count: Number(partyStatuses[0]?.value ?? 0) },
      {
        label: "organization_type",
        count: Number(organizationTypes[0]?.value ?? 0),
      },
      { label: "industry", count: Number(industries[0]?.value ?? 0) },
      { label: "language", count: Number(languages[0]?.value ?? 0) },
    ];

    return checks.map((check) => ({
      name: `reference-data:${check.label}`,
      ok: check.count > 0,
      detail:
        check.count > 0
          ? `active=${check.count}`
          : `Required ${check.label} catalogue is empty. Run npm run db:migrate and npm run db:seed, then re-run this smoke test.`,
    }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to read Party reference catalogues.";
    const needsMigration =
      /party_type|party_status|organization_type|relation .* does not exist|Failed query/i.test(
        message
      );

    return [
      {
        name: "reference-data:read",
        ok: false,
        detail: needsMigration
          ? "Party Foundation tables or catalogues are missing. Run `npm run db:migrate` then `npm run db:seed`, then re-run this smoke test (smoke itself remains read-only)."
          : message,
      },
    ];
  }
}

function printResults(results: SmokeResult[]): boolean {
  let failed = 0;
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    if (!result.ok) {
      failed += 1;
    }
    console.log(
      `[${mark}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }
  console.log("");
  console.log(
    failed === 0
      ? `Smoke validation passed (${results.length} checks).`
      : `Smoke validation failed: ${failed}/${results.length} checks.`
  );
  return failed === 0;
}

async function main() {
  console.log("BP-002 / IP-001 Party Foundation — read-only smoke validation");
  console.log("This script never inserts, updates, deletes, seeds, or repairs data.");
  console.log("");

  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkRules(),
    ...checkServiceFactories(),
    ...(await checkReferenceDataReadonly()),
  ];

  const ok = printResults(results);
  await closeDb();

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
