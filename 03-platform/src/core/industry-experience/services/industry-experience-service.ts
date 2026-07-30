/**
 * Purpose:
 * Resolve Industry Experience presentation context for the current business.
 *
 * Architecture:
 * ENG-003k (planned) — static profiles until Industry Experience Profiles ship.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { eq } from "drizzle-orm";

import { filterProductTypesForIndustry } from "@/core/industry-experience/product-type-filters";
import {
  resolveOfferingCatalogueNavLabel,
  resolveOfferingCataloguePageTitle,
} from "@/core/industry-experience/offering-terminology";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessType } from "@/db/schema/business-type";
import { industry } from "@/db/schema/industry";

export type BusinessIndustryContext = {
  industryCode: string | null;
  industryName: string | null;
  offeringCatalogueNavLabel: string;
  offeringCataloguePageTitle: string;
};

export type ProductTypeOption = {
  code: string;
  name: string;
  description?: string | null;
};

export class IndustryExperienceService {
  async getBusinessIndustryContext(
    businessId: string
  ): Promise<BusinessIndustryContext> {
    const db = getDb();
    const [row] = await db
      .select({
        industryCode: industry.code,
        industryName: industry.name,
      })
      .from(business)
      .innerJoin(businessType, eq(business.businessTypeId, businessType.id))
      .innerJoin(industry, eq(businessType.industryId, industry.id))
      .where(eq(business.id, businessId))
      .limit(1);

    const industryCode = row?.industryCode ?? null;

    return {
      industryCode,
      industryName: row?.industryName ?? null,
      offeringCatalogueNavLabel: resolveOfferingCatalogueNavLabel(industryCode),
      offeringCataloguePageTitle: resolveOfferingCataloguePageTitle(industryCode),
    };
  }

  filterProductTypesForBusiness<T extends ProductTypeOption>(
    businessId: string,
    productTypes: T[]
  ): Promise<T[]> {
    return this.getBusinessIndustryContext(businessId).then((ctx) =>
      filterProductTypesForIndustry(productTypes, ctx.industryCode)
    );
  }
}

export function createIndustryExperienceService(): IndustryExperienceService {
  return new IndustryExperienceService();
}
