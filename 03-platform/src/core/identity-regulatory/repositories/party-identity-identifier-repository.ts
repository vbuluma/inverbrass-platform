/**
 * Purpose:
 * Persistence for party identity identifier rows (persistence only).
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

import { and, asc, eq, isNull, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyIdentityIdentifier } from "@/db/schema/party-identity-identifier";
import type {
  IdentifierStatusCode,
  IdentifierVerificationStatus,
} from "@/core/identity-regulatory/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyIdentityIdentifierInsertValues = {
  businessId: string;
  partyId: string;
  identifierTypeCode: string;
  identifierValue: string;
  issuingCountryCode?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  statusCode: IdentifierStatusCode;
  verificationStatus: IdentifierVerificationStatus;
  verificationMethod?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  primaryIdentifier?: boolean;
  linkedDocumentId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyIdentityIdentifierUpdateValues = {
  identifierValue?: string;
  issuingCountryCode?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  statusCode?: IdentifierStatusCode;
  verificationStatus?: IdentifierVerificationStatus;
  verificationMethod?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  primaryIdentifier?: boolean;
  linkedDocumentId?: string | null;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  version?: number;
};

export class PartyIdentityIdentifierRepository {
  async insert(
    values: PartyIdentityIdentifierInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyIdentityIdentifier)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        identifierTypeCode: values.identifierTypeCode,
        identifierValue: values.identifierValue,
        issuingCountryCode: values.issuingCountryCode ?? null,
        issuingAuthority: values.issuingAuthority ?? null,
        issueDate: values.issueDate ?? null,
        expiryDate: values.expiryDate ?? null,
        statusCode: values.statusCode,
        verificationStatus: values.verificationStatus,
        verificationMethod: values.verificationMethod ?? null,
        verifiedBy: values.verifiedBy ?? null,
        verifiedAt: values.verifiedAt ?? null,
        primaryIdentifier: values.primaryIdentifier ?? false,
        linkedDocumentId: values.linkedDocumentId ?? null,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    identifierId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyIdentityIdentifier)
      .where(
        and(
          eq(partyIdentityIdentifier.businessId, businessId),
          eq(partyIdentityIdentifier.id, identifierId),
          isNull(partyIdentityIdentifier.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(partyIdentityIdentifier)
      .where(
        and(
          eq(partyIdentityIdentifier.businessId, businessId),
          eq(partyIdentityIdentifier.partyId, partyId),
          isNull(partyIdentityIdentifier.deletedAt)
        )
      )
      .orderBy(
        asc(partyIdentityIdentifier.identifierTypeCode),
        asc(partyIdentityIdentifier.createdAt)
      );
  }

  async findByTypeAndValue(
    businessId: string,
    identifierTypeCode: string,
    identifierValue: string,
    excludeId?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(partyIdentityIdentifier.businessId, businessId),
      eq(partyIdentityIdentifier.identifierTypeCode, identifierTypeCode),
      eq(partyIdentityIdentifier.identifierValue, identifierValue.trim()),
      isNull(partyIdentityIdentifier.deletedAt),
    ];

    if (excludeId) {
      conditions.push(ne(partyIdentityIdentifier.id, excludeId));
    }

    const [row] = await dbClient
      .select({ id: partyIdentityIdentifier.id })
      .from(partyIdentityIdentifier)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    identifierId: string,
    expectedVersion: number,
    values: PartyIdentityIdentifierUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyIdentityIdentifier)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(partyIdentityIdentifier.businessId, businessId),
          eq(partyIdentityIdentifier.id, identifierId),
          eq(partyIdentityIdentifier.version, expectedVersion),
          isNull(partyIdentityIdentifier.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyIdentityIdentifierRepository(): PartyIdentityIdentifierRepository {
  return new PartyIdentityIdentifierRepository();
}