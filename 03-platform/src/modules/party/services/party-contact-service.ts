/**
 * Purpose:
 * Party Contact Management — add, edit, prefer, verify, deactivate, remove.
 *
 * Architecture:
 * Server Actions → PartyContactService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { getDb } from "@/db/client";
import {
  CONTACT_TYPE_CODES,
  PARTY_CONTACT_STATUS_CODES,
  PARTY_TYPE_CODES,
  type PartyContactStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createPartyContactRepository } from "@/modules/party/repositories/party-contact-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  canBePreferred,
  canDeactivateContact,
  canReactivateContact,
  isPartyContactStatusCode,
  isWebsiteAllowedForPartyType,
} from "@/modules/party/services/party-contact-rules";
import {
  normalizePartyContactValue,
  requireBusinessPhoneContext,
} from "@/modules/party/services/party-phone";
import type {
  AddPartyContactPayload,
  PartyContactsPanelView,
  PartyContactView,
  UpdatePartyContactPayload,
} from "@/modules/party/types";
import {
  addPartyContactSchema,
  updatePartyContactSchema,
  validateContactValueForType,
} from "@/modules/party/validators/party-contact-validators";

export class PartyContactService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyContactRepository = createPartyContactRepository(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  async getPartyContacts(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyContactsPanelView> {
    const party = await this.requireParty(context, partyId);

    const [rows, contactTypes] = await Promise.all([
      this.partyContactRepository.listByPartyId(context.businessId, partyId),
      this.referenceRepository.listActiveContactTypes(),
    ]);

    if (contactTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Contact Type catalogue is empty. Seed Party Contact catalogues before continuing.",
        503
      );
    }

    const nameByCode = new Map(contactTypes.map((t) => [t.code, t.name]));
    const contacts = rows.map((row) => this.toView(row, nameByCode));

    const availableContactTypes = contactTypes.filter((type) => {
      if (
        type.code === CONTACT_TYPE_CODES.WEBSITE &&
        party.partyTypeCode === PARTY_TYPE_CODES.INDIVIDUAL
      ) {
        return false;
      }
      return true;
    });

    return { contacts, availableContactTypes };
  }

  async addContact(
    context: CurrentBusinessContext,
    partyId: string,
    payload: AddPartyContactPayload
  ): Promise<PartyContactsPanelView> {
    const parsed = addPartyContactSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const party = await this.requireParty(context, partyId);
    const contactType = await this.referenceRepository.findContactTypeByCode(
      parsed.data.contactTypeCode
    );
    if (!contactType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid contact type.",
        400,
        "contactTypeCode"
      );
    }

    if (
      !isWebsiteAllowedForPartyType(
        party.partyTypeCode as PartyTypeCode,
        parsed.data.contactTypeCode
      )
    ) {
      throw new PartyError(
        "WEBSITE_NOT_ALLOWED",
        PARTY_USER_MESSAGES.WEBSITE_NOT_ALLOWED,
        400,
        "contactTypeCode"
      );
    }

    const valueCheck = validateContactValueForType(
      parsed.data.contactTypeCode,
      parsed.data.contactValue
    );
    if (!valueCheck.ok) {
      throw new PartyError(
        "INVALID_INPUT",
        valueCheck.message,
        400,
        valueCheck.field
      );
    }

    const phoneContext = await requireBusinessPhoneContext(
      this.referenceRepository,
      context.businessId
    );
    const contactValue = normalizePartyContactValue(
      parsed.data.contactTypeCode,
      parsed.data.contactValue,
      phoneContext
    );

    const duplicate =
      await this.partyContactRepository.findByPartyAndContactValue(
        context.businessId,
        partyId,
        contactValue
      );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_CONTACT_VALUE",
        PARTY_USER_MESSAGES.DUPLICATE_CONTACT_VALUE,
        409,
        "contactValue"
      );
    }

    const makePreferred = parsed.data.isPreferred === true;
    if (
      !canBePreferred(PARTY_CONTACT_STATUS_CODES.ACTIVE, makePreferred)
    ) {
      throw new PartyError(
        "PREFERRED_CONTACT_INACTIVE",
        PARTY_USER_MESSAGES.PREFERRED_CONTACT_INACTIVE,
        400
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      if (makePreferred) {
        await this.partyContactRepository.clearPreferredForPartyAndType(
          context.businessId,
          partyId,
          parsed.data.contactTypeCode,
          tx
        );
      }

      await this.partyContactRepository.insert(
        {
          businessId: context.businessId,
          partyId,
          contactTypeCode: parsed.data.contactTypeCode,
          contactValue,
          isPreferred: makePreferred,
          isVerified: false,
          statusCode: PARTY_CONTACT_STATUS_CODES.ACTIVE,
          notes: parsed.data.notes?.trim() || null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );
    });

    return this.getPartyContacts(context, partyId);
  }

  async updateContact(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string,
    payload: UpdatePartyContactPayload
  ): Promise<PartyContactsPanelView> {
    const parsed = updatePartyContactSchema.safeParse(payload);
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
    const contact = await this.requireContact(context, partyId, partyContactId);

    let contactValue: string | undefined;
    if (parsed.data.contactValue !== undefined) {
      const valueCheck = validateContactValueForType(
        contact.contactTypeCode,
        parsed.data.contactValue
      );
      if (!valueCheck.ok) {
        throw new PartyError(
          "INVALID_INPUT",
          valueCheck.message,
          400,
          valueCheck.field
        );
      }

      const phoneContext = await requireBusinessPhoneContext(
        this.referenceRepository,
        context.businessId
      );
      contactValue = normalizePartyContactValue(
        contact.contactTypeCode,
        parsed.data.contactValue,
        phoneContext
      );

      const duplicate =
        await this.partyContactRepository.findByPartyAndContactValue(
          context.businessId,
          partyId,
          contactValue,
          partyContactId
        );
      if (duplicate) {
        throw new PartyError(
          "DUPLICATE_CONTACT_VALUE",
          PARTY_USER_MESSAGES.DUPLICATE_CONTACT_VALUE,
          409,
          "contactValue"
        );
      }
    }

    await this.partyContactRepository.updateById(
      context.businessId,
      partyContactId,
      {
        ...(contactValue !== undefined ? { contactValue } : {}),
        ...(parsed.data.notes !== undefined
          ? {
              notes:
                parsed.data.notes === null
                  ? null
                  : parsed.data.notes.trim() || null,
            }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyContacts(context, partyId);
  }

  async setPreferred(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string
  ): Promise<PartyContactsPanelView> {
    await this.requireParty(context, partyId);
    const contact = await this.requireContact(context, partyId, partyContactId);

    if (
      !canBePreferred(
        contact.statusCode as PartyContactStatusCode,
        true
      )
    ) {
      throw new PartyError(
        "PREFERRED_CONTACT_INACTIVE",
        PARTY_USER_MESSAGES.PREFERRED_CONTACT_INACTIVE,
        400
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await this.partyContactRepository.clearPreferredForPartyAndType(
        context.businessId,
        partyId,
        contact.contactTypeCode,
        tx
      );
      await this.partyContactRepository.updateById(
        context.businessId,
        partyContactId,
        {
          isPreferred: true,
          updatedBy: context.platformUserId,
        },
        tx
      );
    });

    return this.getPartyContacts(context, partyId);
  }

  /**
   * WHAT: Flip the Verified flag only (BR-005).
   * WHY: OTP / channel verification belongs to later packages.
   */
  async verifyContact(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string
  ): Promise<PartyContactsPanelView> {
    await this.requireParty(context, partyId);
    await this.requireContact(context, partyId, partyContactId);

    await this.partyContactRepository.updateById(
      context.businessId,
      partyContactId,
      {
        isVerified: true,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyContacts(context, partyId);
  }

  async deactivateContact(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string
  ): Promise<PartyContactsPanelView> {
    await this.requireParty(context, partyId);
    const contact = await this.requireContact(context, partyId, partyContactId);

    if (
      !canDeactivateContact(
        contact.statusCode as PartyContactStatusCode,
        contact.isPreferred
      )
    ) {
      if (contact.isPreferred) {
        throw new PartyError(
          "PREFERRED_CONTACT_INACTIVE",
          PARTY_USER_MESSAGES.PREFERRED_CONTACT_INACTIVE,
          400
        );
      }
      throw new PartyError(
        "INVALID_CONTACT_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_CONTACT_TRANSITION,
        400
      );
    }

    await this.partyContactRepository.updateById(
      context.businessId,
      partyContactId,
      {
        statusCode: PARTY_CONTACT_STATUS_CODES.INACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyContacts(context, partyId);
  }

  async reactivateContact(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string
  ): Promise<PartyContactsPanelView> {
    await this.requireParty(context, partyId);
    const contact = await this.requireContact(context, partyId, partyContactId);

    if (
      !canReactivateContact(contact.statusCode as PartyContactStatusCode)
    ) {
      throw new PartyError(
        "INVALID_CONTACT_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_CONTACT_TRANSITION,
        400
      );
    }

    await this.partyContactRepository.updateById(
      context.businessId,
      partyContactId,
      {
        statusCode: PARTY_CONTACT_STATUS_CODES.ACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyContacts(context, partyId);
  }

  /**
   * WHAT: Soft-delete a contact (BR-006).
   */
  async removeContact(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string
  ): Promise<PartyContactsPanelView> {
    await this.requireParty(context, partyId);
    await this.requireContact(context, partyId, partyContactId);

    await this.partyContactRepository.updateById(
      context.businessId,
      partyContactId,
      {
        isPreferred: false,
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyContacts(context, partyId);
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

  private async requireContact(
    context: CurrentBusinessContext,
    partyId: string,
    partyContactId: string
  ) {
    const contact = await this.partyContactRepository.findById(
      context.businessId,
      partyContactId
    );
    if (!contact || contact.partyId !== partyId) {
      throw new PartyError(
        "PARTY_CONTACT_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_CONTACT_NOT_FOUND,
        404
      );
    }
    return contact;
  }

  private toView(
    row: {
      id: string;
      partyId: string;
      contactTypeCode: string;
      contactValue: string;
      isPreferred: boolean;
      isVerified: boolean;
      statusCode: string;
      notes: string | null;
    },
    nameByCode: Map<string, string>
  ): PartyContactView {
    const statusCode = isPartyContactStatusCode(row.statusCode)
      ? row.statusCode
      : PARTY_CONTACT_STATUS_CODES.ACTIVE;

    return {
      id: row.id,
      partyId: row.partyId,
      contactTypeCode: row.contactTypeCode,
      contactTypeName: nameByCode.get(row.contactTypeCode) ?? row.contactTypeCode,
      contactValue: row.contactValue,
      isPreferred: row.isPreferred,
      isVerified: row.isVerified,
      statusCode,
      notes: row.notes,
    };
  }
}

export function createPartyContactService(): PartyContactService {
  return new PartyContactService();
}
