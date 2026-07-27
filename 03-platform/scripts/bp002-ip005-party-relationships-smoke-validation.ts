/**
 * Purpose:
 * Smoke-validate BP-002 / IP-005 Party Relationship Management.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip005-party-relationships-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { relationshipType } from "@/db/schema/relationship-type";
import { relationshipTypes } from "@/db/seeds/relationship-types";
import {
  PARTY_RELATIONSHIP_STATUS_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import {
  canDeactivateRelationship,
  canReactivateRelationship,
  isActiveRelationshipBetweenParties,
  isSelfRelationship,
} from "@/modules/party/services/party-relationship-rules";
import { createPartyRelationshipService } from "@/modules/party/services/party-relationship-service";
import {
  addPartyRelationshipSchema,
  partySearchQuerySchema,
  updatePartyRelationshipSchema,
} from "@/modules/party/validators/party-relationship-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/relationship-type.ts",
  "src/db/schema/party-relationship.ts",
  "src/db/seeds/relationship-types.ts",
  "src/db/seeds/relationship-types-seed.ts",
  "drizzle/0015_bp002_ip005_party_relationships.sql",
  "src/modules/party/repositories/party-relationship-repository.ts",
  "src/modules/party/services/party-relationship-service.ts",
  "src/modules/party/services/party-relationship-rules.ts",
  "src/modules/party/validators/party-relationship-validators.ts",
  "src/modules/party/actions/party-relationship-actions.ts",
  "src/modules/party/components/party-relationships-panel.tsx",
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
      detail: ok ? undefined : "Missing required Party Relationships file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  const sampleUuid = "11111111-1111-4111-8111-111111111111";
  return [
    {
      name: "validator:addRelationship happy path",
      ok: addPartyRelationshipSchema.safeParse({
        toPartyId: sampleUuid,
        relationshipTypeCode: "PARENT",
      }).success,
    },
    {
      name: "validator:addRelationship rejects invalid uuid",
      ok: !addPartyRelationshipSchema.safeParse({
        toPartyId: "not-a-uuid",
        relationshipTypeCode: "PARENT",
      }).success,
    },
    {
      name: "validator:updateRelationship dates",
      ok: updatePartyRelationshipSchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      }).success,
    },
    {
      name: "validator:search query min length",
      ok: !partySearchQuerySchema.safeParse({ query: "a" }).success,
    },
    {
      name: "validator:search query accepts 2 chars",
      ok: partySearchQuerySchema.safeParse({ query: "jo" }).success,
    },
  ];
}

function checkRules(): SmokeResult[] {
  const partyA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const partyB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  return [
    {
      name: "rule:self relationship detected",
      ok:
        isSelfRelationship(partyA, partyA) &&
        !isSelfRelationship(partyA, partyB),
    },
    {
      name: "rule:can deactivate active only",
      ok:
        canDeactivateRelationship(PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE) &&
        !canDeactivateRelationship(PARTY_RELATIONSHIP_STATUS_CODES.INACTIVE),
    },
    {
      name: "rule:can reactivate inactive only",
      ok:
        canReactivateRelationship(PARTY_RELATIONSHIP_STATUS_CODES.INACTIVE) &&
        !canReactivateRelationship(PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE),
    },
    {
      name: "rule:relationships tab is functional in workspace",
      ok: PARTY_WORKSPACE_TABS.some(
        (tab) => tab.id === "relationships" && tab.available
      ),
    },
    {
      name: "rule:duplicate active same-type blocks reverse direction",
      ok: isActiveRelationshipBetweenParties(
        partyA,
        partyB,
        "PARENT",
        {
          fromPartyId: partyB,
          toPartyId: partyA,
          relationshipTypeCode: "PARENT",
          statusCode: PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE,
        }
      ),
    },
    {
      name: "rule:inactive relationship is not a duplicate",
      ok: !isActiveRelationshipBetweenParties(
        partyA,
        partyB,
        "PARENT",
        {
          fromPartyId: partyA,
          toPartyId: partyB,
          relationshipTypeCode: "PARENT",
          statusCode: PARTY_RELATIONSHIP_STATUS_CODES.INACTIVE,
        }
      ),
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  return [
    {
      name: "factory:createPartyRelationshipService",
      ok: Boolean(createPartyRelationshipService()),
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
          "DATABASE_URL is missing. Cannot verify Relationship Type catalogue.",
      },
    ];
  }

  try {
    const db = getDb();
    const [rows] = await db
      .select({ value: count() })
      .from(relationshipType)
      .where(eq(relationshipType.isActive, true));

    const activeCount = Number(rows?.value ?? 0);
    const requiredCodes = relationshipTypes.map((type) => type.code);
    const present = await db
      .select({ code: relationshipType.code })
      .from(relationshipType)
      .where(eq(relationshipType.isActive, true));
    const presentCodes = new Set(present.map((row) => row.code));
    const missing = requiredCodes.filter((code) => !presentCodes.has(code));

    return [
      {
        name: "reference-data:relationship_type",
        ok: activeCount >= 20 && missing.length === 0,
        detail:
          activeCount >= 20 && missing.length === 0
            ? `active=${activeCount}`
            : missing.length > 0
              ? `Missing relationship types: ${missing.join(", ")}. Run npm run db:migrate and npm run db:seed.`
              : "Relationship Type catalogue is empty. Run npm run db:migrate and npm run db:seed, then re-run this smoke test.",
      },
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read relationship_type.";
    return [
      {
        name: "reference-data:read",
        ok: false,
        detail: /relationship_type|party_relationship|does not exist|Failed query/i.test(
          message
        )
          ? "Party Relationship tables are missing. Run `npm run db:migrate` then `npm run db:seed`, then re-run this smoke test (smoke itself remains read-only)."
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
  console.log(
    "BP-002 / IP-005 Party Relationships — read-only smoke validation"
  );
  console.log(
    "This script never inserts, updates, deletes, seeds, or repairs data."
  );
  console.log("");

  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkRules(),
    ...checkServiceFactory(),
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
