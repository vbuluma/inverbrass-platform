/**
 * Purpose:
 * Repository for business_configuration persistence via Drizzle.
 *
 * WHY:
 * Isolates database access from BusinessSetupService so services own rules
 * while repositories own queries (Server Actions → Services → Repository).
 *
 * RATIONALE:
 * A thin repository avoids leaking JSON merge details into every caller and
 * keeps future storage swaps localized.
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 */

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  businessConfiguration,
  type BusinessConfigurationSettingsJson,
} from "@/db/schema/business-configuration";

export class BusinessConfigurationRepository {
  /**
   * WHAT: Load configuration settings for a business.
   * WHY: Service merges patches against the current document.
   */
  async findSettingsByBusinessId(
    businessId: string
  ): Promise<BusinessConfigurationSettingsJson | null> {
    const db = getDb();
    const [row] = await db
      .select({ settings: businessConfiguration.settings })
      .from(businessConfiguration)
      .where(eq(businessConfiguration.businessId, businessId))
      .limit(1);

    return row?.settings ?? null;
  }

  /**
   * WHAT: Insert or update the settings document for a business.
   * WHY: Wizard steps persist configuration without column-level coupling.
   */
  async upsertSettings(
    businessId: string,
    settings: BusinessConfigurationSettingsJson
  ): Promise<void> {
    const db = getDb();
    const [existing] = await db
      .select({ id: businessConfiguration.id })
      .from(businessConfiguration)
      .where(eq(businessConfiguration.businessId, businessId))
      .limit(1);

    if (existing) {
      await db
        .update(businessConfiguration)
        .set({ settings, updatedAt: new Date() })
        .where(eq(businessConfiguration.id, existing.id));
      return;
    }

    await db.insert(businessConfiguration).values({
      businessId,
      settings,
    });
  }
}

export function createBusinessConfigurationRepository(): BusinessConfigurationRepository {
  return new BusinessConfigurationRepository();
}
