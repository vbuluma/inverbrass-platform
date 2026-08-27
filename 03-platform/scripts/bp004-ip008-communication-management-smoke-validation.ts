/**
 * Smoke-validate BP-004 / IP-08 Communication Management.
 * Usage: npx tsx scripts/bp004-ip008-communication-management-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { AUDIT_ENTITY_NAMES, AUDIT_SOURCE_MODULES } from "@/core/audit/constants";
import {
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline/constants";
import {
  CRM_COMMUNICATION_CHANNEL_CODES,
  CRM_COMMUNICATION_DIRECTION_CODES,
} from "@/modules/crm-communication/constants";
import {
  CRM_COMMUNICATION_CUSTOMER_360_TIMELINE_EVENTS,
  CRM_COMMUNICATION_CUSTOMER_360_WIDGETS,
} from "@/modules/crm-communication/customer-360-contribution";
import {
  buildCommunicationNumber,
  resolveConsentResult,
} from "@/modules/crm-communication/services/crm-communication-rules";
import {
  createCrmCommunicationSchema,
  crmCommunicationListFiltersSchema,
} from "@/modules/crm-communication/validators/crm-communication-validators";

type SmokeResult = { name: string; ok: boolean };

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/crm-communication.ts",
  "src/db/schema/crm-communication-channel.ts",
  "src/db/schema/crm-communication-entity-link.ts",
  "drizzle/0051_bp004_ip008_communication_management.sql",
  "src/modules/crm-communication/constants.ts",
  "src/modules/crm-communication/services/crm-communication-service.ts",
  "src/modules/crm-communication/actions/crm-communication-actions.ts",
  "src/modules/crm-communication/components/crm-communication-dashboard.tsx",
  "src/modules/crm-communication/components/crm-communication-workspace.tsx",
  "src/app/(authenticated)/(app)/crm/communications/page.tsx",
  "src/app/(authenticated)/(app)/crm/communications/new/page.tsx",
  "src/app/(authenticated)/(app)/crm/communications/[communicationId]/page.tsx",
];

function main() {
  const results: SmokeResult[] = [
    ...REQUIRED_FILES.map((relativePath) => ({
      name: `file:${relativePath}`,
      ok: existsSync(path.join(ROOT, relativePath)),
    })),
    {
      name: "journal:0051",
      ok: (
        JSON.parse(
          readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8")
        ) as { entries: Array<{ tag: string }> }
      ).entries.some(
        (entry) => entry.tag === "0051_bp004_ip008_communication_management"
      ),
    },
    {
      name: "validator:create",
      ok: createCrmCommunicationSchema.safeParse({
        channelTypeCode: CRM_COMMUNICATION_CHANNEL_CODES.EMAIL,
        directionCode: CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND,
        summary: "Customer follow-up email",
        ownerUserId: "00000000-0000-4000-8000-000000000001",
        primaryPartyId: "00000000-0000-4000-8000-000000000002",
        contactChannelValue: "a@b.com",
      }).success,
    },
    {
      name: "validator:filters",
      ok: crmCommunicationListFiltersSchema.safeParse({ view: "MY" }).success,
    },
    {
      name: "rules:number",
      ok: buildCommunicationNumber(1) === "COM-000001",
    },
    {
      name: "rules:consent-blocked",
      ok:
        resolveConsentResult({
          directionCode: "OUTBOUND",
          requiresConsentOutbound: true,
          channelEnabled: false,
        }) === "BLOCKED",
    },
    {
      name: "timeline:COMMUNICATION_SENT",
      ok: PARTY_TIMELINE_EVENT_TYPES.COMMUNICATION_SENT === "COMMUNICATION_SENT",
    },
    {
      name: "timeline:source",
      ok: PARTY_TIMELINE_SOURCE_MODULES.CRM_COMMUNICATION === "CRM_COMMUNICATION",
    },
    {
      name: "audit:entity",
      ok: AUDIT_ENTITY_NAMES.CRM_COMMUNICATION === "crm_communication",
    },
    {
      name: "audit:source",
      ok: AUDIT_SOURCE_MODULES.CRM_COMMUNICATION === "crm_communication",
    },
    {
      name: "customer360:widgets",
      ok:
        CRM_COMMUNICATION_CUSTOMER_360_WIDGETS.some(
          (w) => w.id === "recent-communications"
        ) &&
        CRM_COMMUNICATION_CUSTOMER_360_WIDGETS.some(
          (w) => w.id === "last-interaction-channel"
        ),
    },
    {
      name: "customer360:events",
      ok: CRM_COMMUNICATION_CUSTOMER_360_TIMELINE_EVENTS.length >= 3,
    },
  ];

  let failed = 0;
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}`);
    if (!result.ok) failed += 1;
  }
  if (failed > 0) {
    console.error(`\nIP-08 smoke failed (${failed} checks).`);
    process.exit(1);
  }
  console.log("\nBP-004 IP-08 Communication Management smoke validation passed.");
}

main();
