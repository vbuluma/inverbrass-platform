/**
 * Purpose:
 * Smoke-validate BP-002 / IP-003 Party Contacts & Communication.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip003-party-contacts-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { contactType } from "@/db/schema/contact-type";
import {
  CONTACT_TYPE_CODES,
  PARTY_CONTACT_STATUS_CODES,
  PARTY_TYPE_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import {
  isTelephoneContactType,
  normalizePhoneNumberToE164,
} from "@/core/shared/phone";
import {
  canBePreferred,
  canDeactivateContact,
  canReactivateContact,
  isWebsiteAllowedForPartyType,
  wouldDuplicatePreferredForType,
} from "@/modules/party/services/party-contact-rules";
import { createPartyContactService } from "@/modules/party/services/party-contact-service";
import {
  addPartyContactSchema,
  emailValueSchema,
  mobileValueSchema,
  updatePartyContactSchema,
  validateContactValueForType,
  websiteValueSchema,
} from "@/modules/party/validators/party-contact-validators";
import { registerIndividualSchema } from "@/modules/party/validators/party-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/core/shared/phone/phone-normalizer.ts",
  "src/core/shared/phone/index.ts",
  "src/db/schema/contact-type.ts",
  "src/db/schema/party-contact.ts",
  "src/db/seeds/contact-types.ts",
  "src/db/seeds/contact-types-seed.ts",
  "drizzle/0013_bp002_ip003_party_contacts.sql",
  "src/modules/party/repositories/party-contact-repository.ts",
  "src/modules/party/services/party-contact-service.ts",
  "src/modules/party/services/party-contact-rules.ts",
  "src/modules/party/services/party-phone.ts",
  "src/modules/party/validators/party-contact-validators.ts",
  "src/modules/party/actions/party-contact-actions.ts",
  "src/modules/party/components/party-contacts-panel.tsx",
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
      detail: ok ? undefined : "Missing required Party Contacts file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:addContact happy path",
      ok: addPartyContactSchema.safeParse({
        contactTypeCode: "MOBILE",
        contactValue: "+254712345678",
        isPreferred: true,
      }).success,
    },
    {
      name: "validator:addContact rejects empty value",
      ok: !addPartyContactSchema.safeParse({
        contactTypeCode: "MOBILE",
        contactValue: "",
      }).success,
    },
    {
      name: "validator:updateContact value",
      ok: updatePartyContactSchema.safeParse({
        contactValue: "ops@example.com",
      }).success,
    },
    {
      name: "validator:mobile format",
      ok: mobileValueSchema.safeParse("+254712345678").success,
    },
    {
      name: "validator:email format",
      ok: emailValueSchema.safeParse("ops@example.com").success,
    },
    {
      name: "validator:website format",
      ok: websiteValueSchema.safeParse("https://example.com").success,
    },
    {
      name: "validator:type-specific mobile",
      ok: validateContactValueForType(
        CONTACT_TYPE_CODES.MOBILE,
        "+254712345678"
      ).ok,
    },
    {
      name: "validator:type-specific email rejects bad",
      ok: !validateContactValueForType(CONTACT_TYPE_CODES.EMAIL, "not-an-email")
        .ok,
    },
    {
      name: "validator:individual registration requires mobile",
      ok: !registerIndividualSchema.safeParse({
        fullName: "Ada Lovelace",
        dateOfBirth: "1990-01-01",
        gender: "FEMALE",
        preferredLanguageCode: "en",
      }).success,
    },
    {
      name: "validator:individual registration with mobile",
      ok: registerIndividualSchema.safeParse({
        fullName: "Ada Lovelace",
        dateOfBirth: "1990-01-01",
        gender: "FEMALE",
        preferredLanguageCode: "en",
        mobile: "+254712345678",
      }).success,
    },
  ];
}

function checkEds003Normalization(): SmokeResult[] {
  const expected = "+254722134343";
  const variants = [
    "0722134343",
    "722134343",
    "254722134343",
    "+254722134343",
    "(0722) 134-343",
    "0722 134 343",
  ];

  const results: SmokeResult[] = variants.map((input) => {
    try {
      const normalized = normalizePhoneNumberToE164(input, {
        countryCode: "KE",
        dialCode: "+254",
      });
      return {
        name: `eds-003:normalize ${JSON.stringify(input)}`,
        ok: normalized === expected,
        detail: normalized === expected ? undefined : `got ${normalized}`,
      };
    } catch (error) {
      return {
        name: `eds-003:normalize ${JSON.stringify(input)}`,
        ok: false,
        detail: error instanceof Error ? error.message : "normalize failed",
      };
    }
  });

  results.push({
    name: "eds-003:telephone contact type detection",
    ok:
      isTelephoneContactType(CONTACT_TYPE_CODES.MOBILE) &&
      !isTelephoneContactType(CONTACT_TYPE_CODES.EMAIL),
  });

  return results;
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rule:preferred must be active",
      ok:
        canBePreferred(PARTY_CONTACT_STATUS_CODES.ACTIVE, true) &&
        !canBePreferred(PARTY_CONTACT_STATUS_CODES.INACTIVE, true),
    },
    {
      name: "rule:cannot deactivate preferred",
      ok: !canDeactivateContact(PARTY_CONTACT_STATUS_CODES.ACTIVE, true),
    },
    {
      name: "rule:can deactivate non-preferred active",
      ok: canDeactivateContact(PARTY_CONTACT_STATUS_CODES.ACTIVE, false),
    },
    {
      name: "rule:reactivate inactive only",
      ok:
        canReactivateContact(PARTY_CONTACT_STATUS_CODES.INACTIVE) &&
        !canReactivateContact(PARTY_CONTACT_STATUS_CODES.ACTIVE),
    },
    {
      name: "rule:website allowed for organization",
      ok: isWebsiteAllowedForPartyType(
        PARTY_TYPE_CODES.ORGANIZATION,
        CONTACT_TYPE_CODES.WEBSITE
      ),
    },
    {
      name: "rule:website not allowed for individual",
      ok: !isWebsiteAllowedForPartyType(
        PARTY_TYPE_CODES.INDIVIDUAL,
        CONTACT_TYPE_CODES.WEBSITE
      ),
    },
    {
      name: "rule:one preferred per type detection",
      ok:
        wouldDuplicatePreferredForType("existing-id", null) &&
        !wouldDuplicatePreferredForType("existing-id", "existing-id") &&
        !wouldDuplicatePreferredForType(null, null),
    },
    {
      name: "rule:contacts tab is functional in workspace",
      ok: PARTY_WORKSPACE_TABS.some(
        (tab) => tab.id === "contacts" && tab.available
      ),
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  return [
    {
      name: "factory:createPartyContactService",
      ok: Boolean(createPartyContactService()),
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
          "DATABASE_URL is missing. Cannot verify Contact Type catalogue.",
      },
    ];
  }

  try {
    const db = getDb();
    const [rows] = await db
      .select({ value: count() })
      .from(contactType)
      .where(eq(contactType.isActive, true));

    const activeCount = Number(rows?.value ?? 0);
    const requiredCodes = Object.values(CONTACT_TYPE_CODES);
    const present = await db
      .select({ code: contactType.code })
      .from(contactType)
      .where(eq(contactType.isActive, true));
    const presentCodes = new Set(present.map((row) => row.code));
    const missing = requiredCodes.filter((code) => !presentCodes.has(code));

    return [
      {
        name: "reference-data:contact_type",
        ok: activeCount > 0 && missing.length === 0,
        detail:
          activeCount > 0 && missing.length === 0
            ? `active=${activeCount}`
            : missing.length > 0
              ? `Missing contact types: ${missing.join(", ")}. Run npm run db:migrate and npm run db:seed.`
              : "Contact Type catalogue is empty. Run npm run db:migrate and npm run db:seed, then re-run this smoke test.",
      },
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read contact_type.";
    return [
      {
        name: "reference-data:read",
        ok: false,
        detail: /contact_type|does not exist|Failed query/i.test(message)
          ? "Party Contact tables are missing. Run `npm run db:migrate` then `npm run db:seed`, then re-run this smoke test (smoke itself remains read-only)."
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
    "BP-002 / IP-003 Contacts & Communication — read-only smoke validation"
  );
  console.log(
    "This script never inserts, updates, deletes, seeds, or repairs data."
  );
  console.log("");

  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkEds003Normalization(),
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
