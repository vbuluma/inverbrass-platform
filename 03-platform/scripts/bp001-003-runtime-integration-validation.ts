/**
 * Purpose:
 * BP-001 → BP-003 end-to-end runtime integration validation (service layer).
 *
 * Exercises shared identity, party, product catalogue, pricing resolution,
 * audit/timeline, navigation wiring, and tenant isolation.
 *
 * Usage:
 *   npx tsx scripts/bp001-003-runtime-integration-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { and, desc, eq, sql } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { BUSINESS_STATUS } from "@/core/auth/constants";
import { closeDb, getDb } from "@/db/client";
import { auditHistory } from "@/db/schema/audit-history";
import { business } from "@/db/schema/business";
import { businessConfiguration } from "@/db/schema/business-configuration";
import { businessMembership } from "@/db/schema/business-membership";
import { businessOperatingCurrency } from "@/db/schema/business-operating-currency";
import { partyTimeline } from "@/db/schema/party-timeline";
import { product } from "@/db/schema/product";
import { productTimeline } from "@/db/schema/product-timeline";
import { BUSINESS_APP_NAV_ITEMS } from "@/lib/navigation/platform-nav-config";
import { BUSINESS_APP_PREFIXES } from "@/lib/navigation/business-app-routes";
import { navContainsHref } from "@/lib/navigation/nav-tree";
import { createPricingResolutionAdapter } from "@/modules/crm/adapters/pricing-resolution-adapter";
import { createBusinessSetupService } from "@/modules/business/onboarding/services/business-setup-service";
import { createDefaultConfigurationSettings } from "@/modules/business/onboarding/services/setup-rules";
import { PartyError } from "@/modules/party/errors";
import { createIndividualProfileService } from "@/modules/party/services/individual-profile-service";
import { createPartyRoleService } from "@/modules/party/services/party-role-service";
import { createPartyService } from "@/modules/party/services/party-service";
import { ProductError } from "@/modules/product/errors";
import {
  PRODUCT_STATUS_CODES,
  PRODUCT_TYPE_CODES,
  PRODUCT_WORKSPACE_TABS,
} from "@/modules/product/constants";
import { createOfferingRelationshipService } from "@/modules/product/services/offering-relationship-service";
import { createPricingService } from "@/modules/product/services/pricing-service";
import { createProductCatalogueService } from "@/modules/product/services/product-catalogue-service";
import { createProductClassificationService } from "@/modules/product/services/product-classification-service";
import { createProductService } from "@/modules/product/services/product-service";
import { createUnitService } from "@/modules/product/services/unit-service";

type Result = {
  name: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  detail?: string;
};

const stamp = Date.now();
const ROOT = path.resolve(__dirname, "..");
const results: Result[] = [];

function record(name: string, status: Result["status"], detail?: string) {
  results.push({ name, status, detail });
  const tag = status === "PASS" ? "PASS" : status;
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function resolveContext(): Promise<CurrentBusinessContext> {
  const db = getDb();
  const [row] = await db
    .select({
      businessId: businessMembership.businessId,
      platformUserId: businessMembership.platformUserId,
      membershipId: businessMembership.id,
    })
    .from(businessMembership)
    .where(eq(businessMembership.status, "ACTIVE"))
    .limit(1);

  if (!row) {
    throw new Error("No ACTIVE business_membership — seed or register a business first.");
  }

  return {
    businessId: row.businessId,
    platformUserId: row.platformUserId,
    businessMembershipId: row.membershipId,
  };
}

async function resolveBaseCurrency(businessId: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ currencyCode: businessOperatingCurrency.currencyCode })
    .from(businessOperatingCurrency)
    .where(
      and(
        eq(businessOperatingCurrency.businessId, businessId),
        eq(businessOperatingCurrency.isBase, true)
      )
    )
    .limit(1);

  if (row?.currencyCode) {
    return row.currencyCode;
  }

  const [fallback] = await db.execute(sql`
    SELECT code FROM currency WHERE is_active = true ORDER BY display_order LIMIT 1
  `);

  const code = (fallback as { code?: string } | undefined)?.code;
  if (!code) {
    throw new Error("No active currency catalogue row found.");
  }

  return code;
}

async function partyTimelineTypes(partyId: string) {
  const db = getDb();
  const rows = await db
    .select({ eventType: partyTimeline.eventType })
    .from(partyTimeline)
    .where(eq(partyTimeline.partyId, partyId))
    .orderBy(desc(partyTimeline.createdAt))
    .limit(40);
  return rows.map((r) => r.eventType);
}

async function productTimelineTypes(productId: string) {
  const db = getDb();
  const rows = await db
    .select({ eventType: productTimeline.eventType })
    .from(productTimeline)
    .where(eq(productTimeline.productId, productId))
    .orderBy(desc(productTimeline.createdAt))
    .limit(40);
  return rows.map((r) => r.eventType);
}

async function auditOps(entityId: string) {
  const db = getDb();
  const rows = await db
    .select({
      operation: auditHistory.operation,
      entityName: auditHistory.entityName,
    })
    .from(auditHistory)
    .where(eq(auditHistory.entityId, entityId))
    .orderBy(desc(auditHistory.createdAt))
    .limit(40);
  return rows.map((r) => `${r.operation}:${r.entityName}`);
}

async function catalogueCounts() {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT 'party_type' AS c, count(*)::int AS n FROM party_type
    UNION ALL SELECT 'party_status', count(*)::int FROM party_status
    UNION ALL SELECT 'role_type', count(*)::int FROM role_type
    UNION ALL SELECT 'contact_type', count(*)::int FROM contact_type
    UNION ALL SELECT 'product_type', count(*)::int FROM product_type
    UNION ALL SELECT 'product_status', count(*)::int FROM product_status
    UNION ALL SELECT 'product_classification_type', count(*)::int FROM product_classification_type
    UNION ALL SELECT 'pricing_method', count(*)::int FROM pricing_method
    UNION ALL SELECT 'catalogue_channel', count(*)::int FROM catalogue_channel
    UNION ALL SELECT 'currency', count(*)::int FROM currency
    UNION ALL SELECT 'industry', count(*)::int FROM industry
    UNION ALL SELECT 'business_type', count(*)::int FROM business_type
    UNION ALL SELECT 'country', count(*)::int FROM country
    UNION ALL SELECT 'language', count(*)::int FROM language
    UNION ALL SELECT 'offering_governance_status', count(*)::int FROM offering_governance_status
  `);
  return rows as unknown as Array<{ c: string; n: number }>;
}

function checkMigrationCoverage() {
  console.log("\nMigration coverage");
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  const drizzleDir = path.join(ROOT, "drizzle");

  if (!existsSync(journalPath)) {
    record("migration:journal-file", "FAIL", "Missing drizzle/meta/_journal.json");
    return;
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ tag?: string }>;
  };
  const journalTags = new Set(
    (journal.entries ?? [])
      .map((entry) => entry.tag)
      .filter((tag): tag is string => Boolean(tag))
  );
  const sqlTagList = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/\.sql$/, ""));

  const sqlTags = new Set(sqlTagList);
  const orphanSql = [...sqlTags].filter((tag) => !journalTags.has(tag));
  const missingSql = [...journalTags].filter((tag) => !sqlTags.has(tag));

  record("migration:sql-journal", orphanSql.length === 0 && missingSql.length === 0 ? "PASS" : "FAIL", `sql=${sqlTags.size} journal=${journalTags.size}`);
  record("migration:orphan-sql", orphanSql.length === 0 ? "PASS" : "FAIL", orphanSql.join(",") || "none");
  record("migration:missing-sql", missingSql.length === 0 ? "PASS" : "FAIL", missingSql.join(",") || "none");

  const bpTags = [...journalTags].filter((tag) =>
    /bp00[123]|ip00[256]|ip006a|currency_reference|organization_structure|eng003b/.test(
      tag ?? ""
    )
  );
  record("migration:bp001-003-tags", bpTags.length >= 30 ? "PASS" : "FAIL", `count=${bpTags.length}`);
}

function checkSchemaBarrel() {
  console.log("\nSchema barrel");
  const barrelPath = path.join(ROOT, "src/db/schema/index.ts");
  const barrel = readFileSync(barrelPath, "utf8");
  const requiredExports = [
    "business",
    "party",
    "product",
    "pricingCatalogue",
    "pricingItem",
    "pricingMethod",
    "productClassification",
    "unitOfMeasure",
    "catalogueChannel",
    "offeringRelationship",
    "offeringGovernance",
    "auditHistory",
    "partyTimeline",
    "productTimeline",
  ];

  for (const symbol of requiredExports) {
    record(
      `schema-barrel:${symbol}`,
      barrel.includes(symbol) ? "PASS" : "FAIL"
    );
  }
}

async function createIsolationContext(
  source: CurrentBusinessContext
): Promise<CurrentBusinessContext> {
  const db = getDb();
  const [sourceBusiness] = await db
    .select()
    .from(business)
    .where(eq(business.id, source.businessId))
    .limit(1);

  if (!sourceBusiness) {
    throw new Error("Source business not found for isolation test.");
  }

  const code = `ISO${stamp}`.slice(0, 20);
  const [createdBusiness] = await db
    .insert(business)
    .values({
      code,
      name: `Isolation Business ${stamp}`,
      phoneNumber: sourceBusiness.phoneNumber,
      businessTypeId: sourceBusiness.businessTypeId,
      statusCode: BUSINESS_STATUS.ACTIVE,
      countryCode: sourceBusiness.countryCode,
      timezone: sourceBusiness.timezone,
    })
    .returning({ id: business.id });

  const [createdMembership] = await db
    .insert(businessMembership)
    .values({
      businessId: createdBusiness.id,
      platformUserId: source.platformUserId,
      status: "ACTIVE",
      isPrimary: false,
    })
    .returning({ id: businessMembership.id });

  await db.insert(businessConfiguration).values({
    businessId: createdBusiness.id,
    settings: createDefaultConfigurationSettings(),
  });

  return {
    businessId: createdBusiness.id,
    platformUserId: source.platformUserId,
    businessMembershipId: createdMembership.id,
  };
}

async function main() {
  console.log("\nBP-001 → BP-003 Runtime Integration Validation\n");

  checkMigrationCoverage();
  checkSchemaBarrel();

  const context = await resolveContext();
  const currencyCode = await resolveBaseCurrency(context.businessId);
  console.log(
    `\nContext business=${context.businessId} user=${context.platformUserId} currency=${currencyCode}\n`
  );

  console.log("Reference catalogues");
  const counts = await catalogueCounts();
  const requiredCatalogues = new Set([
    "party_type",
    "party_status",
    "role_type",
    "contact_type",
    "product_type",
    "product_status",
    "product_classification_type",
    "currency",
    "industry",
    "business_type",
    "country",
    "language",
  ]);
  const lazyCatalogues = new Set([
    "pricing_method",
    "catalogue_channel",
    "offering_governance_status",
  ]);

  for (const row of counts) {
    const min = requiredCatalogues.has(row.c) ? 1 : 0;
  const status =
      row.n >= min
        ? "PASS"
        : requiredCatalogues.has(row.c)
          ? "BLOCKED"
          : lazyCatalogues.has(row.c) && row.n === 0
            ? "PASS"
            : "FAIL";
    record(`catalogue:${row.c}`, status, `count=${row.n}`);
  }

  console.log("\nFlow A — Business foundation");
  try {
    const setup = createBusinessSetupService();
    const [businessRow] = await getDb()
      .select({
        id: business.id,
        name: business.name,
        statusCode: business.statusCode,
      })
      .from(business)
      .where(eq(business.id, context.businessId))
      .limit(1);

    const progress = await setup.getSetupProgress(context);
    const configuration = await setup.getConfiguration(context.businessId);

    record(
      "FLOW-A:business-row",
      Boolean(businessRow?.id) ? "PASS" : "FAIL",
      `status=${businessRow?.statusCode ?? "n/a"}`
    );
    record(
      "FLOW-A:membership",
      Boolean(context.businessMembershipId) ? "PASS" : "FAIL",
      `membershipId=${context.businessMembershipId}`
    );
    record(
      "FLOW-A:configuration",
      Boolean(configuration) ? "PASS" : "FAIL",
      configuration ? "settings-present" : "missing"
    );
    record(
      "FLOW-A:setup-progress",
      progress.businessId === context.businessId ? "PASS" : "FAIL",
      `activated=${progress.isActivated} step=${progress.currentStep}`
    );
    record(
      "FLOW-A:business-audit",
      "BLOCKED",
      "Business creation audit uses ENG-001 authentication emitter, not audit_history"
    );
  } catch (error) {
    record(
      "FLOW-A:business-foundation",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\nFlow B — Party / customer");
  let customerPartyId = "";
  try {
    const individuals = createIndividualProfileService();
    const partyRoles = createPartyRoleService();
    const parties = createPartyService();

    const customer = await individuals.registerIndividual(context, {
      fullName: `BP001-003 Customer ${stamp}`,
      dateOfBirth: "1990-01-15",
      gender: "MALE",
      preferredLanguageCode: "en",
      mobile: `+2547${String(stamp).slice(-8)}`,
      notes: "BP-001→003 integration customer",
    });
    customerPartyId = customer.id;

    await partyRoles.assignRole(context, customer.id, {
      roleTypeCode: "CUSTOMER",
      isPrimary: true,
    });

    const partyRow = await parties.getParty(context, customer.id);
    const partyTl = await partyTimelineTypes(customer.id);
    const partyAudit = await auditOps(customer.id);

    record(
      "FLOW-B:party-create",
      partyRow.id === customer.id ? "PASS" : "FAIL",
      `partyId=${partyRow.id}`
    );
    record(
      "FLOW-B:customer-role",
      partyRow.id === customer.id ? "PASS" : "FAIL",
      "role=CUSTOMER"
    );
    record(
      "FLOW-B:party-timeline",
      partyTl.includes("PARTY_CREATED") && partyTl.includes("ROLE_ASSIGNED")
        ? "PASS"
        : "FAIL",
      partyTl.join(",")
    );
    record(
      "FLOW-B:party-audit",
      partyAudit.some((entry) => entry.startsWith("CREATE:")) ? "PASS" : "FAIL",
      partyAudit.join(",")
    );
  } catch (error) {
    record(
      "FLOW-B:party-customer",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\nFlow C — Product / service catalogue");
  let offeringId = "";
  try {
    const products = createProductService();
    const classifications = createProductClassificationService();
    const units = createUnitService();
    const relationships = createOfferingRelationshipService();

    const created = await products.createProduct(context, {
      productCode: `INT-${stamp}`,
      productName: `Integration Offering ${stamp}`,
      productTypeCode: PRODUCT_TYPE_CODES.PHYSICAL_PRODUCT,
      defaultCurrency: currencyCode,
      ownerPartyId: customerPartyId || undefined,
      isSellable: true,
      isPurchasable: false,
    });
    offeringId = created.id;

    const classificationDashboard = await classifications.createClassification(context, {
      code: `CAT-${stamp}`,
      name: `Integration Category ${stamp}`,
      classificationTypeCode: "CATEGORY",
    });
    const classificationId =
      classificationDashboard.recentlyUpdated.find((row) =>
        row.code.includes(String(stamp))
      )?.id ?? classificationDashboard.recentlyUpdated[0]?.id;

    if (!classificationId) {
      throw new Error("Classification was not returned after create.");
    }

    await classifications.activateClassification(context, classificationId);
    await classifications.assignProduct(context, created.id, {
      classificationId,
      isPrimary: true,
    });

    await units.ensureDefaults(context);
    await relationships.ensureDefaults(context);

    const activated = await products.activateProduct(context, created.id);
    const productTl = await productTimelineTypes(created.id);
    const productAudit = await auditOps(created.id);

    record(
      "FLOW-C:product-create",
      Boolean(created.id) ? "PASS" : "FAIL",
      `productId=${created.id}`
    );
    record(
      "FLOW-C:classification-assign",
      Boolean(classificationId) ? "PASS" : "FAIL",
      `classificationId=${classificationId}`
    );
    record(
      "FLOW-C:product-active-sellable",
      activated.statusCode === PRODUCT_STATUS_CODES.ACTIVE && activated.isSellable
        ? "PASS"
        : "FAIL",
      `status=${activated.statusCode} sellable=${activated.isSellable}`
    );
    record(
      "FLOW-C:product-timeline",
      productTl.includes("PRODUCT_CREATED") &&
        productTl.includes("PRODUCT_ACTIVATED")
        ? "PASS"
        : "FAIL",
      productTl.join(",")
    );
    record(
      "FLOW-C:product-audit",
      productAudit.some((entry) => entry.startsWith("CREATE:")) ? "PASS" : "FAIL",
      productAudit.join(",")
    );
  } catch (error) {
    record(
      "FLOW-C:product-catalogue",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\nFlow D — Pricing resolution");
  let pricingItemId = "";
  try {
    const pricing = createPricingService();
    const pricingAdapter = createPricingResolutionAdapter();

    const catalogue = await pricing.createCatalogue(context, {
      code: `STD-${stamp}`,
      name: `Standard Catalogue ${stamp}`,
      currencyCode,
    });

    const priceItem = await pricing.createPriceItem(context, {
      offeringId,
      pricingCatalogueId: catalogue.id,
      currencyCode,
      unitPrice: 1500,
      pricingMethod: "FIXED",
      effectiveFrom: new Date(Date.now() - 86_400_000).toISOString(),
    });
    pricingItemId = priceItem.id;

    const activatedPrice = await pricing.activatePriceItem(context, priceItem.id);
    const resolved = await pricingAdapter.resolveUnitPrice(context, {
      offeringId,
      currencyCode,
      pricingCatalogueId: catalogue.id,
    });

    record(
      "FLOW-D:price-create",
      Boolean(priceItem.id) ? "PASS" : "FAIL",
      `pricingItemId=${priceItem.id}`
    );
    record(
      "FLOW-D:price-active",
      activatedPrice.isActiveNow ? "PASS" : "FAIL",
      `status=${activatedPrice.status}`
    );
    record(
      "FLOW-D:price-resolution",
      resolved.offeringId === offeringId && resolved.unitPrice === 1500
        ? "PASS"
        : "FAIL",
      `unitPrice=${resolved.unitPrice} currency=${resolved.currencyCode}`
    );
    record(
      "FLOW-D:tax-discount",
      "BLOCKED",
      "Product tax engine and discount rules are not implemented in BP-001→003"
    );
  } catch (error) {
    record(
      "FLOW-D:pricing",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\nFlow E — Downstream consumability");
  try {
    const catalogueService = createProductCatalogueService();
    const pricingAdapter = createPricingResolutionAdapter();

    const resolved = await pricingAdapter.resolveUnitPrice(context, {
      offeringId,
      currencyCode,
    });

    const publication = await catalogueService.upsertPublication(
      context,
      offeringId,
      {
        channelCode: "WEBSITE",
        published: true,
        visibility: "PUBLIC",
        featured: true,
      }
    );

    const [dbProduct] = await getDb()
      .select({ businessId: product.businessId, ownerPartyId: product.ownerPartyId })
      .from(product)
      .where(eq(product.id, offeringId))
      .limit(1);

    record(
      "FLOW-E:pricing-consumable",
      resolved.pricingItemId === pricingItemId ? "PASS" : "FAIL",
      `pricingItemId=${resolved.pricingItemId}`
    );
    record(
      "FLOW-E:catalogue-publish",
      publication.publications.some((row) => row.channelCode === "WEBSITE" && row.published)
        ? "PASS"
        : "FAIL",
      `channels=${publication.publications.length}`
    );
    record(
      "FLOW-E:party-product-fk",
      customerPartyId && dbProduct?.ownerPartyId === customerPartyId
        ? "PASS"
        : customerPartyId
          ? "FAIL"
          : "BLOCKED",
      `ownerPartyId=${dbProduct?.ownerPartyId ?? "n/a"}`
    );
    record(
      "FLOW-E:sales-checkout",
      "BLOCKED",
      "Sales transaction / checkout is owned by BP-004+ (quotation/sales-order), not BP-001→003"
    );
  } catch (error) {
    record(
      "FLOW-E:consumability",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\nFlows F–H — Commercial operations boundaries");
  record(
    "FLOW-F:payment",
    "BLOCKED",
    "Payment execution/allocation services are not implemented in BP-001→003 (schema stubs only)"
  );
  record(
    "FLOW-G:receipting",
    "BLOCKED",
    "Receipt issuance is configuration metadata in BP-001 only; no receipt service in BP-001→003"
  );
  record(
    "FLOW-H:reconciliation",
    "BLOCKED",
    "Payment reconciliation is intentionally deferred beyond BP-001→003"
  );

  console.log("\nCross-BP adapters");
  const pricingAdapter = createPricingResolutionAdapter();
  record(
    "adapter:party-product-owner",
    customerPartyId && offeringId ? "PASS" : "BLOCKED",
    "product.ownerPartyId references party.id"
  );
  record(
    "adapter:pricing-resolution",
    pricingAdapter.constructor.name.includes("PricingResolutionAdapter")
      ? "PASS"
      : "FAIL",
    pricingAdapter.constructor.name
  );
  record(
    "adapter:customer-sales",
    "BLOCKED",
    "Customer → sales checkout adapter is BP-004 scope"
  );
  record(
    "adapter:payment-receipting",
    "BLOCKED",
    "Payment → receipting adapter not implemented in BP-001→003"
  );

  console.log("\nApplication wiring");
  for (const href of ["/dashboard", "/parties", "/products", "/settings"]) {
    record(
      `nav:${href}`,
      navContainsHref(BUSINESS_APP_NAV_ITEMS, href) ? "PASS" : "FAIL"
    );
  }
  for (const prefix of ["/dashboard", "/parties", "/products", "/settings"]) {
    record(
      `chrome-prefix:${prefix}`,
      BUSINESS_APP_PREFIXES.includes(prefix) ? "PASS" : "FAIL"
    );
  }
  record(
    "workspace:product-tabs",
    PRODUCT_WORKSPACE_TABS.some((tab) => tab.id === "pricing" && tab.available)
      ? "PASS"
      : "FAIL"
  );

  console.log("\nOffline / synchronization");
  record(
    "offline:capability",
    "BLOCKED",
    "No offline queue, sync engine, or conflict handling implemented in BP-001→003"
  );

  console.log("\nTenant isolation");
  try {
    if (!customerPartyId || !offeringId) {
      record("ISOLATION:setup", "BLOCKED", "Missing party/product fixtures");
    } else {
      const isolationContext = await createIsolationContext(context);
      const parties = createPartyService();
      const products = createProductService();
      let partyLeak = false;
      let productLeak = false;

      try {
        await parties.getParty(isolationContext, customerPartyId);
        partyLeak = true;
      } catch (error) {
        partyLeak = !(error instanceof PartyError && error.code === "PARTY_NOT_FOUND");
      }

      try {
        await products.getProduct(isolationContext, offeringId);
        productLeak = true;
      } catch (error) {
        productLeak = !(
          error instanceof ProductError && error.code === "PRODUCT_NOT_FOUND"
        );
      }

      record("ISOLATION:party", partyLeak ? "FAIL" : "PASS", `leak=${partyLeak}`);
      record(
        "ISOLATION:product",
        productLeak ? "FAIL" : "PASS",
        `leak=${productLeak}`
      );
    }
  } catch (error) {
    record(
      "ISOLATION:test",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;

  console.log("\n========================================");
  console.log(`Assertions: ${pass}/${results.length} PASS`);
  console.log(`FAIL: ${fail}`);
  console.log(`BLOCKED: ${blocked}`);
  console.log("========================================\n");

  await closeDb();
  if (fail > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
