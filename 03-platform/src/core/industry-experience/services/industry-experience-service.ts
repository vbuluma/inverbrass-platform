/**
 * Purpose:
 * Resolve Industry Experience presentation context for the current business.
 *
 * Architecture:
 * ENG-003k — Dynamic Business Terminology Engine (static profiles until
 * Industry Experience Profiles ship from metadata).
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { eq } from "drizzle-orm";

import {
  resolveBusinessTerminology,
  type BusinessTerminology,
} from "@/core/industry-experience/business-terminology";
import { filterProductTypesForIndustry } from "@/core/industry-experience/product-type-filters";
import { resolveOfferingNavLabel } from "@/core/industry-experience/offering-terminology";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessType } from "@/db/schema/business-type";
import { industry } from "@/db/schema/industry";

export type BusinessIndustryContext = {
  industryCode: string | null;
  industryName: string | null;
  /** Stable nav label — always "Offerings". */
  offeringCatalogueNavLabel: string;
  /** Workspace-aware page title. */
  offeringCataloguePageTitle: string;
  /** Industry workspace label for master records. */
  offeringWorkspaceLabel: string;
  terminology: BusinessTerminology;
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
    const terminology = resolveBusinessTerminology(industryCode);

    return {
      industryCode,
      industryName: row?.industryName ?? null,
      offeringCatalogueNavLabel: resolveOfferingNavLabel(),
      offeringCataloguePageTitle: terminology.offerings.catalogueTitle,
      offeringWorkspaceLabel: terminology.offerings.plural,
      terminology,
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

export { resolveBusinessTerminology, type BusinessTerminology };
