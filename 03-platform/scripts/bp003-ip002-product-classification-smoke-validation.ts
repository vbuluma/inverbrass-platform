/**
 * Purpose:
 * Smoke-validate BP-003 / IP-002 Catalogue Structure (freeze refinements).
 *
 * Usage:
 *   npx tsx scripts/bp003-ip002-product-classification-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  CLASSIFICATION_TIMELINE_EVENT_TYPES,
} from "@/core/product-classification-timeline/constants";
import {
  filterClassificationsForIndustry,
  isClassificationVisibleForIndustry,
} from "@/core/industry-experience/classification-filters";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import {
  PRODUCT_CLASSIFICATION_STATUS_CODES,
  PRODUCT_CLASSIFICATION_TYPE_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import {
  CATALOGUE_STRUCTURE_BULK_OPERATIONS,
  CATALOGUE_STRUCTURE_RELATIONSHIP_TYPES,
} from "@/modules/product/catalogue-structure-ui-labels";
import { buildCatalogueStructureUiLabels } from "@/modules/product/product-terminology-labels";
import {
  buildClassificationBreadcrumbPath,
  buildProductClassificationTree,
  computeMaxTreeDepth,
} from "@/modules/product/services/product-classification-tree";
import {
  canAssignToClassification,
  canTransitionClassificationStatus,
  normalizeClassificationCode,
  resolveDefaultClassificationStatus,
  wouldCreateCircularHierarchy,
} from "@/modules/product/services/product-classification-rules";
import { createProductClassificationService } from "@/modules/product/services/product-classification-service";
import { createProductClassificationSchema } from "@/modules/product/validators/product-classification-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0029_bp003_ip002_product_classification.sql",
  "drizzle/0030_bp003_ip002_classification_enhancements.sql",
  "src/db/schema/product-classification-type.ts",
  "src/db/schema/product-classification-timeline.ts",
  "src/db/schema/product-classification-relationship.ts",
  "src/db/seeds/product-classification-types.ts",
  "src/db/seeds/product-classification-types-seed.ts",
  "src/core/product-classification-timeline/index.ts",
  "src/core/industry-experience/classification-filters.ts",
  "src/modules/product/catalogue-structure-ui-labels.ts",
  "src/modules/product/components/classification-breadcrumb-path.tsx",
  "src/modules/product/components/product-classification-timeline-panel.tsx",
  "src/modules/product/repositories/product-classification-repository.ts",
  "src/modules/product/repositories/product-classification-assignment-repository.ts",
  "src/modules/product/services/product-classification-rules.ts",
  "src/modules/product/services/product-classification-tree.ts",
  "src/modules/product/services/product-classification-service.ts",
  "src/modules/product/validators/product-classification-validators.ts",
  "src/modules/product/actions/product-classification-actions.ts",
  "src/modules/product/components/product-classification-dashboard.tsx",
  "src/modules/product/components/product-classification-tree.tsx",
  "src/modules/product/components/product-classification-workspace.tsx",
  "src/modules/product/components/product-classification-panel.tsx",
  "src/app/(authenticated)/(app)/products/classifications/page.tsx",
  "src/app/(authenticated)/(app)/products/classifications/[classificationId]/page.tsx",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-002 file.",
  }));
}

function sampleView(
  id: string,
  parentId: string | null,
  name: string,
  industryCode: string | null = null
) {
  return {
    id,
    businessId: "biz",
    parentClassificationId: parentId,
    parentName: null,
    code: name.toUpperCase(),
    name,
    description: null,
    classificationTypeCode: PRODUCT_CLASSIFICATION_TYPE_CODES.CATEGORY,
    classificationTypeName: "Category",
    industryCode,
    industryName: industryCode,
    icon: null,
    displayOrder: 0,
    hierarchyLevel: parentId ? 1 : 0,
    status: PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE,
    statusLabel: "Active",
    ownerPartyId: null,
    ownerDisplayName: null,
    businessUnit: null,
    effectiveDate: "2026-01-01",
    effectiveTo: null,
    retirementDate: null,
    approvalStatus: "NOT_REQUIRED",
    approvalStatusLabel: "Not Required",
    reasonForChange: null,
    childCount: 0,
    assignedProductCount: 0,
    activeProductCount: 0,
    archivedProductCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

function checkRules(): SmokeResult[] {
  const rootId = "11111111-1111-4111-8111-111111111111";
  const childId = "22222222-2222-4222-8222-222222222222";
  const views = [
    sampleView(rootId, null, "Electronics"),
    sampleView(childId, rootId, "Computers"),
  ];
  const tree = buildProductClassificationTree(views);
  const byId = new Map(views.map((v) => [v.id, v]));
  const breadcrumb = buildClassificationBreadcrumbPath(childId, byId);
  const parentById = new Map<string, string | null>([
    [rootId, null],
    [childId, rootId],
  ]);

  const healthcareOnly = filterClassificationsForIndustry(
    [
      sampleView("a", null, "Loans", "FINANCIAL"),
      sampleView("b", null, "Universal", null),
    ],
    "FINANCIAL"
  );

  return [
    {
      name: "ui:catalogue structure label",
      ok:
        buildCatalogueStructureUiLabels(resolveBusinessTerminology(null))
          .moduleName === "Catalogue Structure",
    },
    {
      name: "ui:product tab renamed",
      ok: PRODUCT_WORKSPACE_TABS.some(
        (tab) => tab.id === "classification" && tab.label === "Catalogue Structure"
      ),
    },
    {
      name: "lifecycle:default draft",
      ok: resolveDefaultClassificationStatus() === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT,
    },
    {
      name: "lifecycle:draft to active",
      ok: canTransitionClassificationStatus(
        PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT,
        PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE
      ),
    },
    {
      name: "type:catalogue has 10 types",
      ok: Object.keys(PRODUCT_CLASSIFICATION_TYPE_CODES).length === 10,
    },
    {
      name: "industry:filter keeps universal nodes",
      ok: healthcareOnly.length === 2,
    },
    {
      name: "industry:visibility match",
      ok: isClassificationVisibleForIndustry("FINANCIAL", "FINANCIAL"),
    },
    {
      name: "breadcrumb:child path depth",
      ok: breadcrumb.length === 2 && breadcrumb[1]?.id === childId,
    },
    {
      name: "timeline:classification created event",
      ok:
        CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_CREATED ===
        "CLASSIFICATION_CREATED",
    },
    {
      name: "extension:bulk operations reserved",
      ok: Object.keys(CATALOGUE_STRUCTURE_BULK_OPERATIONS).length === 5,
    },
    {
      name: "extension:relationship types reserved",
      ok: Object.keys(CATALOGUE_STRUCTURE_RELATIONSHIP_TYPES).length === 6,
    },
    {
      name: "rule:code normalized uppercase",
      ok: normalizeClassificationCode(" elec-01 ") === "ELEC-01",
    },
    {
      name: "rule:circular hierarchy detected",
      ok: wouldCreateCircularHierarchy(rootId, childId, parentById),
    },
    {
      name: "rule:active required for assignment",
      ok: canAssignToClassification(PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE),
    },
    {
      name: "rule:tree nests child under parent",
      ok: tree.length === 1 && tree[0]?.children.length === 1,
    },
    {
      name: "rule:max depth computed",
      ok: computeMaxTreeDepth(tree) === 2,
    },
    {
      name: "validator:create with type",
      ok: createProductClassificationSchema.safeParse({
        code: "RETAIL-01",
        name: "Retail Category",
        classificationTypeCode: "CATEGORY",
      }).success,
    },
    {
      name: "factory:createProductClassificationService",
      ok: Boolean(createProductClassificationService()),
    },
  ];
}

function printResults(results: SmokeResult[]) {
  let failed = 0;
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
    if (!result.ok) failed += 1;
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed.`);
  if (failed > 0) process.exitCode = 1;
}

async function main() {
  printResults([...checkRequiredFiles(), ...checkRules()]);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
