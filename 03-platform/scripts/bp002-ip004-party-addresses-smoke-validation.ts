/**
 * Purpose:
 * Smoke-validate BP-002 / IP-004 Party Address Management.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip004-party-addresses-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { getAddressFieldLabels } from "@/core/shared/address";
import { closeDb, getDb } from "@/db/client";
import { addressType } from "@/db/schema/address-type";
import {
  ADDRESS_TYPE_CODES,
  PARTY_ADDRESS_STATUS_CODES,
  PARTY_TYPE_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import {
  canBeDefaultAddress,
  canDeactivateAddress,
  canReactivateAddress,
  isAddressTypeAllowedForPartyType,
} from "@/modules/party/services/party-address-rules";
import { createPartyAddressService } from "@/modules/party/services/party-address-service";
import {
  addPartyAddressSchema,
  updatePartyAddressSchema,
  validateGpsCoordinates,
} from "@/modules/party/validators/party-address-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/core/shared/address/address-hierarchy.ts",
  "src/core/shared/address/index.ts",
  "src/db/schema/address-type.ts",
  "src/db/schema/party-address.ts",
  "src/db/seeds/address-types.ts",
  "src/db/seeds/address-types-seed.ts",
  "drizzle/0014_bp002_ip004_party_addresses.sql",
  "src/modules/party/repositories/party-address-repository.ts",
  "src/modules/party/services/party-address-service.ts",
  "src/modules/party/services/party-address-rules.ts",
  "src/modules/party/validators/party-address-validators.ts",
  "src/modules/party/actions/party-address-actions.ts",
  "src/modules/party/components/party-addresses-panel.tsx",
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
      detail: ok ? undefined : "Missing required Party Addresses file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:addAddress happy path",
      ok: addPartyAddressSchema.safeParse({
        addressTypeCode: "RESIDENTIAL",
        countryCode: "ke",
        cityTown: "Nairobi",
      }).success,
    },
    {
      name: "validator:addAddress rejects missing country",
      ok: !addPartyAddressSchema.safeParse({
        addressTypeCode: "RESIDENTIAL",
        countryCode: "",
      }).success,
    },
    {
      name: "validator:updateAddress country",
      ok: updatePartyAddressSchema.safeParse({ countryCode: "UG" }).success,
    },
    {
      name: "validator:gps pair required together",
      ok: !validateGpsCoordinates(-1.2921, null).ok,
    },
    {
      name: "validator:gps valid pair",
      ok: validateGpsCoordinates(-1.2921, 36.8219).ok,
    },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rule:default must be active",
      ok:
        canBeDefaultAddress(PARTY_ADDRESS_STATUS_CODES.ACTIVE, true) &&
        !canBeDefaultAddress(PARTY_ADDRESS_STATUS_CODES.INACTIVE, true),
    },
    {
      name: "rule:cannot deactivate default",
      ok: !canDeactivateAddress(PARTY_ADDRESS_STATUS_CODES.ACTIVE, true),
    },
    {
      name: "rule:can deactivate non-default active",
      ok: canDeactivateAddress(PARTY_ADDRESS_STATUS_CODES.ACTIVE, false),
    },
    {
      name: "rule:reactivate inactive only",
      ok:
        canReactivateAddress(PARTY_ADDRESS_STATUS_CODES.INACTIVE) &&
        !canReactivateAddress(PARTY_ADDRESS_STATUS_CODES.ACTIVE),
    },
    {
      name: "rule:head office allowed for organization",
      ok: isAddressTypeAllowedForPartyType(
        PARTY_TYPE_CODES.ORGANIZATION,
        ADDRESS_TYPE_CODES.HEAD_OFFICE
      ),
    },
    {
      name: "rule:head office not allowed for individual",
      ok: !isAddressTypeAllowedForPartyType(
        PARTY_TYPE_CODES.INDIVIDUAL,
        ADDRESS_TYPE_CODES.HEAD_OFFICE
      ),
    },
    {
      name: "rule:addresses tab is functional in workspace",
      ok: PARTY_WORKSPACE_TABS.some(
        (tab) => tab.id === "addresses" && tab.available
      ),
    },
    {
      name: "eds-009:generic address field labels",
      ok: getAddressFieldLabels("KE").cityTown === "City / Town",
    },
  ];
}

function checkServiceFactory(): SmokeResult[] {
  return [
    {
      name: "factory:createPartyAddressService",
      ok: Boolean(createPartyAddressService()),
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
          "DATABASE_URL is missing. Cannot verify Address Type catalogue.",
      },
    ];
  }

  try {
    const db = getDb();
    const [rows] = await db
      .select({ value: count() })
      .from(addressType)
      .where(eq(addressType.isActive, true));

    const activeCount = Number(rows?.value ?? 0);
    const requiredCodes = Object.values(ADDRESS_TYPE_CODES);
    const present = await db
      .select({ code: addressType.code })
      .from(addressType)
      .where(eq(addressType.isActive, true));
    const presentCodes = new Set(present.map((row) => row.code));
    const missing = requiredCodes.filter((code) => !presentCodes.has(code));

    return [
      {
        name: "reference-data:address_type",
        ok: activeCount > 0 && missing.length === 0,
        detail:
          activeCount > 0 && missing.length === 0
            ? `active=${activeCount}`
            : missing.length > 0
              ? `Missing address types: ${missing.join(", ")}. Run npm run db:migrate and npm run db:seed.`
              : "Address Type catalogue is empty. Run npm run db:migrate and npm run db:seed, then re-run this smoke test.",
      },
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read address_type.";
    return [
      {
        name: "reference-data:read",
        ok: false,
        detail: /address_type|does not exist|Failed query/i.test(message)
          ? "Party Address tables are missing. Run `npm run db:migrate` then `npm run db:seed`, then re-run this smoke test (smoke itself remains read-only)."
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
  console.log("BP-002 / IP-004 Address Management — read-only smoke validation");
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
