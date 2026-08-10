/**
 * Purpose:
 * Smoke-validate BP-004 / IP-02 Lead Management.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip002-lead-management-smoke-validation.ts
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete business data.
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { leadSource } from "@/db/schema/lead-source";
import { leadStatus } from "@/db/schema/lead-status";
import {
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline/constants";
import {
  WORK_SUBJECT_TYPES,
} from "@/core/work-assignment-sla/constants";
import { CUSTOMER_360_WIDGET_CATALOG } from "@/modules/crm/customer-360/widget-catalog";
import {
  LEAD_STATUS_CODES,
} from "@/modules/crm/lead/constants";
import { createLeadService } from "@/modules/crm/lead/services/lead-service";
import {
  canTransitionLeadStatus,
  formatLeadNumber,
  isLeadStatusCode,
} from "@/modules/crm/lead/services/lead-rules";
import {
  createLeadSchema,
  leadConvertSchema,
  leadListFiltersSchema,
  leadSearchQuerySchema,
} from "@/modules/crm/lead/validators/lead-validators";
import {
  DEFAULT_LEAD_CONVERSION_CONFIG,
  resolveLeadConversionConfig,
} from "@/modules/crm/lead/services/lead-conversion-config";
import {
  buildLeadConversionMetadata,
  readLeadConversionMetadata,
} from "@/modules/crm/opportunity/constants";

const ROOT = path.resolve(__dirname, "..");

const MIGRATION_TAGS = ["0043_bp004_ip002_lead_management"] as const;

const REQUIRED_FILES = [
  "src/db/schema/lead-status.ts",
  "src/db/schema/lead-source.ts",
  "src/db/schema/lead-disqualification-reason.ts",
  "src/db/schema/crm-lead.ts",
  "src/db/seeds/lead-statuses.ts",
  "src/db/seeds/lead-statuses-seed.ts",
  "src/db/seeds/lead-sources.ts",
  "src/db/seeds/lead-sources-seed.ts",
  "src/db/seeds/lead-disqualification-reasons.ts",
  "src/db/seeds/lead-disqualification-reasons-seed.ts",
  "drizzle/0043_bp004_ip002_lead_management.sql",
  "src/modules/crm/lead/constants.ts",
  "src/modules/crm/lead/errors.ts",
  "src/modules/crm/lead/types.ts",
  "src/modules/crm/lead/validators/lead-validators.ts",
  "src/modules/crm/lead/services/lead-rules.ts",
  "src/modules/crm/lead/services/lead-service.ts",
  "src/modules/crm/lead/services/lead-conversion-config.ts",
  "src/modules/crm/lead/repositories/lead-repository.ts",
  "src/modules/crm/lead/repositories/lead-reference-repository.ts",
  "src/modules/crm/lead/actions/lead-actions.ts",
  "src/modules/crm/customer-360/widgets/register-lead-widget.ts",
  "src/modules/crm/lead/components/lead-dashboard.tsx",
  "src/modules/crm/lead/components/lead-registration-form.tsx",
  "src/modules/crm/lead/components/lead-workspace.tsx",
  "src/app/(authenticated)/(app)/leads/page.tsx",
  "src/app/(authenticated)/(app)/leads/new/page.tsx",
  "src/app/(authenticated)/(app)/leads/[leadId]/page.tsx",
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
      detail: ok ? undefined : "Missing required Lead Management file.",
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
  const createOk = createLeadSchema.safeParse({
    partyId: "00000000-0000-4000-8000-000000000001",
    sourceCode: "WEB",
  }).success;

  const createBad = !createLeadSchema.safeParse({
    partyId: "not-a-uuid",
    sourceCode: "",
  }).success;

  const filtersOk = leadListFiltersSchema.safeParse({ limit: 10 }).success;
  const searchOk = leadSearchQuerySchema.safeParse("John").success;
  const convertOk = leadConvertSchema.safeParse({ version: 1 }).success;

  return [
    { name: "validator:createLeadSchema:happy", ok: createOk },
    { name: "validator:createLeadSchema:invalid", ok: createBad },
    { name: "validator:leadListFiltersSchema", ok: filtersOk },
    { name: "validator:leadSearchQuerySchema", ok: searchOk },
    { name: "validator:leadConvertSchema", ok: convertOk },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:newToContacted",
      ok: canTransitionLeadStatus(LEAD_STATUS_CODES.NEW, LEAD_STATUS_CODES.CONTACTED),
    },
    {
      name: "rules:qualifiedToConverted",
      ok: canTransitionLeadStatus(
        LEAD_STATUS_CODES.QUALIFIED,
        LEAD_STATUS_CODES.CONVERTED
      ),
    },
    {
      name: "rules:convertedImmutable",
      ok: !canTransitionLeadStatus(
        LEAD_STATUS_CODES.CONVERTED,
        LEAD_STATUS_CODES.NEW
      ),
    },
    {
      name: "rules:leadNumberFormat",
      ok: formatLeadNumber(7) === "LED-000007",
    },
    {
      name: "rules:isLeadStatusCode",
      ok: isLeadStatusCode(LEAD_STATUS_CODES.NEW),
    },
    {
      name: "conversion:configDefaults",
      ok:
        DEFAULT_LEAD_CONVERSION_CONFIG.createOpportunityDefault === true &&
        DEFAULT_LEAD_CONVERSION_CONFIG.createCrmIfMissingDefault === true &&
        DEFAULT_LEAD_CONVERSION_CONFIG.crmStatusOnConvert === "LEAD" &&
        DEFAULT_LEAD_CONVERSION_CONFIG.promoteCrmToActiveOnWin === true,
    },
    {
      name: "conversion:configOverrideFromSettings",
      ok: (() => {
        const resolved = resolveLeadConversionConfig({
          crm: {
            lead: {
              conversion: {
                createOpportunityDefault: false,
                crmStatusOnConvert: "PROSPECT",
              },
            },
          },
        });
        return (
          resolved.createOpportunityDefault === false &&
          resolved.crmStatusOnConvert === "PROSPECT"
        );
      })(),
    },
    {
      name: "conversion:attributionMetadataRoundTrip",
      ok: (() => {
        const metadata = buildLeadConversionMetadata({
          sourceCode: "API",
          qualificationScore: 72,
          email: "a@b.com",
        });
        const read = readLeadConversionMetadata(metadata);
        return read?.sourceCode === "API" && read.qualificationScore === 72;
      })(),
    },
  ];
}

function checkTimelineConstants(): SmokeResult[] {
  return [
    {
      name: "timeline:leadCreatedEvent",
      ok: PARTY_TIMELINE_EVENT_TYPES.LEAD_CREATED === "LEAD_CREATED",
    },
    {
      name: "timeline:leadQualifiedEvent",
      ok: PARTY_TIMELINE_EVENT_TYPES.LEAD_QUALIFIED === "LEAD_QUALIFIED",
    },
    {
      name: "timeline:leadConvertedEvent",
      ok: PARTY_TIMELINE_EVENT_TYPES.LEAD_CONVERTED === "LEAD_CONVERTED",
    },
    {
      name: "timeline:leadDisqualifiedEvent",
      ok: PARTY_TIMELINE_EVENT_TYPES.LEAD_DISQUALIFIED === "LEAD_DISQUALIFIED",
    },
    {
      name: "timeline:crmSourceModule",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM === "CRM",
    },
  ];
}

function checkCustomer360Widget(): SmokeResult[] {
  const activeLead = CUSTOMER_360_WIDGET_CATALOG.find(
    (entry) => entry.id === "active-lead"
  );

  return [
    {
      name: "customer360:activeLeadCatalogEntry",
      ok: Boolean(activeLead),
    },
    {
      name: "customer360:activeLeadSourceIp",
      ok: activeLead?.sourceIp === "IP-02",
    },
  ];
}

function checkWorkAssignmentSubjectType(): SmokeResult[] {
  return [
    {
      name: "sla:crmLeadSubjectType",
      ok: WORK_SUBJECT_TYPES.CRM_LEAD === "crm_lead",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  try {
    const service = createLeadService();
    return [
      {
        name: "service:createLeadService",
        ok: typeof service.getDashboard === "function",
      },
      {
        name: "service:getActiveLeadWidgetSummary",
        ok: typeof service.getActiveLeadWidgetSummary === "function",
      },
    ];
  } catch (error) {
    return [
      {
        name: "service:createLeadService",
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
    const [statusCount] = await db.select({ total: count() }).from(leadStatus);
    const [sourceCount] = await db.select({ total: count() }).from(leadSource);

    const [newStatus] = await db
      .select({ code: leadStatus.code })
      .from(leadStatus)
      .where(eq(leadStatus.code, LEAD_STATUS_CODES.NEW))
      .limit(1);

    return [
      {
        name: "seed:leadStatusesPresent",
        ok: Number(statusCount?.total ?? 0) > 0,
        detail:
          Number(statusCount?.total ?? 0) > 0
            ? undefined
            : "Run npm run db:seed to load lead status reference data.",
      },
      {
        name: "seed:leadSourcesPresent",
        ok: Number(sourceCount?.total ?? 0) > 0,
        detail:
          Number(sourceCount?.total ?? 0) > 0
            ? undefined
            : "Run npm run db:seed to load lead source reference data.",
      },
      {
        name: "seed:newLeadStatus",
        ok: Boolean(newStatus),
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
      ? `All ${results.length} Lead Management smoke checks passed.`
      : `${failed.length} of ${results.length} Lead Management smoke checks failed.`
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
    ...checkTimelineConstants(),
    ...checkCustomer360Widget(),
    ...checkWorkAssignmentSubjectType(),
    ...checkServiceFactory(),
    ...(await checkReferenceDataReadonly()),
  ];

  printResults(results);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
