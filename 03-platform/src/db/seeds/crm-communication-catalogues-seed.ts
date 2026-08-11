/**
 * Idempotent seed runner for CRM Communication catalogues — BP-004 / IP-08
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { crmCommunicationChannel } from "@/db/schema/crm-communication-channel";
import { crmCommunicationChannels } from "@/db/seeds/crm-communication-catalogues";

export async function seedCrmCommunicationCatalogues(
  db: PostgresJsDatabase<typeof schema>
) {
  for (const row of crmCommunicationChannels) {
    const [existing] = await db
      .select({ id: crmCommunicationChannel.id })
      .from(crmCommunicationChannel)
      .where(eq(crmCommunicationChannel.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmCommunicationChannel).values({
        code: row.code,
        name: row.name,
        requiresConsentOutbound: row.requiresConsentOutbound,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmCommunicationChannel)
      .set({
        name: row.name,
        requiresConsentOutbound: row.requiresConsentOutbound,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmCommunicationChannel.id, existing.id));
  }
}
