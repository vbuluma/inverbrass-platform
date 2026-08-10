/**
 * Purpose:
 * Smoke-validate BP-004 / IP-001 CRM Foundation.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip001-crm-foundation-smoke-validation.ts
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete business data.
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { crmStatus } from "@/db/schema/crm-status";
import { crmType } from "@/db/schema/crm-type";
import {
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline/constants";
import {
  CRM_DEFAULT_TAB,
  CRM_STATUS_CODES,
  CRM_TYPE_CODES,
  CRM_WORKSPACE_TABS,
} from "@/modules/crm/constants";
import { createCrmService } from "@/modules/crm/services/crm-service";
import {
  canTransitionCrmStatus,
  formatCustomerNumber,
  isCrmStatusCode,
  resolveDefaultCrmStatus,
} from "@/modules/crm/services/crm-rules";
import {
  createCrmRecordSchema,
  crmListFiltersSchema,
  crmSearchQuerySchema,
} from "@/modules/crm/validators/crm-validators";

const ROOT = path.resolve(__dirname, "..");

const MIGRATION_TAGS = ["0042_bp004_ip001_crm_foundation"] as const;

const REQUIRED_FILES = [
  "src/db/schema/crm-type.ts",
  "src/db/schema/crm-status.ts",
  "src/db/schema/crm-record.ts",
  "src/db/schema/work-assignment-sla.ts",
  "src/db/seeds/crm-types.ts",
  "src/db/seeds/crm-types-seed.ts",
  "src/db/seeds/crm-statuses.ts",
  "src/db/seeds/crm-statuses-seed.ts",
  "drizzle/0042_bp004_ip001_crm_foundation.sql",
  "src/core/work-assignment-sla/constants.ts",
  "src/core/work-assignment-sla/services/work-assignment-service.ts",
  "src/core/work-assignment-sla/repositories/work-assignment-repository.ts",
  "src/modules/crm/constants.ts",
  "src/modules/crm/errors.ts",
  "src/modules/crm/types.ts",
  "src/modules/crm/validators/crm-validators.ts",
  "src/modules/crm/services/crm-rules.ts",
  "src/modules/crm/services/crm-service.ts",
  "src/modules/crm/repositories/crm-record-repository.ts",
  "src/modules/crm/repositories/crm-reference-repository.ts",
  "src/modules/crm/actions/crm-actions.ts",
  "src/modules/crm/customer-360/widget-registry.ts",
  "src/modules/crm/customer-360/widget-catalog.ts",
  "src/modules/crm/customer-360/widget-config.ts",
  "src/modules/crm/customer-360/customer-360-composer.ts",
  "src/modules/crm/customer-360/bootstrap-widgets.ts",
  "src/modules/crm/customer-360/widgets/register-lead-widget.ts",
  "src/modules/crm/components/customer-360-timeline-section.tsx",
  "src/modules/crm/components/crm-dashboard.tsx",
  "src/modules/crm/components/crm-registration-form.tsx",
  "src/modules/crm/components/customer-workspace.tsx",
  "src/modules/crm/components/customer-360-panel.tsx",
  "src/modules/crm/crm-terminology-labels.ts",
  "src/app/(authenticated)/(app)/customers/page.tsx",
  "src/app/(authenticated)/(app)/customers/new/page.tsx",
  "src/app/(authenticated)/(app)/customers/[crmId]/page.tsx",
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
      detail: ok ? undefined : "Missing required CRM Foundation file.",
    };
  });
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    return [
      {
        name: "migration:journal",
        ok: false,
        detail: "Missing drizzle/meta/_journal.json.",
      },
    ];
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ tag?: string }>;
  };
  const registeredTags = new Set(
    (journal.entries ?? []).map((entry) => entry.tag).filter(Boolean)
  );

  return MIGRATION_TAGS.map((tag) => {
    const ok = registeredTags.has(tag);
    return {
      name: `migration:journal:${tag}`,
      ok,
      detail: ok
        ? undefined
        : `Migration ${tag} is not registered in drizzle/meta/_journal.json.`,
    };
  });
}

function checkValidators(): SmokeResult[] {
  const createOk = createCrmRecordSchema.safeParse({
    partyId: "00000000-0000-4000-8000-000000000001",
    crmTypeCode: CRM_TYPE_CODES.INDIVIDUAL,
  }).success;

  const createBad = !createCrmRecordSchema.safeParse({
    partyId: "not-a-uuid",
    crmTypeCode: "",
  }).success;

  const filtersOk = crmListFiltersSchema.safeParse({ limit: 10 }).success;
  const searchOk = crmSearchQuerySchema.safeParse("John").success;
  const searchBad = !crmSearchQuerySchema.safeParse("J").success;

  return [
    {
      name: "validator:createCrmRecordSchema:happy",
      ok: createOk,
    },
    {
      name: "validator:createCrmRecordSchema:invalid",
      ok: createBad,
    },
    {
      name: "validator:crmListFiltersSchema",
      ok: filtersOk,
    },
    {
      name: "validator:crmSearchQuerySchema:happy",
      ok: searchOk,
    },
    {
      name: "validator:crmSearchQuerySchema:tooShort",
      ok: searchBad,
    },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:defaultStatus",
      ok: resolveDefaultCrmStatus() === CRM_STATUS_CODES.PROSPECT,
    },
    {
      name: "rules:prospectToLead",
      ok: canTransitionCrmStatus(
        CRM_STATUS_CODES.PROSPECT,
        CRM_STATUS_CODES.LEAD
      ),
    },
    {
      name: "rules:leadToActive",
      ok: canTransitionCrmStatus(CRM_STATUS_CODES.LEAD, CRM_STATUS_CODES.ACTIVE),
    },
    {
      name: "rules:archivedImmutable",
      ok: !canTransitionCrmStatus(
        CRM_STATUS_CODES.ARCHIVED,
        CRM_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "rules:customerNumberFormat",
      ok: formatCustomerNumber(42) === "CUS-000042",
    },
    {
      name: "rules:isCrmStatusCode",
      ok: isCrmStatusCode(CRM_STATUS_CODES.PROSPECT),
    },
  ];
}

function checkWorkspaceTabs(): SmokeResult[] {
  const defaultTab = CRM_WORKSPACE_TABS.find((tab) => tab.id === CRM_DEFAULT_TAB);
  return [
    {
      name: "workspace:defaultTabExists",
      ok: Boolean(defaultTab),
    },
    {
      name: "workspace:customer360Default",
      ok: CRM_DEFAULT_TAB === "customer-360",
    },
    {
      name: "workspace:customer360Available",
      ok: defaultTab?.available === true,
    },
  ];
}

function checkPreferredChannelContract(): SmokeResult[] {
  const panelSource = readFileSync(
    path.join(ROOT, "src/modules/crm/components/customer-360-panel.tsx"),
    "utf8"
  );
  const serviceSource = readFileSync(
    path.join(ROOT, "src/modules/crm/services/crm-service.ts"),
    "utf8"
  );

  return [
    {
      name: "customer360:preferredChannelIdentityField",
      ok: panelSource.includes("Preferred channel"),
    },
    {
      name: "customer360:preferredChannelReadsBp002",
      ok:
        serviceSource.includes("createCommunicationPreferenceRepository") &&
        serviceSource.includes("preferredContactMethod"),
    },
  ];
}

function checkTimelineConstants(): SmokeResult[] {
  return [
    {
      name: "timeline:crmSourceModule",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM === "CRM",
    },
    {
      name: "timeline:crmRecordCreatedEvent",
      ok: PARTY_TIMELINE_EVENT_TYPES.CRM_RECORD_CREATED === "CRM_RECORD_CREATED",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  try {
    const service = createCrmService();
    return [
      {
        name: "service:createCrmService",
        ok: typeof service.getDashboard === "function",
      },
    ];
  } catch (error) {
    return [
      {
        name: "service:createCrmService",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

async function checkReferenceDataReadonly(): Promise<SmokeResult[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        name: "seed:referenceData",
        ok: true,
        detail: "Skipped — DATABASE_URL not set.",
      },
    ];
  }

  const db = getDb();

  try {
    const [typeCount] = await db.select({ total: count() }).from(crmType);
    const [statusCount] = await db.select({ total: count() }).from(crmStatus);

    const [individualType] = await db
      .select({ code: crmType.code })
      .from(crmType)
      .where(eq(crmType.code, CRM_TYPE_CODES.INDIVIDUAL))
      .limit(1);

    const [prospectStatus] = await db
      .select({ code: crmStatus.code })
      .from(crmStatus)
      .where(eq(crmStatus.code, CRM_STATUS_CODES.PROSPECT))
      .limit(1);

    return [
      {
        name: "seed:crmTypesPresent",
        ok: Number(typeCount?.total ?? 0) > 0,
        detail:
          Number(typeCount?.total ?? 0) > 0
            ? undefined
            : "Run npm run db:seed to load CRM type reference data.",
      },
      {
        name: "seed:crmStatusesPresent",
        ok: Number(statusCount?.total ?? 0) > 0,
        detail:
          Number(statusCount?.total ?? 0) > 0
            ? undefined
            : "Run npm run db:seed to load CRM status reference data.",
      },
      {
        name: "seed:individualType",
        ok: Boolean(individualType),
      },
      {
        name: "seed:prospectStatus",
        ok: Boolean(prospectStatus),
      },
    ];
  } catch (error) {
    return [
      {
        name: "seed:referenceData",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  } finally {
    await closeDb();
  }
}

function printResults(results: SmokeResult[]) {
  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.detail ? ` — ${result.detail}` : "";
    console.log(`${status} ${result.name}${detail}`);
  }

  console.log("");
  console.log(
    failed.length === 0
      ? `All ${results.length} CRM Foundation smoke checks passed.`
      : `${failed.length} of ${results.length} CRM Foundation smoke checks failed.`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const results = [
    ...checkRequiredFiles(),
    ...checkMigrationJournal(),
    ...checkValidators(),
    ...checkRules(),
    ...checkWorkspaceTabs(),
    ...checkPreferredChannelContract(),
    ...checkTimelineConstants(),
    ...checkServiceFactory(),
    ...(await checkReferenceDataReadonly()),
  ];

  printResults(results);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
