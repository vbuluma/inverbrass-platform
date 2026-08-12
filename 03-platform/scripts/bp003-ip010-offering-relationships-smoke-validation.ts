/**
 * Smoke-validate BP-003 / IP-010 Offering Relationships.
 * Usage: npx tsx scripts/bp003-ip010-offering-relationships-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { offeringRelationshipTypes } from "@/db/seeds/offering-relationship-types";
import {
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import {
  isSelfRelationship,
  wouldCreateCircularDependency,
} from "@/modules/product/services/offering-relationship-rules";
import { createOfferingRelationshipService } from "@/modules/product/services/offering-relationship-service";
import { addOfferingRelationshipSchema } from "@/modules/product/validators/offering-relationship-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0038_bp003_ip010_offering_relationships.sql",
  "src/db/schema/offering-relationship-type.ts",
  "src/db/schema/offering-relationship.ts",
  "src/db/seeds/offering-relationship-types.ts",
  "src/db/seeds/offering-relationship-types-seed.ts",
  "src/modules/product/repositories/offering-relationship-type-repository.ts",
  "src/modules/product/repositories/offering-relationship-repository.ts",
  "src/modules/product/services/offering-relationship-rules.ts",
  "src/modules/product/services/offering-relationship-service.ts",
  "src/modules/product/validators/offering-relationship-validators.ts",
  "src/modules/product/actions/offering-relationship-actions.ts",
  "src/modules/product/components/offering-relationships-panel.tsx",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required file.",
  }));
}

function checkRules(): SmokeResult[] {
  const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const c = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  return [
    {
      name: "rule:self relationship detected",
      ok: isSelfRelationship(a, a) && !isSelfRelationship(a, b),
    },
    {
      name: "rule:circular dependency detected",
      ok: wouldCreateCircularDependency(a, c, [
        { sourceOfferingId: b, targetOfferingId: a },
        { sourceOfferingId: c, targetOfferingId: b },
      ]),
    },
    {
      name: "rule:relationships tab available",
      ok: PRODUCT_WORKSPACE_TABS.some(
        (tab) => tab.id === "relationships" && tab.available
      ),
    },
    {
      name: "seed:relationship types catalogue",
      ok: offeringRelationshipTypes.length >= 10,
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const sampleUuid = "11111111-1111-4111-8111-111111111111";
  return [
    {
      name: "validator:addRelationship",
      ok: addOfferingRelationshipSchema.safeParse({
        targetOfferingId: sampleUuid,
        relationshipTypeCode: "CROSS_SELL",
      }).success,
    },
  ];
}

function checkService(): SmokeResult[] {
  return [
    {
      name: "service:OfferingRelationshipService instantiates",
      ok: createOfferingRelationshipService() instanceof Object,
    },
  ];
}

async function main() {
  const results = [...checkFiles(), ...checkRules(), ...checkValidators(), ...checkService()];
  const failed = results.filter((r) => !r.ok);

  console.log("BP-003 IP-010 Offering Relationships Smoke Validation\n");
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await closeDb();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
