/**
 * Purpose:
 * Read verification method catalogue (persistence only).
 *
 * Module:
 * Core Platform – Document & Compliance
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { verificationMethod } from "@/db/schema/verification-method";

type DbClient = PostgresJsDatabase<typeof schema>;

export class VerificationMethodRepository {
  async listActive(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: verificationMethod.code,
        name: verificationMethod.name,
      })
      .from(verificationMethod)
      .where(eq(verificationMethod.isActive, true))
      .orderBy(asc(verificationMethod.displayOrder), asc(verificationMethod.name));
  }
}

export function createVerificationMethodRepository(): VerificationMethodRepository {
  return new VerificationMethodRepository();
}
