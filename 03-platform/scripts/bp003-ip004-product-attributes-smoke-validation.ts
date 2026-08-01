/**
 * Purpose:
 * Smoke-validate BP-003 / IP-004 Product Attributes Engine.
 *
 * Usage:
 *   npx tsx scripts/bp003-ip004-product-attributes-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  ATTRIBUTE_TIMELINE_EVENT_TYPES,
} from "@/core/attribute-timeline/constants";
import { filterAttributeGroupsForIndustry } from "@/core/industry-experience/attribute-group-filters";
import { PRODUCT_TIMELINE_EVENT_TYPES } from "@/core/product-timeline/constants";
import {
  ATTRIBUTE_DATA_TYPES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import {
  ATTRIBUTE_UI_LABELS,
} from "@/modules/product/attribute-ui-labels";
import { createAttributeAssignmentService } from "@/modules/product/services/attribute-assignment-service";
import { createAttributeDefinitionService } from "@/modules/product/services/attribute-definition-service";
import {
  dataTypeSupportsOptions,
  isValidAttributeDataType,
  normalizeAttributeCode,
  normalizeAttributeGroupCode,
  resolveDefaultAttributeDefinitionStatus,
  resolveDefaultAttributeGroupStatus,
} from "@/modules/product/services/attribute-rules";
import { validateAttributeValue } from "@/modules/product/services/attribute-validation-service";
import {
  assignAttributeScopeSchema,
  createAttributeDefinitionSchema,
  createAttributeGroupSchema,
  createAttributeOptionSchema,
  saveProductAttributeValuesSchema,
  searchAttributesSchema,
} from "@/modules/product/validators/attribute-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0032_bp003_ip004_product_attributes.sql",
  "src/db/schema/attribute-group.ts",
  "src/db/schema/product-attribute-definition.ts",
  "src/db/schema/product-attribute-option.ts",
  "src/db/schema/product-attribute-definition-scope.ts",
  "src/db/schema/product-attribute-assignment.ts",
  "src/db/schema/attribute-timeline.ts",
  "src/core/attribute-timeline/index.ts",
  "src/core/industry-experience/attribute-group-filters.ts",
  "src/modules/product/attribute-ui-labels.ts",
  "src/modules/product/repositories/attribute-group-repository.ts",
  "src/modules/product/repositories/attribute-definition-repository.ts",
  "src/modules/product/repositories/attribute-option-repository.ts",
  "src/modules/product/repositories/attribute-scope-repository.ts",
  "src/modules/product/repositories/attribute-assignment-repository.ts",
  "src/modules/product/services/attribute-rules.ts",
  "src/modules/product/services/attribute-validation-service.ts",
  "src/modules/product/services/attribute-definition-service.ts",
  "src/modules/product/services/attribute-assignment-service.ts",
  "src/modules/product/services/attribute-audit-query-service.ts",
  "src/modules/product/validators/attribute-validators.ts",
  "src/modules/product/actions/attribute-actions.ts",
  "src/modules/product/components/attribute-dashboard.tsx",
  "src/modules/product/components/dynamic-attribute-renderer.tsx",
  "src/modules/product/components/product-attributes-panel.tsx",
  "src/modules/product/components/attribute-definition-workspace.tsx",
  "src/app/(authenticated)/(app)/products/attributes/page.tsx",
  "src/app/(authenticated)/(app)/products/attributes/groups/new/page.tsx",
  "src/app/(authenticated)/(app)/products/attributes/groups/[groupId]/page.tsx",
  "src/app/(authenticated)/(app)/products/attributes/definitions/new/page.tsx",
  "src/app/(authenticated)/(app)/products/attributes/definitions/[definitionId]/page.tsx",
  "scripts/bp003-ip004-product-attributes-smoke-validation.ts",
];

const MIGRATION_TAGS = ["0032_bp003_ip004_product_attributes"];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-004 file.",
  }));
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    return [{ name: "journal", ok: false, detail: "Missing drizzle journal." }];
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  const tags = new Set(journal.entries.map((entry) => entry.tag));

  return MIGRATION_TAGS.map((tag) => ({
    name: `migration:${tag}`,
    ok: tags.has(tag),
    detail: tags.has(tag)
      ? undefined
      : "Migration tag not in journal (integration handover required).",
  }));
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:normalizeAttributeCode",
      ok: normalizeAttributeCode(" bed rooms ") === "BED_ROOMS",
    },
    {
      name: "rules:normalizeAttributeGroupCode",
      ok: normalizeAttributeGroupCode("property details") === "PROPERTY_DETAILS",
    },
    {
      name: "rules:defaultStatuses",
      ok:
        resolveDefaultAttributeGroupStatus() === "ACTIVE" &&
        resolveDefaultAttributeDefinitionStatus() === "ACTIVE",
    },
    {
      name: "rules:dataTypeSupport",
      ok:
        isValidAttributeDataType(ATTRIBUTE_DATA_TYPES.DECIMAL) &&
        dataTypeSupportsOptions(ATTRIBUTE_DATA_TYPES.SELECT) &&
        !dataTypeSupportsOptions(ATTRIBUTE_DATA_TYPES.TEXT),
    },
    {
      name: "rules:industryFilter",
      ok:
        filterAttributeGroupsForIndustry(
          [{ code: "PROPERTY_DETAILS" }, { code: "INVENTORY" }],
          "PROPERTY"
        ).length === 1,
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const results: SmokeResult[] = [];

  results.push({
    name: "validators:createAttributeGroup",
    ok: createAttributeGroupSchema.safeParse({
      code: "PROPERTY_DETAILS",
      name: "Property Details",
    }).success,
  });

  results.push({
    name: "validators:createAttributeDefinition",
    ok: createAttributeDefinitionSchema.safeParse({
      attributeGroupId: "550e8400-e29b-41d4-a716-446655440000",
      code: "BEDROOMS",
      name: "Bedrooms",
      dataType: ATTRIBUTE_DATA_TYPES.INTEGER,
    }).success,
  });

  results.push({
    name: "validators:createAttributeOption",
    ok: createAttributeOptionSchema.safeParse({
      optionCode: "4",
      optionLabel: "4 Bedrooms",
    }).success,
  });

  results.push({
    name: "validators:assignScope",
    ok: assignAttributeScopeSchema.safeParse({
      attributeDefinitionId: "550e8400-e29b-41d4-a716-446655440000",
      scopeType: "PRODUCT_TYPE",
      productTypeCode: "PROPERTY",
    }).success,
  });

  results.push({
    name: "validators:saveProductValues",
    ok: saveProductAttributeValuesSchema.safeParse({
      values: { BEDROOMS: 4 },
    }).success,
  });

  results.push({
    name: "validators:searchAttributes",
    ok: searchAttributesSchema.safeParse({ query: "bed" }).success,
  });

  return results;
}

function checkValidationService(): SmokeResult[] {
  try {
    const result = validateAttributeValue(
      {
        code: "INTEREST_RATE",
        name: "Interest Rate",
        dataType: ATTRIBUTE_DATA_TYPES.DECIMAL,
        isMandatory: true,
        isReadOnly: false,
        validationRule: { minValue: 0, maxValue: 100, precision: 2 },
      },
      12.5
    );
    return [
      {
        name: "validation:decimalHappyPath",
        ok: result.normalizedValue === 12.5,
      },
    ];
  } catch (error) {
    return [
      {
        name: "validation:decimalHappyPath",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function checkTimelineTaxonomy(): SmokeResult[] {
  const required = [
    "ATTRIBUTE_ASSIGNED",
    "ATTRIBUTE_UPDATED",
    "ATTRIBUTE_REMOVED",
    "ATTRIBUTE_OPTION_CHANGED",
  ] as const;

  return required.map((eventType) => ({
    name: `timeline:${eventType}`,
    ok:
      eventType in ATTRIBUTE_TIMELINE_EVENT_TYPES &&
      eventType in PRODUCT_TIMELINE_EVENT_TYPES,
  }));
}

function checkWorkspaceTabs(): SmokeResult[] {
  const attributesTab = PRODUCT_WORKSPACE_TABS.find(
    (tab) => tab.id === "attributes"
  );
  return [
    {
      name: "workspace:attributes tab enabled",
      ok: attributesTab?.available === true && attributesTab.futureIp === null,
    },
    {
      name: "attribute ui labels",
      ok: ATTRIBUTE_UI_LABELS.dashboardTitle === "Product Attributes",
    },
  ];
}

function checkServiceFactories(): SmokeResult[] {
  try {
    createAttributeDefinitionService();
    createAttributeAssignmentService();
    return [{ name: "services:factory", ok: true }];
  } catch (error) {
    return [
      {
        name: "services:factory",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function printResults(results: SmokeResult[]) {
  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }
  console.log("");
  console.log(
    failed.length === 0
      ? `All ${results.length} IP-004 smoke checks passed.`
      : `${failed.length} of ${results.length} checks failed.`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const results = [
    ...checkRequiredFiles(),
    ...checkMigrationJournal(),
    ...checkRules(),
    ...checkValidators(),
    ...checkValidationService(),
    ...checkTimelineTaxonomy(),
    ...checkWorkspaceTabs(),
    ...checkServiceFactories(),
  ];
  printResults(results);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
