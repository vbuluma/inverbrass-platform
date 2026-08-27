import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmVisit } from "./crm-visit";

export const crmVisitEntityLink = pgTable("crm_visit_entity_link", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  visitId: uuid("visit_id")
    .references(() => crmVisit.id)
    .notNull(),
  entityTypeCode: varchar("entity_type_code", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});
