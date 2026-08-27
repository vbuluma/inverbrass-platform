/**
 * Purpose:
 * Smoke-validate BP-004 / IP-04 Account & Contact Management.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip004-account-contact-management-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { accountType } from "@/db/schema/account-type";
import { PARTY_TIMELINE_EVENT_TYPES } from "@/core/party-timeline/constants";
import { WORK_SUBJECT_TYPES } from "@/core/work-assignment-sla/constants";
import { CUSTOMER_360_WIDGET_CATALOG } from "@/modules/crm/customer-360/widget-catalog";
import {
  ACCOUNT_STATUS_CODES,
  ACCOUNT_TYPE_CODES,
} from "@/modules/crm/account/constants";
import { createAccountService } from "@/modules/crm/account/services/account-service";
import {
  formatAccountNumber,
  wouldCreateCircularHierarchy,
} from "@/modules/crm/account/services/account-rules";
import { createAccountSchema } from "@/modules/crm/account/validators/account-validators";

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_TAGS = ["0045_bp004_ip004_account_contact_management"] as const;

const REQUIRED_FILES = [
  "drizzle/0045_bp004_ip004_account_contact_management.sql",
  "src/db/schema/account-type.ts",
  "src/db/schema/account-status.ts",
  "src/db/schema/crm-contact-role.ts",
  "src/db/schema/crm-account.ts",
  "src/db/schema/crm-account-contact.ts",
  "src/modules/crm/account/constants.ts",
  "src/modules/crm/account/services/account-service.ts",
  "src/modules/crm/customer-360/widgets/register-account-hierarchy-widget.ts",
  "src/app/(authenticated)/(app)/accounts/page.tsx",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const ok = existsSync(path.join(ROOT, relativePath));
    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "Missing required file.",
    };
  });
}

function checkMigrationJournal(): SmokeResult[] {
  const journal = JSON.parse(
    readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8")
  ) as { entries?: Array<{ tag?: string }> };
  const tags = new Set((journal.entries ?? []).map((e) => e.tag));
  return MIGRATION_TAGS.map((tag) => ({
    name: `migration:journal:${tag}`,
    ok: tags.has(tag),
  }));
}

function checkRules(): SmokeResult[] {
  const parentMap = new Map<string, string | null>([
    ["a", "b"],
    ["b", "c"],
    ["c", null],
  ]);

  return [
    {
      name: "rules:accountNumberFormat",
      ok: formatAccountNumber(12) === "ACC-000012",
    },
    {
      name: "rules:circularHierarchyDetected",
      ok: wouldCreateCircularHierarchy("c", "a", parentMap),
    },
    {
      name: "rules:circularHierarchySelf",
      ok: wouldCreateCircularHierarchy("a", "a", parentMap),
    },
    {
      name: "rules:circularHierarchyOk",
      ok: !wouldCreateCircularHierarchy("a", null, parentMap),
    },
    {
      name: "validator:createAccountSchema",
      ok: createAccountSchema.safeParse({
        name: "Acme Corp",
        accountTypeCode: ACCOUNT_TYPE_CODES.SME,
        statusCode: ACCOUNT_STATUS_CODES.PROSPECT,
      }).success,
    },
    {
      name: "timeline:accountCreated",
      ok: PARTY_TIMELINE_EVENT_TYPES.ACCOUNT_CREATED === "ACCOUNT_CREATED",
    },
    {
      name: "timeline:contactRoleAssigned",
      ok:
        PARTY_TIMELINE_EVENT_TYPES.CONTACT_ROLE_ASSIGNED ===
        "CONTACT_ROLE_ASSIGNED",
    },
    {
      name: "sla:crmAccountSubject",
      ok: WORK_SUBJECT_TYPES.CRM_ACCOUNT === "crm_account",
    },
    {
      name: "customer360:accountHierarchyWidget",
      ok: CUSTOMER_360_WIDGET_CATALOG.some((w) => w.id === "account-hierarchy"),
    },
  ];
}

function checkService(): SmokeResult[] {
  const service = createAccountService();
  return [
    {
      name: "service:createAccountService",
      ok: typeof service.createAccount === "function",
    },
    {
      name: "service:assignContact",
      ok: typeof service.assignContact === "function",
    },
    {
      name: "service:getAccountHierarchyWidgetSummary",
      ok: typeof service.getAccountHierarchyWidgetSummary === "function",
    },
  ];
}

async function checkReferenceData(): Promise<SmokeResult[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        name: "seed:referenceData",
        ok: true,
        detail: "Skipped — no DATABASE_URL.",
      },
    ];
  }

  const db = getDb();
  try {
    const [countRow] = await db.select({ total: count() }).from(accountType);
    const [enterprise] = await db
      .select({ code: accountType.code })
      .from(accountType)
      .where(eq(accountType.code, ACCOUNT_TYPE_CODES.ENTERPRISE))
      .limit(1);

    return [
      {
        name: "seed:accountTypesPresent",
        ok: Number(countRow?.total ?? 0) > 0,
      },
      { name: "seed:enterpriseType", ok: Boolean(enterprise) },
    ];
  } finally {
    await closeDb();
  }
}

async function main() {
  const results = [
    ...checkFiles(),
    ...checkMigrationJournal(),
    ...checkRules(),
    ...checkService(),
    ...(await checkReferenceData()),
  ];

  const failed = results.filter((r) => !r.ok);
  for (const result of results) {
    console.log(
      `${result.ok ? "PASS" : "FAIL"} ${result.name}${
        result.detail ? ` — ${result.detail}` : ""
      }`
    );
  }
  console.log(
    failed.length === 0
      ? `\nAll ${results.length} Account & Contact Management smoke checks passed.`
      : `\n${failed.length} of ${results.length} checks failed.`
  );
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
