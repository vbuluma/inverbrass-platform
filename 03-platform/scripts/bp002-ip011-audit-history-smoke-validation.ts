/**
 * Purpose:
 * Smoke-validate BP-002 / IP-011 Enterprise Audit History.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip011-audit-history-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count } from "drizzle-orm";

import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createAuditService,
} from "@/core/audit";
import { closeDb, getDb } from "@/db/client";
import { auditHistory } from "@/db/schema/audit-history";
import { PARTY_WORKSPACE_TABS } from "@/modules/party/constants";
import { createPartyAuditQueryService } from "@/modules/party/services/party-audit-query-service";
import { partyAuditListFiltersSchema } from "@/modules/party/validators/party-audit-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/audit-history.ts",
  "drizzle/0023_bp002_ip011_audit_history.sql",
  "src/core/audit/constants.ts",
  "src/core/audit/types.ts",
  "src/core/audit/helpers.ts",
  "src/core/audit/repositories/audit-history-repository.ts",
  "src/core/audit/services/audit-service.ts",
  "src/core/audit/index.ts",
  "src/modules/party/services/party-audit-helper.ts",
  "src/modules/party/services/party-audit-query-service.ts",
  "src/modules/party/validators/party-audit-validators.ts",
  "src/modules/party/actions/party-audit-actions.ts",
  "src/modules/party/components/party-audit-history-panel.tsx",
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
      detail: ok ? undefined : "Missing required Audit History file.",
    };
  });
}

function checkConstants(): SmokeResult[] {
  return [
    {
      name: "constants:audit operations defined",
      ok: Object.keys(AUDIT_OPERATIONS).length === 8,
    },
    {
      name: "constants:create operation",
      ok: AUDIT_OPERATIONS.CREATE === "CREATE",
    },
    {
      name: "constants:party entity names",
      ok: AUDIT_ENTITY_NAMES.PARTY === "party",
    },
    {
      name: "constants:source module party management",
      ok: AUDIT_SOURCE_MODULES.PARTY_MANAGEMENT === "party_management",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:list filters happy path",
      ok: partyAuditListFiltersSchema.safeParse({
        operation: "UPDATE",
        search: "displayName",
        limit: 25,
        offset: 0,
      }).success,
    },
    {
      name: "validator:list filters reject oversized search",
      ok: !partyAuditListFiltersSchema.safeParse({
        search: "x".repeat(201),
      }).success,
    },
  ];
}

function checkWorkspaceTab(): SmokeResult[] {
  const auditTab = PARTY_WORKSPACE_TABS.find(
    (tab) => tab.id === "audit-history"
  );
  return [
    {
      name: "workspace:audit-history tab exists",
      ok: Boolean(auditTab),
    },
    {
      name: "workspace:audit-history tab available",
      ok: auditTab?.available === true,
    },
    {
      name: "workspace:audit-history tab label",
      ok: auditTab?.label === "Audit History",
    },
  ];
}

function checkHelper(): SmokeResult[] {
  const payload = buildAuditRecordFromContext(
    {
      platformUserId: "11111111-1111-4111-8111-111111111111",
      businessId: "22222222-2222-4222-8222-222222222222",
      businessMembershipId: "33333333-3333-4333-8333-333333333333",
    },
    {
      partyId: "44444444-4444-4444-8444-444444444444",
      entityName: AUDIT_ENTITY_NAMES.PARTY,
      entityId: "44444444-4444-4444-8444-444444444444",
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_MANAGEMENT,
      changes: [
        { fieldName: "displayName", oldValue: "Before", newValue: "After" },
      ],
    }
  );

  return [
    {
      name: "helper:buildAuditRecordFromContext",
      ok:
        payload.businessId === "22222222-2222-4222-8222-222222222222" &&
        payload.operation === AUDIT_OPERATIONS.UPDATE &&
        payload.sourceModule === AUDIT_SOURCE_MODULES.PARTY_MANAGEMENT,
    },
  ];
}

async function checkDatabaseTable(): Promise<SmokeResult[]> {
  try {
    const db = getDb();
    await db.select({ value: count() }).from(auditHistory).limit(1);
    return [
      {
        name: "database:audit_history readable",
        ok: true,
      },
    ];
  } catch (error) {
    return [
      {
        name: "database:audit_history readable",
        ok: false,
        detail:
          error instanceof Error
            ? error.message
            : "Cannot query audit_history — run db:migrate.",
      },
    ];
  }
}

function checkServices(): SmokeResult[] {
  const auditService = createAuditService();
  const queryService = createPartyAuditQueryService();
  return [
    {
      name: "service:AuditService.record exists",
      ok: typeof auditService.record === "function",
    },
    {
      name: "service:AuditService.listByPartyId exists",
      ok: typeof auditService.listByPartyId === "function",
    },
    {
      name: "service:PartyAuditQueryService exists",
      ok: typeof queryService.getAuditPanel === "function",
    },
  ];
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkConstants(),
    ...checkValidators(),
    ...checkWorkspaceTab(),
    ...checkHelper(),
    ...checkServices(),
    ...(await checkDatabaseTable()),
  ];

  const failed = results.filter((result) => !result.ok);

  console.log("\nBP-002 / IP-011 — Enterprise Audit History Smoke Validation\n");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`  [${status}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  console.log(`\n${results.length - failed.length}/${results.length} checks passed.\n`);

  await closeDb();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
