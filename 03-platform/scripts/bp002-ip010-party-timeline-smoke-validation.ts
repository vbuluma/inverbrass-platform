/**
 * Purpose:
 * Smoke-validate BP-002 / IP-010 Party Timeline & Activity History.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip010-party-timeline-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { partyTimeline } from "@/db/schema/party-timeline";
import {
  PARTY_TIMELINE_CATEGORY_LABELS,
  PARTY_TIMELINE_DEFAULT_PAGE_SIZE,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULE_LABELS,
  PARTY_TIMELINE_SOURCE_MODULES,
  PARTY_TIMELINE_VISIBILITY,
} from "@/core/party-timeline/constants";
import { buildTimelineEventFromContext } from "@/core/party-timeline/helpers";
import { createPartyTimelineService } from "@/core/party-timeline/services/party-timeline-service";
import { PARTY_WORKSPACE_TABS } from "@/modules/party/constants";
import { createPartyTimelineQueryService } from "@/modules/party/services/party-timeline-query-service";
import { partyTimelineListFiltersSchema } from "@/modules/party/validators/party-timeline-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/party-timeline.ts",
  "drizzle/0022_bp002_ip010_party_timeline.sql",
  "src/core/party-timeline/constants.ts",
  "src/core/party-timeline/types.ts",
  "src/core/party-timeline/helpers.ts",
  "src/core/party-timeline/repositories/party-timeline-repository.ts",
  "src/core/party-timeline/services/party-timeline-service.ts",
  "src/core/party-timeline/index.ts",
  "src/modules/party/services/party-timeline-query-service.ts",
  "src/modules/party/validators/party-timeline-validators.ts",
  "src/modules/party/actions/party-timeline-actions.ts",
  "src/modules/party/components/party-timeline-panel.tsx",
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
      detail: ok ? undefined : "Missing required Party Timeline file.",
    };
  });
}

function checkConstants(): SmokeResult[] {
  return [
    {
      name: "constants:event categories defined",
      ok: Object.keys(PARTY_TIMELINE_EVENT_CATEGORIES).length >= 9,
    },
    {
      name: "constants:event types defined",
      ok: PARTY_TIMELINE_EVENT_TYPES.PARTY_CREATED === "PARTY_CREATED",
    },
    {
      name: "constants:source module party management",
      ok:
        PARTY_TIMELINE_SOURCE_MODULES.PARTY_MANAGEMENT === "PARTY_MANAGEMENT",
    },
    {
      name: "constants:visibility standard",
      ok: PARTY_TIMELINE_VISIBILITY.STANDARD === "STANDARD",
    },
    {
      name: "constants:category labels",
      ok: PARTY_TIMELINE_CATEGORY_LABELS.REGISTRATION === "Registration",
    },
    {
      name: "constants:source module labels",
      ok:
        PARTY_TIMELINE_SOURCE_MODULE_LABELS.PARTY_MANAGEMENT ===
        "Party Management",
    },
  ];
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:list filters happy path",
      ok: partyTimelineListFiltersSchema.safeParse({
        category: "DOCUMENTS",
        search: "verified",
        limit: 20,
        offset: 0,
      }).success,
    },
    {
      name: "validator:list filters reject oversized search",
      ok: !partyTimelineListFiltersSchema.safeParse({
        search: "x".repeat(201),
      }).success,
    },
  ];
}

function checkWorkspaceTab(): SmokeResult[] {
  const timelineTab = PARTY_WORKSPACE_TABS.find((tab) => tab.id === "timeline");
  return [
    {
      name: "workspace:timeline tab exists",
      ok: Boolean(timelineTab),
    },
    {
      name: "workspace:timeline tab available",
      ok: timelineTab?.available === true,
    },
    {
      name: "workspace:timeline tab label",
      ok: timelineTab?.label === "Party Timeline & Activity History",
    },
  ];
}

function checkHelper(): SmokeResult[] {
  const payload = buildTimelineEventFromContext(
    {
      platformUserId: "11111111-1111-4111-8111-111111111111",
      businessId: "22222222-2222-4222-8222-222222222222",
      businessMembershipId: "33333333-3333-4333-8333-333333333333",
    },
    {
      partyId: "44444444-4444-4444-8444-444444444444",
      eventType: PARTY_TIMELINE_EVENT_TYPES.DOCUMENT_VERIFIED,
      eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.DOCUMENTS,
      summary: "National ID verified",
    }
  );

  return [
    {
      name: "helper:buildTimelineEventFromContext",
      ok:
        payload.businessId === "22222222-2222-4222-8222-222222222222" &&
        payload.eventType === PARTY_TIMELINE_EVENT_TYPES.DOCUMENT_VERIFIED &&
        payload.sourceModule === PARTY_TIMELINE_SOURCE_MODULES.PARTY_MANAGEMENT,
    },
  ];
}

function checkServicesInstantiate(): SmokeResult[] {
  try {
    createPartyTimelineService();
    createPartyTimelineQueryService();
    return [{ name: "services:factory functions", ok: true }];
  } catch (error) {
    return [
      {
        name: "services:factory functions",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

async function checkDatabaseTable(): Promise<SmokeResult[]> {
  try {
    const db = getDb();
    const [result] = await db.select({ value: count() }).from(partyTimeline);
    return [
      {
        name: "database:party_timeline table readable",
        ok: true,
        detail: `rows=${Number(result?.value ?? 0)}`,
      },
    ];
  } catch (error) {
    return [
      {
        name: "database:party_timeline table readable",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkConstants(),
    ...checkValidators(),
    ...checkWorkspaceTab(),
    ...checkHelper(),
    ...checkServicesInstantiate(),
    ...(await checkDatabaseTable()),
    {
      name: "config:default page size",
      ok: PARTY_TIMELINE_DEFAULT_PAGE_SIZE === 20,
    },
  ];

  const failed = results.filter((result) => !result.ok);

  console.log("BP-002 / IP-010 Party Timeline Smoke Validation");
  console.log("=".repeat(52));

  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.detail ? ` — ${result.detail}` : "";
    console.log(`${status}  ${result.name}${detail}`);
  }

  console.log("=".repeat(52));
  console.log(
    failed.length === 0
      ? `All ${results.length} checks passed.`
      : `${failed.length} of ${results.length} checks failed.`
  );

  await closeDb();
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
