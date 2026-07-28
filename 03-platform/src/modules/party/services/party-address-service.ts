/**
 * Purpose:
 * Party Address Management — add, edit, default, deactivate, remove.
 *
 * Architecture:
 * Server Actions → PartyAddressService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { formatCountyOrState } from "@/core/shared/address";
import { getDb } from "@/db/client";
import {
  PARTY_ADDRESS_STATUS_CODES,
  type PartyAddressStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import {
  createPartyAddressRepository,
  formatGpsForStorage,
} from "@/modules/party/repositories/party-address-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  canBeDefaultAddress,
  canDeactivateAddress,
  canReactivateAddress,
  isAddressTypeAllowedForPartyType,
  isPartyAddressStatusCode,
} from "@/modules/party/services/party-address-rules";
import type {
  AddPartyAddressPayload,
  PartyAddressesPanelView,
  PartyAddressView,
  UpdatePartyAddressPayload,
} from "@/modules/party/types";
import {
  addPartyAddressSchema,
  nullableTrimmed,
  updatePartyAddressSchema,
  validateGpsCoordinates,
} from "@/modules/party/validators/party-address-validators";

export class PartyAddressService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyAddressRepository = createPartyAddressRepository(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  async getPartyAddresses(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyAddressesPanelView> {
    const party = await this.requireParty(context, partyId);

    const [rows, addressTypes, countries] = await Promise.all([
      this.partyAddressRepository.listByPartyId(context.businessId, partyId),
      this.referenceRepository.listActiveAddressTypes(),
      this.referenceRepository.listActiveCountries(),
    ]);

    if (addressTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Address Type catalogue is empty. Seed Party Address catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(addressTypes.map((t) => [t.code, t.name]));
    const countryNameByCode = new Map(countries.map((c) => [c.code, c.name]));

    const addresses = rows.map((row) =>
      this.toView(row, typeNameByCode, countryNameByCode)
    );

    const availableAddressTypes = addressTypes.filter((type) =>
      isAddressTypeAllowedForPartyType(
        party.partyTypeCode as PartyTypeCode,
        type.code
      )
    );

    return { addresses, availableAddressTypes, countries };
  }

  async addAddress(
    context: CurrentBusinessContext,
    partyId: string,
    payload: AddPartyAddressPayload
  ): Promise<PartyAddressesPanelView> {
    await this.createAddressRecord(context, partyId, payload);
    return this.getPartyAddresses(context, partyId);
  }

  /**
   * WHAT: Create one party address row and return its id (for linking from other modules).
   */
  async createAddressRecord(
    context: CurrentBusinessContext,
    partyId: string,
    payload: AddPartyAddressPayload
  ): Promise<string> {
    const parsed = addPartyAddressSchema.safeParse(payload);
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

    const addressType = await this.referenceRepository.findAddressTypeByCode(
      parsed.data.addressTypeCode
    );
    if (!addressType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid address type.",
        400,
        "addressTypeCode"
      );
    }

    if (
      !isAddressTypeAllowedForPartyType(
        party.partyTypeCode as PartyTypeCode,
        parsed.data.addressTypeCode
      )
    ) {
      throw new PartyError(
        "ADDRESS_TYPE_NOT_ALLOWED",
        PARTY_USER_MESSAGES.ADDRESS_TYPE_NOT_ALLOWED,
        400,
        "addressTypeCode"
      );
    }

    const country = await this.referenceRepository.findCountryByCode(
      parsed.data.countryCode
    );
    if (!country) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid country.",
        400,
        "countryCode"
      );
    }

    const gpsCheck = validateGpsCoordinates(
      parsed.data.gpsLatitude,
      parsed.data.gpsLongitude
    );
    if (!gpsCheck.ok) {
      throw new PartyError("INVALID_INPUT", gpsCheck.message, 400, gpsCheck.field);
    }

    const makeDefault = parsed.data.isDefault === true;
    if (!canBeDefaultAddress(PARTY_ADDRESS_STATUS_CODES.ACTIVE, makeDefault)) {
      throw new PartyError(
        "DEFAULT_ADDRESS_INACTIVE",
        PARTY_USER_MESSAGES.DEFAULT_ADDRESS_INACTIVE,
        400
      );
    }

    const db = getDb();
    let addressId = "";
    await db.transaction(async (tx) => {
      if (makeDefault) {
        await this.partyAddressRepository.clearDefaultForPartyAndType(
          context.businessId,
          partyId,
          parsed.data.addressTypeCode,
          tx
        );
      }

      const row = await this.partyAddressRepository.insert(
        {
          businessId: context.businessId,
          partyId,
          addressTypeCode: parsed.data.addressTypeCode,
          countryCode: parsed.data.countryCode,
          stateProvince: nullableTrimmed(parsed.data.stateProvince),
          countyDistrict: nullableTrimmed(parsed.data.countyDistrict),
          cityTown: nullableTrimmed(parsed.data.cityTown),
          wardLocality: nullableTrimmed(parsed.data.wardLocality),
          postalCode: nullableTrimmed(parsed.data.postalCode),
          addressLine1: nullableTrimmed(parsed.data.addressLine1),
          addressLine2: nullableTrimmed(parsed.data.addressLine2),
          landmark: nullableTrimmed(parsed.data.landmark),
          gpsLatitude: formatGpsForStorage(parsed.data.gpsLatitude),
          gpsLongitude: formatGpsForStorage(parsed.data.gpsLongitude),
          isDefault: makeDefault,
          statusCode: PARTY_ADDRESS_STATUS_CODES.ACTIVE,
          notes: nullableTrimmed(parsed.data.notes),
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );
      addressId = row.id;
    });

    return addressId;
  }

  async updateAddress(
    context: CurrentBusinessContext,
    partyId: string,
    partyAddressId: string,
    payload: UpdatePartyAddressPayload
  ): Promise<PartyAddressesPanelView> {
    const parsed = updatePartyAddressSchema.safeParse(payload);
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
    const address = await this.requireAddress(context, partyId, partyAddressId);

    if (parsed.data.countryCode !== undefined) {
      const country = await this.referenceRepository.findCountryByCode(
        parsed.data.countryCode
      );
      if (!country) {
        throw new PartyError(
          "INVALID_INPUT",
          "Select a valid country.",
          400,
          "countryCode"
        );
      }
    }

    const nextLatitude =
      parsed.data.gpsLatitude !== undefined
        ? parsed.data.gpsLatitude
        : address.gpsLatitude
          ? Number(address.gpsLatitude)
          : null;
    const nextLongitude =
      parsed.data.gpsLongitude !== undefined
        ? parsed.data.gpsLongitude
        : address.gpsLongitude
          ? Number(address.gpsLongitude)
          : null;

    const gpsCheck = validateGpsCoordinates(nextLatitude, nextLongitude);
    if (!gpsCheck.ok) {
      throw new PartyError("INVALID_INPUT", gpsCheck.message, 400, gpsCheck.field);
    }

    await this.partyAddressRepository.updateById(
      context.businessId,
      partyAddressId,
      {
        ...(parsed.data.countryCode !== undefined
          ? { countryCode: parsed.data.countryCode }
          : {}),
        ...(parsed.data.stateProvince !== undefined
          ? { stateProvince: nullableTrimmed(parsed.data.stateProvince) }
          : {}),
        ...(parsed.data.countyDistrict !== undefined
          ? { countyDistrict: nullableTrimmed(parsed.data.countyDistrict) }
          : {}),
        ...(parsed.data.cityTown !== undefined
          ? { cityTown: nullableTrimmed(parsed.data.cityTown) }
          : {}),
        ...(parsed.data.wardLocality !== undefined
          ? { wardLocality: nullableTrimmed(parsed.data.wardLocality) }
          : {}),
        ...(parsed.data.postalCode !== undefined
          ? { postalCode: nullableTrimmed(parsed.data.postalCode) }
          : {}),
        ...(parsed.data.addressLine1 !== undefined
          ? { addressLine1: nullableTrimmed(parsed.data.addressLine1) }
          : {}),
        ...(parsed.data.addressLine2 !== undefined
          ? { addressLine2: nullableTrimmed(parsed.data.addressLine2) }
          : {}),
        ...(parsed.data.landmark !== undefined
          ? { landmark: nullableTrimmed(parsed.data.landmark) }
          : {}),
        ...(parsed.data.gpsLatitude !== undefined
          ? { gpsLatitude: formatGpsForStorage(parsed.data.gpsLatitude) }
          : {}),
        ...(parsed.data.gpsLongitude !== undefined
          ? { gpsLongitude: formatGpsForStorage(parsed.data.gpsLongitude) }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyAddresses(context, partyId);
  }

  async setDefault(
    context: CurrentBusinessContext,
    partyId: string,
    partyAddressId: string
  ): Promise<PartyAddressesPanelView> {
    await this.requireParty(context, partyId);
    const address = await this.requireAddress(context, partyId, partyAddressId);

    if (
      !canBeDefaultAddress(address.statusCode as PartyAddressStatusCode, true)
    ) {
      throw new PartyError(
        "DEFAULT_ADDRESS_INACTIVE",
        PARTY_USER_MESSAGES.DEFAULT_ADDRESS_INACTIVE,
        400
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await this.partyAddressRepository.clearDefaultForPartyAndType(
        context.businessId,
        partyId,
        address.addressTypeCode,
        tx
      );
      await this.partyAddressRepository.updateById(
        context.businessId,
        partyAddressId,
        {
          isDefault: true,
          updatedBy: context.platformUserId,
        },
        tx
      );
    });

    return this.getPartyAddresses(context, partyId);
  }

  async deactivateAddress(
    context: CurrentBusinessContext,
    partyId: string,
    partyAddressId: string
  ): Promise<PartyAddressesPanelView> {
    await this.requireParty(context, partyId);
    const address = await this.requireAddress(context, partyId, partyAddressId);

    if (
      !canDeactivateAddress(
        address.statusCode as PartyAddressStatusCode,
        address.isDefault
      )
    ) {
      if (address.isDefault) {
        throw new PartyError(
          "DEFAULT_ADDRESS_INACTIVE",
          PARTY_USER_MESSAGES.DEFAULT_ADDRESS_INACTIVE,
          400
        );
      }
      throw new PartyError(
        "INVALID_ADDRESS_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_ADDRESS_TRANSITION,
        400
      );
    }

    await this.partyAddressRepository.updateById(
      context.businessId,
      partyAddressId,
      {
        statusCode: PARTY_ADDRESS_STATUS_CODES.INACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyAddresses(context, partyId);
  }

  async reactivateAddress(
    context: CurrentBusinessContext,
    partyId: string,
    partyAddressId: string
  ): Promise<PartyAddressesPanelView> {
    await this.requireParty(context, partyId);
    const address = await this.requireAddress(context, partyId, partyAddressId);

    if (!canReactivateAddress(address.statusCode as PartyAddressStatusCode)) {
      throw new PartyError(
        "INVALID_ADDRESS_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_ADDRESS_TRANSITION,
        400
      );
    }

    await this.partyAddressRepository.updateById(
      context.businessId,
      partyAddressId,
      {
        statusCode: PARTY_ADDRESS_STATUS_CODES.ACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyAddresses(context, partyId);
  }

  async removeAddress(
    context: CurrentBusinessContext,
    partyId: string,
    partyAddressId: string
  ): Promise<PartyAddressesPanelView> {
    await this.requireParty(context, partyId);
    await this.requireAddress(context, partyId, partyAddressId);

    await this.partyAddressRepository.updateById(
      context.businessId,
      partyAddressId,
      {
        isDefault: false,
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    return this.getPartyAddresses(context, partyId);
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

  private async requireAddress(
    context: CurrentBusinessContext,
    partyId: string,
    partyAddressId: string
  ) {
    const address = await this.partyAddressRepository.findById(
      context.businessId,
      partyAddressId
    );
    if (!address || address.partyId !== partyId) {
      throw new PartyError(
        "PARTY_ADDRESS_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_ADDRESS_NOT_FOUND,
        404
      );
    }
    return address;
  }

  private toView(
    row: {
      id: string;
      partyId: string;
      addressTypeCode: string;
      countryCode: string;
      stateProvince: string | null;
      countyDistrict: string | null;
      cityTown: string | null;
      wardLocality: string | null;
      postalCode: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      landmark: string | null;
      gpsLatitude: string | null;
      gpsLongitude: string | null;
      isDefault: boolean;
      statusCode: string;
      notes: string | null;
      updatedAt: Date;
    },
    typeNameByCode: Map<string, string>,
    countryNameByCode: Map<string, string>
  ): PartyAddressView {
    const statusCode = isPartyAddressStatusCode(row.statusCode)
      ? row.statusCode
      : PARTY_ADDRESS_STATUS_CODES.ACTIVE;

    return {
      id: row.id,
      partyId: row.partyId,
      addressTypeCode: row.addressTypeCode,
      addressTypeName: typeNameByCode.get(row.addressTypeCode) ?? row.addressTypeCode,
      countryCode: row.countryCode,
      countryName: countryNameByCode.get(row.countryCode) ?? row.countryCode,
      stateProvince: row.stateProvince,
      countyDistrict: row.countyDistrict,
      cityTown: row.cityTown,
      wardLocality: row.wardLocality,
      postalCode: row.postalCode,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      landmark: row.landmark,
      gpsLatitude: row.gpsLatitude,
      gpsLongitude: row.gpsLongitude,
      isDefault: row.isDefault,
      statusCode,
      notes: row.notes,
      countyOrStateDisplay: formatCountyOrState(
        row.countyDistrict,
        row.stateProvince
      ),
      deactivatedAt:
        statusCode === PARTY_ADDRESS_STATUS_CODES.INACTIVE
          ? row.updatedAt.toISOString()
          : null,
    };
  }
}

export function createPartyAddressService(): PartyAddressService {
  return new PartyAddressService();
}
