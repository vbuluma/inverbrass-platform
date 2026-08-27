import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmVisit } from "./crm-visit";
import { party } from "./party";

export const crmVisitCustomerAttendee = pgTable("crm_visit_customer_attendee", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  visitId: uuid("visit_id")
    .references(() => crmVisit.id)
    .notNull(),
  partyId: uuid("party_id").references(() => party.id),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  positionTitle: varchar("position_title", { length: 150 }),
  email: varchar("email", { length: 200 }),
  mobile: varchar("mobile", { length: 50 }),
  organisation: varchar("organisation", { length: 200 }),
  wasPresent: boolean("was_present").default(true).notNull(),
  signatureRef: varchar("signature_ref", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});
