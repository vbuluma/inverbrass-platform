/**
 * Purpose:
 * Smoke-validate BP-002 / IP-012 Party Communication & Consent Preferences.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip012-communication-preference-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count } from "drizzle-orm";

import {
  COMMUNICATION_PREFERENCE_STATUS_CODES,
  createCommunicationPreferenceService,
  PREFERRED_CONTACT_METHODS,
  validateQuietHours,
} from "@/core/communication-preference";
import { closeDb, getDb } from "@/db/client";
import { partyCommunicationPreference } from "@/db/schema/party-communication-preference";
import { PARTY_WORKSPACE_TABS } from "@/modules/party/constants";
import { createPartyCommunicationPreferenceService } from "@/modules/party/services/party-communication-preference-service";
import { savePartyCommunicationPreferenceSchema } from "@/modules/party/validators/party-communication-preference-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/party-communication-preference.ts",
  "drizzle/0024_bp002_ip012_party_communication_preference.sql",
  "src/core/communication-preference/constants.ts",
  "src/core/communication-preference/types.ts",
  "src/core/communication-preference/rules.ts",
  "src/core/communication-preference/repositories/communication-preference-repository.ts",
  "src/core/communication-preference/services/communication-preference-service.ts",
  "src/core/communication-preference/index.ts",
  "src/modules/party/services/party-communication-preference-service.ts",
  "src/modules/party/validators/party-communication-preference-validators.ts",
  "src/modules/party/actions/party-communication-preference-actions.ts",
  "src/modules/party/components/party-communication-preferences-panel.tsx",
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
      detail: ok ? undefined : "Missing required Communication Preference file.",
    };
  });
}

function checkConstants(): SmokeResult[] {
  return [
    {
      name: "constants:status active",
      ok:
        COMMUNICATION_PREFERENCE_STATUS_CODES.ACTIVE === "ACTIVE",
    },
    {
      name: "constants:preferred contact methods",
      ok: PREFERRED_CONTACT_METHODS.EMAIL === "EMAIL",
    },
    {
      name: "rules:quiet hours valid range",
      ok: validateQuietHours("09:00", "17:00") === null,
    },
    {
      name: "rules:quiet hours reject equal times",
      ok: validateQuietHours("09:00", "09:00") !== null,
    },
  ];
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:save happy path",
      ok: savePartyCommunicationPreferenceSchema.safeParse({
        preferredContactMethod: "EMAIL",
        emailEnabled: true,
        marketingConsent: false,
        version: 1,
      }).success,
    },
    {
      name: "validator:save reject invalid quiet hours",
      ok: !savePartyCommunicationPreferenceSchema.safeParse({
        quietHoursStart: "99:00",
      }).success,
    },
  ];
}

function checkWorkspaceTab(): SmokeResult[] {
  const tab = PARTY_WORKSPACE_TABS.find(
    (item) => item.id === "communication-preferences"
  );
  return [
    {
      name: "workspace:communication-preferences tab exists",
      ok: Boolean(tab),
    },
    {
      name: "workspace:communication-preferences tab available",
      ok: tab?.available === true,
    },
    {
      name: "workspace:communication-preferences tab label",
      ok: tab?.label === "Communication & Consent Preferences",
    },
  ];
}

function checkServices(): SmokeResult[] {
  createCommunicationPreferenceService();
  createPartyCommunicationPreferenceService();
  return [
    {
      name: "service:CommunicationPreferenceService exists",
      ok: true,
    },
    {
      name: "service:PartyCommunicationPreferenceService exists",
      ok: true,
    },
  ];
}

async function checkDatabase(): Promise<SmokeResult> {
  try {
    const db = getDb();
    await db.select({ value: count() }).from(partyCommunicationPreference);
    return {
      name: "database:party_communication_preference readable",
      ok: true,
    };
  } catch (error) {
    return {
      name: "database:party_communication_preference readable",
      ok: false,
      detail:
        error instanceof Error
          ? `${error.message} — run db:migrate.`
          : "Cannot query party_communication_preference — run db:migrate.",
    };
  }
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkConstants(),
    ...checkValidators(),
    ...checkWorkspaceTab(),
    ...checkServices(),
    await checkDatabase(),
  ];

  console.log("\nBP-002 / IP-012 — Communication & Consent Preferences Smoke Validation\n");

  let passed = 0;
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    if (result.ok) {
      passed += 1;
    }
    console.log(`  [${status}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  console.log(`\n${passed}/${results.length} checks passed.\n`);
  await closeDb();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
