/**
 * Purpose:
 * Smoke-validate Organization Structure Engine (ENG-003c) refactoring.
 *
 * READ-ONLY — never mutates database data.
 *
 * Usage:
 *   npx tsx scripts/bp002-organization-structure-engine-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { organizationalUnitType } from "@/db/schema/organizational-unit-type";
import { organizationalUnitTypes } from "@/db/seeds/organizational-unit-types";
import {
  ORGANIZATIONAL_UNIT_STATUS_CODES,
  PARTY_TYPE_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import {
  canDeactivateOrganizationalUnit,
  canOwnOrganizationalUnits,
  isValidParentOrganizationalUnit,
  normalizeUnitCode,
} from "@/modules/party/services/organizational-unit-rules";
import { buildOrganizationalUnitTree } from "@/modules/party/services/organizational-unit-tree";
import { createOrganizationalUnitService } from "@/modules/party/services/organizational-unit-service";
import { addOrganizationalUnitSchema } from "@/modules/party/validators/organizational-unit-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/organizational-unit-type.ts",
  "src/db/schema/organizational-unit.ts",
  "src/db/seeds/organizational-unit-types.ts",
  "src/db/seeds/organizational-unit-types-seed.ts",
  "drizzle/0017_organization_structure_engine.sql",
  "src/modules/party/repositories/organizational-unit-repository.ts",
  "src/modules/party/services/organizational-unit-service.ts",
  "src/modules/party/services/organizational-unit-rules.ts",
  "src/modules/party/services/organizational-unit-tree.ts",
  "src/modules/party/validators/organizational-unit-validators.ts",
  "src/modules/party/actions/organizational-unit-actions.ts",
  "src/modules/party/components/party-organization-structure-panel.tsx",
  "src/modules/party/components/organizational-unit-tree.tsx",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required Organization Structure file.",
  }));
}

function checkRules(): SmokeResult[] {
  const unitA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const unitB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const tree = buildOrganizationalUnitTree([
    {
      id: unitA,
      organizationPartyId: "org",
      unitCode: "HQ",
      unitName: "Head Office",
      organizationalUnitTypeCode: "HEAD_OFFICE",
      organizationalUnitTypeName: "Head Office",
      parentOrganizationalUnitId: null,
      parentUnitName: null,
      isHeadOffice: true,
      phone: null,
      email: null,
      partyAddressId: null,
      partyAddressLabel: null,
      countryCode: "KE",
      latitude: null,
      longitude: null,
      locationDisplay: "KE",
      statusCode: ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE,
      openingDate: null,
      closingDate: null,
      notes: null,
    },
    {
      id: unitB,
      organizationPartyId: "org",
      unitCode: "FIN",
      unitName: "Finance",
      organizationalUnitTypeCode: "DEPARTMENT",
      organizationalUnitTypeName: "Department",
      parentOrganizationalUnitId: unitA,
      parentUnitName: "Head Office",
      isHeadOffice: false,
      phone: null,
      email: null,
      partyAddressId: null,
      partyAddressLabel: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      locationDisplay: "—",
      statusCode: ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE,
      openingDate: null,
      closingDate: null,
      notes: null,
    },
  ]);

  return [
    {
      name: "rule:organizations only own units",
      ok:
        canOwnOrganizationalUnits(PARTY_TYPE_CODES.ORGANIZATION) &&
        !canOwnOrganizationalUnits(PARTY_TYPE_CODES.INDIVIDUAL),
    },
    {
      name: "rule:unit code normalized uppercase",
      ok: normalizeUnitCode(" hq-01 ") === "HQ-01",
    },
    {
      name: "rule:cannot deactivate head office unit",
      ok: !canDeactivateOrganizationalUnit(
        ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE,
        true
      ),
    },
    {
      name: "rule:self-parent prohibited",
      ok: !isValidParentOrganizationalUnit(unitA, unitA),
    },
    {
      name: "rule:organization structure tab enabled",
      ok: PARTY_WORKSPACE_TABS.some(
        (tab) => tab.id === "organization-structure" && tab.available
      ),
    },
    {
      name: "rule:tree nests child under parent",
      ok: tree.length === 1 && tree[0]?.children.length === 1,
    },
    {
      name: "validator:addUnit happy path",
      ok: addOrganizationalUnitSchema.safeParse({
        unitCode: "FIN-01",
        unitName: "Finance Department",
        organizationalUnitTypeCode: "DEPARTMENT",
      }).success,
    },
    {
      name: "factory:createOrganizationalUnitService",
      ok: Boolean(createOrganizationalUnitService()),
    },
  ];
}

async function checkReferenceDataReadonly(): Promise<SmokeResult[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        name: "reference-data:DATABASE_URL",
        ok: false,
        detail: "DATABASE_URL missing.",
      },
    ];
  }

  try {
    const db = getDb();
    const [rows] = await db
      .select({ value: count() })
      .from(organizationalUnitType)
      .where(eq(organizationalUnitType.isActive, true));

    const activeCount = Number(rows?.value ?? 0);
    const requiredCodes = organizationalUnitTypes.map((type) => type.code);
    const present = await db
      .select({ code: organizationalUnitType.code })
      .from(organizationalUnitType)
      .where(eq(organizationalUnitType.isActive, true));
    const presentCodes = new Set(present.map((row) => row.code));
    const missing = requiredCodes.filter((code) => !presentCodes.has(code));

    return [
      {
        name: "reference-data:organizational_unit_type",
        ok: activeCount >= 17 && missing.length === 0,
        detail:
          activeCount >= 17 && missing.length === 0
            ? `active=${activeCount}`
            : missing.length > 0
              ? `Missing types: ${missing.join(", ")}. Run npm run db:migrate and npm run db:seed.`
              : "Catalogue empty. Run npm run db:migrate and npm run db:seed.",
      },
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read catalogue.";
    return [
      {
        name: "reference-data:read",
        ok: false,
        detail: /organizational_unit|does not exist|Failed query/i.test(message)
          ? "Run npm run db:migrate then npm run db:seed."
          : message,
      },
    ];
  }
}

async function main() {
  console.log("Organization Structure Engine (ENG-003c) — read-only smoke");
  const results = [
    ...checkRequiredFiles(),
    ...checkRules(),
    ...(await checkReferenceDataReadonly()),
  ];

  let failed = 0;
  for (const result of results) {
    if (!result.ok) {
      failed += 1;
    }
    console.log(
      `[${result.ok ? "PASS" : "FAIL"}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }
  console.log(
    failed === 0
      ? `\nSmoke validation passed (${results.length} checks).`
      : `\nSmoke validation failed: ${failed}/${results.length}.`
  );

  await closeDb();
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
