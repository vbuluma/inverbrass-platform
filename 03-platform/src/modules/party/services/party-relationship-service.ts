/**
 * Purpose:
 * Party Relationship Management — add, edit, deactivate, reactivate, remove.
 *
 * Architecture:
 * Server Actions → PartyRelationshipService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  PARTY_RELATIONSHIP_STATUS_CODES,
  type PartyRelationshipStatusCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRelationshipRepository } from "@/modules/party/repositories/party-relationship-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  canDeactivateRelationship,
  canReactivateRelationship,
  isPartyRelationshipStatusCode,
  isSelfRelationship,
  todayIsoDate,
} from "@/modules/party/services/party-relationship-rules";
import type {
  AddPartyRelationshipPayload,
  PartyRelationshipsPanelView,
  PartyRelationshipView,
  UpdatePartyRelationshipPayload,
} from "@/modules/party/types";
import {
  addPartyRelationshipSchema,
  updatePartyRelationshipSchema,
} from "@/modules/party/validators/party-relationship-validators";
import { nullableTrimmed } from "@/modules/party/validators/party-address-validators";

export class PartyRelationshipService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyRelationshipRepository = createPartyRelationshipRepository(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  async getPartyRelationships(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyRelationshipsPanelView> {
    await this.requireParty(context, partyId);

    const [rows, relationshipTypes] = await Promise.all([
      this.partyRelationshipRepository.listByPartyId(
        context.businessId,
        partyId
      ),
      this.referenceRepository.listActiveRelationshipTypes(),
    ]);

    if (relationshipTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Relationship Type catalogue is empty. Seed Party Relationship catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(
      relationshipTypes.map((t) => [t.code, t.name])
    );

    const partyIds = new Set<string>();
    for (const row of rows) {
      partyIds.add(row.fromPartyId);
      partyIds.add(row.toPartyId);
    }
    partyIds.delete(partyId);

    const relatedParties = await Promise.all(
      [...partyIds].map((id) =>
        this.partyRepository.findById(context.businessId, id)
      )
    );
    const partyById = new Map(
      relatedParties
        .filter((row) => row !== null)
        .map((row) => [row!.id, row!])
    );

    const relationships = rows.map((row) =>
      this.toView(row, partyId, typeNameByCode, partyById)
    );

    return {
      relationships,
      availableRelationshipTypes: relationshipTypes,
    };
  }

  async addRelationship(
    context: CurrentBusinessContext,
    fromPartyId: string,
    payload: AddPartyRelationshipPayload
  ): Promise<PartyRelationshipsPanelView> {
    const parsed = addPartyRelationshipSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, fromPartyId);

    if (isSelfRelationship(fromPartyId, parsed.data.toPartyId)) {
      throw new PartyError(
        "SELF_RELATIONSHIP_NOT_ALLOWED",
        PARTY_USER_MESSAGES.SELF_RELATIONSHIP_NOT_ALLOWED,
        400,
        "toPartyId"
      );
    }

    const toParty = await this.partyRepository.findById(
      context.businessId,
      parsed.data.toPartyId
    );
    if (!toParty) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        "Select an existing related party.",
        404,
        "toPartyId"
      );
    }

    const relationshipType =
      await this.referenceRepository.findRelationshipTypeByCode(
        parsed.data.relationshipTypeCode
      );
    if (!relationshipType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid relationship type.",
        400,
        "relationshipTypeCode"
      );
    }

    const duplicate =
      await this.partyRelationshipRepository.findActiveBetweenPartiesAndType(
        context.businessId,
        fromPartyId,
        parsed.data.toPartyId,
        parsed.data.relationshipTypeCode
      );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_ACTIVE_RELATIONSHIP",
        PARTY_USER_MESSAGES.DUPLICATE_ACTIVE_RELATIONSHIP,
        409,
        "relationshipTypeCode"
      );
    }

    const startDate = parsed.data.startDate?.trim() || todayIsoDate();
    const endDate = nullableTrimmed(parsed.data.endDate ?? null);

    await this.partyRelationshipRepository.insert({
      businessId: context.businessId,
      fromPartyId,
      toPartyId: parsed.data.toPartyId,
      relationshipTypeCode: parsed.data.relationshipTypeCode,
      startDate,
      endDate,
      statusCode: PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE,
      notes: nullableTrimmed(parsed.data.notes),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    return this.getPartyRelationships(context, fromPartyId);
  }

  async updateRelationship(
    context: CurrentBusinessContext,
    partyId: string,
    partyRelationshipId: string,
    payload: UpdatePartyRelationshipPayload
  ): Promise<PartyRelationshipsPanelView> {
    const parsed = updatePartyRelationshipSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);
    await this.requireRelationshipForParty(
      context,
      partyId,
      partyRelationshipId
    );

    await this.partyRelationshipRepository.updateById(
      context.businessId,
      partyRelationshipId,
      {
        ...(parsed.data.startDate !== undefined
          ? { startDate: parsed.data.startDate.trim() }
          : {}),
        ...(parsed.data.endDate !== undefined
          ? { endDate: nullableTrimmed(parsed.data.endDate) }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyRelationships(context, partyId);
  }

  async deactivateRelationship(
    context: CurrentBusinessContext,
    partyId: string,
    partyRelationshipId: string
  ): Promise<PartyRelationshipsPanelView> {
    await this.requireParty(context, partyId);
    const relationship = await this.requireRelationshipForParty(
      context,
      partyId,
      partyRelationshipId
    );

    if (
      !canDeactivateRelationship(
        relationship.statusCode as PartyRelationshipStatusCode
      )
    ) {
      throw new PartyError(
        "INVALID_RELATIONSHIP_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_RELATIONSHIP_TRANSITION,
        400
      );
    }

    await this.partyRelationshipRepository.updateById(
      context.businessId,
      partyRelationshipId,
      {
        statusCode: PARTY_RELATIONSHIP_STATUS_CODES.INACTIVE,
        endDate: relationship.endDate ?? todayIsoDate(),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyRelationships(context, partyId);
  }

  async reactivateRelationship(
    context: CurrentBusinessContext,
    partyId: string,
    partyRelationshipId: string
  ): Promise<PartyRelationshipsPanelView> {
    await this.requireParty(context, partyId);
    const relationship = await this.requireRelationshipForParty(
      context,
      partyId,
      partyRelationshipId
    );

    if (
      !canReactivateRelationship(
        relationship.statusCode as PartyRelationshipStatusCode
      )
    ) {
      throw new PartyError(
        "INVALID_RELATIONSHIP_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_RELATIONSHIP_TRANSITION,
        400
      );
    }

    const duplicate =
      await this.partyRelationshipRepository.findActiveBetweenPartiesAndType(
        context.businessId,
        relationship.fromPartyId,
        relationship.toPartyId,
        relationship.relationshipTypeCode
      );
    if (duplicate && duplicate.id !== partyRelationshipId) {
      throw new PartyError(
        "DUPLICATE_ACTIVE_RELATIONSHIP",
        PARTY_USER_MESSAGES.DUPLICATE_ACTIVE_RELATIONSHIP,
        409
      );
    }

    await this.partyRelationshipRepository.updateById(
      context.businessId,
      partyRelationshipId,
      {
        statusCode: PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE,
        endDate: null,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyRelationships(context, partyId);
  }

  async removeRelationship(
    context: CurrentBusinessContext,
    partyId: string,
    partyRelationshipId: string
  ): Promise<PartyRelationshipsPanelView> {
    await this.requireParty(context, partyId);
    await this.requireRelationshipForParty(
      context,
      partyId,
      partyRelationshipId
    );

    await this.partyRelationshipRepository.updateById(
      context.businessId,
      partyRelationshipId,
      {
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyRelationships(context, partyId);
  }

  private async requireParty(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    const party = await this.partyRepository.findById(
      context.businessId,
      partyId
    );
    if (!party) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }
    return party;
  }

  private async requireRelationshipForParty(
    context: CurrentBusinessContext,
    partyId: string,
    partyRelationshipId: string
  ) {
    const relationship = await this.partyRelationshipRepository.findById(
      context.businessId,
      partyRelationshipId
    );
    if (
      !relationship ||
      (relationship.fromPartyId !== partyId &&
        relationship.toPartyId !== partyId)
    ) {
      throw new PartyError(
        "PARTY_RELATIONSHIP_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_RELATIONSHIP_NOT_FOUND,
        404
      );
    }
    return relationship;
  }

  private toView(
    row: {
      id: string;
      fromPartyId: string;
      toPartyId: string;
      relationshipTypeCode: string;
      startDate: string;
      endDate: string | null;
      statusCode: string;
      notes: string | null;
    },
    currentPartyId: string,
    typeNameByCode: Map<string, string>,
    partyById: Map<
      string,
      { id: string; partyNumber: string; displayName: string }
    >
  ): PartyRelationshipView {
    const isOutgoing = row.fromPartyId === currentPartyId;
    const relatedPartyId = isOutgoing ? row.toPartyId : row.fromPartyId;
    const relatedParty = partyById.get(relatedPartyId);

    const statusCode = isPartyRelationshipStatusCode(row.statusCode)
      ? row.statusCode
      : PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE;

    return {
      id: row.id,
      fromPartyId: row.fromPartyId,
      toPartyId: row.toPartyId,
      relatedPartyId,
      relatedPartyNumber: relatedParty?.partyNumber ?? "—",
      relatedPartyName: relatedParty?.displayName ?? "Unknown party",
      relationshipTypeCode: row.relationshipTypeCode,
      relationshipTypeName:
        typeNameByCode.get(row.relationshipTypeCode) ??
        row.relationshipTypeCode,
      direction: isOutgoing ? "OUTGOING" : "INCOMING",
      startDate: row.startDate,
      endDate: row.endDate,
      statusCode,
      notes: row.notes,
    };
  }
}

export function createPartyRelationshipService(): PartyRelationshipService {
  return new PartyRelationshipService();
}
