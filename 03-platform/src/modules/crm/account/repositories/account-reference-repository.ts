/**
 * Purpose:
 * Account reference catalogue reads.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { accountStatus } from "@/db/schema/account-status";
import { accountType } from "@/db/schema/account-type";
import { crmContactRole } from "@/db/schema/crm-contact-role";

export class AccountReferenceRepository {
  async listActiveAccountTypes() {
    const db = getDb();
    return db
      .select({
        code: accountType.code,
        name: accountType.name,
        description: accountType.description,
      })
      .from(accountType)
      .where(eq(accountType.isActive, true))
      .orderBy(asc(accountType.displayOrder));
  }

  async listActiveAccountStatuses() {
    const db = getDb();
    return db
      .select({
        code: accountStatus.code,
        name: accountStatus.name,
        description: accountStatus.description,
      })
      .from(accountStatus)
      .where(eq(accountStatus.isActive, true))
      .orderBy(asc(accountStatus.displayOrder));
  }

  async listActiveContactRoles() {
    const db = getDb();
    return db
      .select({
        code: crmContactRole.code,
        name: crmContactRole.name,
        description: crmContactRole.description,
      })
      .from(crmContactRole)
      .where(eq(crmContactRole.isActive, true))
      .orderBy(asc(crmContactRole.displayOrder));
  }

  async getAccountTypeName(code: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ name: accountType.name })
      .from(accountType)
      .where(eq(accountType.code, code))
      .limit(1);
    return row?.name ?? code;
  }

  async getAccountStatusName(code: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ name: accountStatus.name })
      .from(accountStatus)
      .where(eq(accountStatus.code, code))
      .limit(1);
    return row?.name ?? code;
  }

  async getContactRoleName(code: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ name: crmContactRole.name })
      .from(crmContactRole)
      .where(eq(crmContactRole.code, code))
      .limit(1);
    return row?.name ?? code;
  }

  async isActiveAccountType(code: string): Promise<boolean> {
    const db = getDb();
    const [row] = await db
      .select({ id: accountType.id })
      .from(accountType)
      .where(and(eq(accountType.code, code), eq(accountType.isActive, true)))
      .limit(1);
    return Boolean(row);
  }

  async isActiveAccountStatus(code: string): Promise<boolean> {
    const db = getDb();
    const [row] = await db
      .select({ id: accountStatus.id })
      .from(accountStatus)
      .where(and(eq(accountStatus.code, code), eq(accountStatus.isActive, true)))
      .limit(1);
    return Boolean(row);
  }

  async isActiveContactRole(code: string): Promise<boolean> {
    const db = getDb();
    const [row] = await db
      .select({ id: crmContactRole.id })
      .from(crmContactRole)
      .where(and(eq(crmContactRole.code, code), eq(crmContactRole.isActive, true)))
      .limit(1);
    return Boolean(row);
  }
}

export function createAccountReferenceRepository(): AccountReferenceRepository {
  return new AccountReferenceRepository();
}
