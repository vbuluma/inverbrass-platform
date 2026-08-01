/**
 * Smoke-validate BP-003 / IP-008 Product Lifecycle Management.
 * Usage: npx tsx scripts/bp003-ip008-product-lifecycle-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  PRODUCT_LIFECYCLE_STATE_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import {
  canActivate,
  canSubmitForApproval,
  canTransitionLifecycleState,
  incrementVersion,
  isSelfReplacement,
} from "@/modules/product/services/product-lifecycle-rules";
import { createProductLifecycleService } from "@/modules/product/services/product-lifecycle-service";
import {
  scheduleLifecycleActionSchema,
  setReplacementProductSchema,
} from "@/modules/product/validators/product-lifecycle-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0033_bp003_ip008_product_lifecycle.sql",
  "src/db/schema/product-lifecycle.ts",
  "src/db/schema/product-lifecycle-event.ts",
  "src/modules/product/repositories/product-lifecycle-repository.ts",
  "src/modules/product/repositories/product-lifecycle-event-repository.ts",
  "src/modules/product/services/product-lifecycle-rules.ts",
  "src/modules/product/services/product-lifecycle-service.ts",
  "src/modules/product/validators/product-lifecycle-validators.ts",
  "src/modules/product/actions/product-lifecycle-actions.ts",
  "src/modules/product/components/product-lifecycle-panel.tsx",
  "src/modules/product/components/product-lifecycle-dashboard.tsx",
  "src/app/(authenticated)/(app)/products/lifecycle/page.tsx",
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
  const sampleUuid = "11111111-1111-4111-8111-111111111111";
  return [
    {
      name: "rule:draft to pending approval",
      ok: canTransitionLifecycleState(
        PRODUCT_LIFECYCLE_STATE_CODES.DRAFT,
        PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL
      ),
    },
    {
      name: "rule:archived is terminal",
      ok: !canTransitionLifecycleState(
        PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED,
        PRODUCT_LIFECYCLE_STATE_CODES.DRAFT
      ),
    },
    {
      name: "rule:can submit for approval from draft",
      ok: canSubmitForApproval(PRODUCT_LIFECYCLE_STATE_CODES.DRAFT),
    },
    {
      name: "rule:can activate from approved",
      ok: canActivate(
        PRODUCT_LIFECYCLE_STATE_CODES.APPROVED,
        "APPROVED"
      ),
    },
    {
      name: "rule:self replacement blocked",
      ok: isSelfReplacement(sampleUuid, sampleUuid),
    },
    {
      name: "rule:version increment minor",
      ok: incrementVersion(1, 0, false).versionNumber === "1.1",
    },
    {
      name: "rule:lifecycle tab available",
      ok: PRODUCT_WORKSPACE_TABS.some(
        (tab) => tab.id === "lifecycle" && tab.available
      ),
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const sampleUuid = "11111111-1111-4111-8111-111111111111";
  return [
    {
      name: "validator:setReplacement",
      ok: setReplacementProductSchema.safeParse({
        replacementProductId: sampleUuid,
      }).success,
    },
    {
      name: "validator:scheduleAction",
      ok: scheduleLifecycleActionSchema.safeParse({
        scheduledAction: "ACTIVATE",
        scheduledAt: "2026-12-31",
      }).success,
    },
  ];
}

function checkService(): SmokeResult[] {
  return [
    {
      name: "service:ProductLifecycleService instantiates",
      ok: createProductLifecycleService() instanceof Object,
    },
  ];
}

async function main() {
  const results = [...checkFiles(), ...checkRules(), ...checkValidators(), ...checkService()];
  const failed = results.filter((r) => !r.ok);

  console.log("BP-003 IP-008 Product Lifecycle Smoke Validation\n");
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
