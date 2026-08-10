import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmVisit } from "./crm-visit";

export const crmVisitParticipant = pgTable("crm_visit_participant", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  visitId: uuid("visit_id")
    .references(() => crmVisit.id)
    .notNull(),
  userId: uuid("user_id").notNull(),
  isPrimaryAuthor: boolean("is_primary_author").default(false).notNull(),
  contributionNotes: varchar("contribution_notes", { length: 4000 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});
