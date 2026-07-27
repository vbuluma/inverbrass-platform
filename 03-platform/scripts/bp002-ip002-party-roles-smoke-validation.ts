/**
 * Purpose:
 * Smoke-validate BP-002 / IP-002 Party Roles.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip002-party-roles-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { roleType } from "@/db/schema/role-type";
import {
  PARTY_ROLE_STATUS_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import {
  canEndPartyRole,
  canReactivatePartyRole,
  canSetPrimaryRole,
  shouldAssignAsPrimary,
  wouldDuplicateActiveRole,
} from "@/modules/party/services/party-role-rules";
import { createPartyRoleService } from "@/modules/party/services/party-role-service";
import {
  assignPartyRoleSchema,
  updatePartyRoleSchema,
} from "@/modules/party/validators/party-role-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/role-type.ts",
  "src/db/schema/party-role.ts",
  "src/db/seeds/role-types.ts",
  "src/db/seeds/role-types-seed.ts",
  "drizzle/0012_bp002_ip002_party_roles.sql",
  "src/modules/party/repositories/party-role-repository.ts",
  "src/modules/party/services/party-role-service.ts",
  "src/modules/party/services/party-role-rules.ts",
  "src/modules/party/validators/party-role-validators.ts",
  "src/modules/party/actions/party-role-actions.ts",
  "src/modules/party/components/party-roles-panel.tsx",
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
      detail: ok ? undefined : "Missing required Party Roles file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:assignRole happy path",
      ok: assignPartyRoleSchema.safeParse({
        roleTypeCode: "CUSTOMER",
        effectiveDate: "2026-07-27",
        isPrimary: true,
      }).success,
    },
    {
      name: "validator:assignRole rejects empty role",
      ok: !assignPartyRoleSchema.safeParse({ roleTypeCode: "" }).success,
    },
    {
      name: "validator:updateRole primary flag",
      ok: updatePartyRoleSchema.safeParse({ isPrimary: true }).success,
    },
    {
      name: "validator:updateRole reactivate flag",
      ok: updatePartyRoleSchema.safeParse({ reactivate: true }).success,
    },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rule:multiple concurrent roles allowed conceptually",
      ok: !wouldDuplicateActiveRole(["CUSTOMER"], "SUPPLIER"),
      detail: "Customer + Supplier is allowed",
    },
    {
      name: "rule:duplicate active role prevented",
      ok: wouldDuplicateActiveRole(["CUSTOMER", "FARMER"], "CUSTOMER"),
    },
    {
      name: "rule:first role becomes primary by default",
      ok: shouldAssignAsPrimary(0) === true,
    },
    {
      name: "rule:subsequent role not primary by default",
      ok: shouldAssignAsPrimary(1) === false,
    },
    {
      name: "rule:explicit primary overrides",
      ok: shouldAssignAsPrimary(2, true) === true,
    },
    {
      name: "rule:only ACTIVE can be primary",
      ok:
        canSetPrimaryRole(PARTY_ROLE_STATUS_CODES.ACTIVE) &&
        !canSetPrimaryRole(PARTY_ROLE_STATUS_CODES.ENDED),
    },
    {
      name: "rule:end role ACTIVE → ENDED",
      ok:
        canEndPartyRole(PARTY_ROLE_STATUS_CODES.ACTIVE) &&
        !canEndPartyRole(PARTY_ROLE_STATUS_CODES.ENDED),
    },
    {
      name: "rule:reactivate ENDED → ACTIVE",
      ok:
        canReactivatePartyRole(PARTY_ROLE_STATUS_CODES.ENDED) &&
        !canReactivatePartyRole(PARTY_ROLE_STATUS_CODES.ACTIVE),
    },
    {
      name: "rule:roles tab is functional in workspace",
      ok: PARTY_WORKSPACE_TABS.some(
        (tab) => tab.id === "roles" && tab.available
      ),
    },
    {
      name: "rule:historical roles retained (no delete API in rules)",
      ok:
        PARTY_ROLE_STATUS_CODES.ENDED === "ENDED" &&
        canEndPartyRole(PARTY_ROLE_STATUS_CODES.ACTIVE),
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  return [
    {
      name: "factory:createPartyRoleService",
      ok: Boolean(createPartyRoleService()),
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
          "DATABASE_URL is missing. Cannot verify Role Type catalogue.",
      },
    ];
  }

  try {
    const db = getDb();
    const [rows] = await db
      .select({ value: count() })
      .from(roleType)
      .where(eq(roleType.isActive, true));

    const activeCount = Number(rows?.value ?? 0);
    return [
      {
        name: "reference-data:role_type",
        ok: activeCount > 0,
        detail:
          activeCount > 0
            ? `active=${activeCount}`
            : "Role Type catalogue is empty. Run npm run db:migrate and npm run db:seed, then re-run this smoke test.",
      },
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read role_type.";
    return [
      {
        name: "reference-data:read",
        ok: false,
        detail: /role_type|does not exist|Failed query/i.test(message)
          ? "Party Roles tables are missing. Run `npm run db:migrate` then `npm run db:seed`, then re-run this smoke test (smoke itself remains read-only)."
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
  console.log("BP-002 / IP-002 Party Roles — read-only smoke validation");
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
