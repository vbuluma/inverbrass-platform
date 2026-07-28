/**
 * Purpose:
 * Organization Structure Engine — organizational unit CRUD and head office rules.
 *
 * Architecture:
 * Server Actions → OrganizationalUnitService → Repositories → Drizzle
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import { normalizePhoneNumberToE164 } from "@/core/shared/phone";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ORGANIZATIONAL_UNIT_STATUS_CODES,
  PARTY_ADDRESS_STATUS_CODES,
  PARTY_TYPE_CODES,
  type OrganizationalUnitStatusCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createOrganizationalUnitRepository } from "@/modules/party/repositories/organizational-unit-repository";
import { createPartyAddressRepository } from "@/modules/party/repositories/party-address-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { createPartyAddressService } from "@/modules/party/services/party-address-service";
import {
  canDeactivateOrganizationalUnit,
  canReactivateOrganizationalUnit,
  canSetHeadOffice,
  defaultPhysicalAddressTypeForUnit,
  formatLocationDisplay,
  isOrganizationalUnitStatusCode,
  isUnitPhysicalAddressType,
  isValidParentOrganizationalUnit,
  normalizeUnitCode,
  todayIsoDate,
} from "@/modules/party/services/organizational-unit-rules";
import { buildOrganizationalUnitTree } from "@/modules/party/services/organizational-unit-tree";
import {
  requireBusinessPhoneContext,
  type BusinessPhoneContext,
} from "@/modules/party/services/party-phone";
import type {
  AddOrganizationalUnitPayload,
  InlinePhysicalAddressPayload,
  OrganizationStructurePanelView,
  OrganizationalUnitView,
  SearchOrganizationalUnitsPayload,
  UpdateOrganizationalUnitPayload,
} from "@/modules/party/types";
import {
  addOrganizationalUnitSchema,
  inlinePhysicalAddressSchema,
  nullableTrimmed,
  parseOptionalGps,
  searchOrganizationalUnitsSchema,
  updateOrganizationalUnitSchema,
} from "@/modules/party/validators/organizational-unit-validators";

export class OrganizationalUnitService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly organizationalUnitRepository = createOrganizationalUnitRepository(),
    private readonly partyAddressRepository = createPartyAddressRepository(),
    private readonly partyAddressService = createPartyAddressService(),
    private readonly referenceRepository = createPartyReferenceRepository()
  ) {}

  async getOrganizationStructure(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    search?: SearchOrganizationalUnitsPayload
  ): Promise<OrganizationStructurePanelView> {
    const party = await this.partyRepository.findById(
      context.businessId,
      organizationPartyId
    );
    if (!party) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }

    if (party.partyTypeCode !== PARTY_TYPE_CODES.ORGANIZATION) {
      return this.emptyPanel(false);
    }

    const parsedSearch = search
      ? searchOrganizationalUnitsSchema.safeParse(search)
      : null;
    if (parsedSearch && !parsedSearch.success) {
      const first = parsedSearch.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const [unitTypes, addressRows, countries] = await Promise.all([
      this.referenceRepository.listActiveOrganizationalUnitTypes(),
      this.partyAddressRepository.listByPartyId(
        context.businessId,
        organizationPartyId
      ),
      this.referenceRepository.listActiveCountries(),
    ]);

    if (unitTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Organizational Unit Type catalogue is empty. Seed Organization Structure catalogues before continuing.",
        503
      );
    }

    const rows = parsedSearch?.success
      ? await this.organizationalUnitRepository.searchByOrganization(
          context.businessId,
          organizationPartyId,
          {
            query: parsedSearch.data.query,
            organizationalUnitTypeCode:
              parsedSearch.data.organizationalUnitTypeCode,
            statusCode: parsedSearch.data.statusCode,
          }
        )
      : await this.organizationalUnitRepository.listByOrganizationPartyId(
          context.businessId,
          organizationPartyId
        );

    const typeNameByCode = new Map(unitTypes.map((t) => [t.code, t.name]));
    const unitNameById = new Map(rows.map((row) => [row.id, row.unitName]));
    const linkableAddresses = addressRows.filter(
      (row) =>
        isUnitPhysicalAddressType(row.addressTypeCode) &&
        row.statusCode === PARTY_ADDRESS_STATUS_CODES.ACTIVE
    );
    const addressLabelById = new Map(
      linkableAddresses.map((row) => [
        row.id,
        this.formatPhysicalAddressLabel(row.addressTypeCode, row.cityTown, row.addressLine1),
      ])
    );

    const units = rows.map((row) =>
      this.toView(row, typeNameByCode, unitNameById, addressLabelById)
    );

    return {
      isOrganization: true,
      units,
      tree: buildOrganizationalUnitTree(units),
      availableUnitTypes: unitTypes,
      physicalAddressOptions: linkableAddresses.map((row) => ({
        id: row.id,
        label: this.formatPhysicalAddressLabel(
          row.addressTypeCode,
          row.cityTown,
          row.addressLine1
        ),
      })),
      countries,
      parentUnitOptions: rows.map((row) => ({
        code: row.id,
        name: `${row.unitCode} — ${row.unitName}`,
      })),
      summary: this.buildSummary(units),
    };
  }

  async getOrganizationalUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ): Promise<OrganizationalUnitView> {
    await this.requireOrganizationParty(context, organizationPartyId);
    const unit = await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    const [unitTypes, rows, addressRows] = await Promise.all([
      this.referenceRepository.listActiveOrganizationalUnitTypes(),
      this.organizationalUnitRepository.listByOrganizationPartyId(
        context.businessId,
        organizationPartyId
      ),
      this.partyAddressRepository.listByPartyId(
        context.businessId,
        organizationPartyId
      ),
    ]);

    const typeNameByCode = new Map(unitTypes.map((t) => [t.code, t.name]));
    const unitNameById = new Map(rows.map((row) => [row.id, row.unitName]));
    const linkableAddresses = addressRows.filter(
      (row) =>
        isUnitPhysicalAddressType(row.addressTypeCode) &&
        row.statusCode === PARTY_ADDRESS_STATUS_CODES.ACTIVE
    );
    const addressLabelById = new Map(
      linkableAddresses.map((row) => [
        row.id,
        this.formatPhysicalAddressLabel(row.addressTypeCode, row.cityTown, row.addressLine1),
      ])
    );

    return this.toView(unit, typeNameByCode, unitNameById, addressLabelById);
  }

  async addUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    payload: AddOrganizationalUnitPayload
  ): Promise<OrganizationStructurePanelView> {
    const parsed = addOrganizationalUnitSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireOrganizationParty(context, organizationPartyId);

    const unitType =
      await this.referenceRepository.findOrganizationalUnitTypeByCode(
        parsed.data.organizationalUnitTypeCode
      );
    if (!unitType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid organizational unit type.",
        400,
        "organizationalUnitTypeCode"
      );
    }

    const unitCode = normalizeUnitCode(parsed.data.unitCode);
    const duplicate =
      await this.organizationalUnitRepository.findByOrganizationAndCode(
        context.businessId,
        organizationPartyId,
        unitCode
      );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_UNIT_CODE",
        PARTY_USER_MESSAGES.DUPLICATE_UNIT_CODE,
        409,
        "unitCode"
      );
    }

    const parentOrganizationalUnitId = nullableTrimmed(
      parsed.data.parentOrganizationalUnitId ?? null
    );
    if (parentOrganizationalUnitId) {
      await this.validateParentUnit(
        context,
        organizationPartyId,
        null,
        parentOrganizationalUnitId
      );
    }

    const isHeadOffice = parsed.data.isHeadOffice === true;

    const partyAddressId = await this.resolvePhysicalAddressId(
      context,
      organizationPartyId,
      {
        partyAddressId: nullableTrimmed(parsed.data.partyAddressId ?? null),
        newPhysicalAddress: parsed.data.newPhysicalAddress ?? null,
        isHeadOffice,
      }
    );
    if (isHeadOffice) {
      await this.assertNoExistingHeadOffice(context, organizationPartyId);
    }

    let gps: { latitude: string | null; longitude: string | null };
    try {
      gps = parseOptionalGps(parsed.data.latitude, parsed.data.longitude);
    } catch {
      throw new PartyError(
        "INVALID_INPUT",
        "Enter both GPS latitude and longitude, or leave both empty.",
        400,
        "latitude"
      );
    }

    const phoneContext = await requireBusinessPhoneContext(
      this.referenceRepository,
      context.businessId
    );

    await this.organizationalUnitRepository.insert({
      businessId: context.businessId,
      organizationPartyId,
      unitCode,
      unitName: parsed.data.unitName.trim(),
      organizationalUnitTypeCode: parsed.data.organizationalUnitTypeCode,
      parentOrganizationalUnitId,
      isHeadOffice,
      phone: this.normalizeOptionalPhone(
        parsed.data.phone,
        phoneContext,
        "phone"
      ),
      email: nullableTrimmed(parsed.data.email ?? null),
      partyAddressId,
      countryCode: null,
      latitude: gps.latitude,
      longitude: gps.longitude,
      statusCode: ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE,
      openingDate: parsed.data.openingDate?.trim() || todayIsoDate(),
      closingDate: nullableTrimmed(parsed.data.closingDate ?? null),
      notes: nullableTrimmed(parsed.data.notes),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  async updateUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string,
    payload: UpdateOrganizationalUnitPayload
  ): Promise<OrganizationStructurePanelView> {
    const parsed = updateOrganizationalUnitSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireOrganizationParty(context, organizationPartyId);
    await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    if (parsed.data.organizationalUnitTypeCode) {
      const unitType =
        await this.referenceRepository.findOrganizationalUnitTypeByCode(
          parsed.data.organizationalUnitTypeCode
        );
      if (!unitType) {
        throw new PartyError(
          "INVALID_INPUT",
          "Select a valid organizational unit type.",
          400,
          "organizationalUnitTypeCode"
        );
      }
    }

    const parentOrganizationalUnitId =
      parsed.data.parentOrganizationalUnitId !== undefined
        ? nullableTrimmed(parsed.data.parentOrganizationalUnitId)
        : undefined;
    if (parentOrganizationalUnitId) {
      await this.validateParentUnit(
        context,
        organizationPartyId,
        organizationalUnitId,
        parentOrganizationalUnitId
      );
    }

    const partyAddressId =
      parsed.data.partyAddressId !== undefined ||
      parsed.data.newPhysicalAddress !== undefined
        ? await this.resolvePhysicalAddressId(context, organizationPartyId, {
            partyAddressId:
              parsed.data.partyAddressId !== undefined
                ? nullableTrimmed(parsed.data.partyAddressId)
                : null,
            newPhysicalAddress: parsed.data.newPhysicalAddress ?? null,
            isHeadOffice: (
              await this.requireUnitForOrganization(
                context,
                organizationPartyId,
                organizationalUnitId
              )
            ).isHeadOffice,
          })
        : undefined;

    let gps: { latitude: string | null; longitude: string | null } | undefined;
    if (
      parsed.data.latitude !== undefined ||
      parsed.data.longitude !== undefined
    ) {
      try {
        gps = parseOptionalGps(parsed.data.latitude, parsed.data.longitude);
      } catch {
        throw new PartyError(
          "INVALID_INPUT",
          "Enter both GPS latitude and longitude, or leave both empty.",
          400,
          "latitude"
        );
      }
    }

    const phoneContext = await requireBusinessPhoneContext(
      this.referenceRepository,
      context.businessId
    );

    await this.organizationalUnitRepository.updateById(
      context.businessId,
      organizationalUnitId,
      {
        ...(parsed.data.unitName !== undefined
          ? { unitName: parsed.data.unitName.trim() }
          : {}),
        ...(parsed.data.organizationalUnitTypeCode !== undefined
          ? {
              organizationalUnitTypeCode:
                parsed.data.organizationalUnitTypeCode,
            }
          : {}),
        ...(parentOrganizationalUnitId !== undefined
          ? { parentOrganizationalUnitId }
          : {}),
        ...(parsed.data.phone !== undefined
          ? {
              phone: this.normalizeOptionalPhone(
                parsed.data.phone,
                phoneContext,
                "phone"
              ),
            }
          : {}),
        ...(parsed.data.email !== undefined
          ? { email: nullableTrimmed(parsed.data.email) }
          : {}),
        ...(partyAddressId !== undefined ? { partyAddressId } : {}),
        ...(gps !== undefined
          ? { latitude: gps.latitude, longitude: gps.longitude }
          : {}),
        ...(parsed.data.openingDate !== undefined
          ? { openingDate: parsed.data.openingDate.trim() }
          : {}),
        ...(parsed.data.closingDate !== undefined
          ? { closingDate: nullableTrimmed(parsed.data.closingDate) }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  async setHeadOffice(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ): Promise<OrganizationStructurePanelView> {
    await this.requireOrganizationParty(context, organizationPartyId);
    const unit = await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    if (!canSetHeadOffice(unit.statusCode as OrganizationalUnitStatusCode)) {
      throw new PartyError(
        "INVALID_ORGANIZATIONAL_UNIT_TRANSITION",
        "Only active organizational units can be designated Head Office.",
        400
      );
    }

    const existingHeadOffice =
      await this.organizationalUnitRepository.findHeadOfficeForOrganization(
        context.businessId,
        organizationPartyId
      );
    if (
      existingHeadOffice &&
      existingHeadOffice.id !== organizationalUnitId
    ) {
      throw new PartyError(
        "HEAD_OFFICE_ALREADY_EXISTS",
        PARTY_USER_MESSAGES.HEAD_OFFICE_ALREADY_EXISTS,
        409
      );
    }

    await this.organizationalUnitRepository.updateById(
      context.businessId,
      organizationalUnitId,
      {
        isHeadOffice: true,
        updatedBy: context.platformUserId,
      }
    );

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  async removeHeadOfficeDesignation(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ): Promise<OrganizationStructurePanelView> {
    await this.requireOrganizationParty(context, organizationPartyId);
    const unit = await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    if (!unit.isHeadOffice) {
      throw new PartyError(
        "INVALID_ORGANIZATIONAL_UNIT_TRANSITION",
        "This organizational unit is not designated as Head Office.",
        400
      );
    }

    await this.organizationalUnitRepository.updateById(
      context.businessId,
      organizationalUnitId,
      {
        isHeadOffice: false,
        updatedBy: context.platformUserId,
      }
    );

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  async deactivateUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ): Promise<OrganizationStructurePanelView> {
    await this.requireOrganizationParty(context, organizationPartyId);
    const unit = await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    if (
      !canDeactivateOrganizationalUnit(
        unit.statusCode as OrganizationalUnitStatusCode,
        unit.isHeadOffice
      )
    ) {
      throw new PartyError(
        unit.isHeadOffice
          ? "HEAD_OFFICE_UNIT_INACTIVE"
          : "INVALID_ORGANIZATIONAL_UNIT_TRANSITION",
        unit.isHeadOffice
          ? PARTY_USER_MESSAGES.HEAD_OFFICE_UNIT_INACTIVE
          : PARTY_USER_MESSAGES.INVALID_ORGANIZATIONAL_UNIT_TRANSITION,
        400
      );
    }

    await this.organizationalUnitRepository.updateById(
      context.businessId,
      organizationalUnitId,
      {
        statusCode: ORGANIZATIONAL_UNIT_STATUS_CODES.INACTIVE,
        closingDate: unit.closingDate ?? todayIsoDate(),
        updatedBy: context.platformUserId,
      }
    );

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  async reactivateUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ): Promise<OrganizationStructurePanelView> {
    await this.requireOrganizationParty(context, organizationPartyId);
    const unit = await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    if (
      !canReactivateOrganizationalUnit(
        unit.statusCode as OrganizationalUnitStatusCode
      )
    ) {
      throw new PartyError(
        "INVALID_ORGANIZATIONAL_UNIT_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_ORGANIZATIONAL_UNIT_TRANSITION,
        400
      );
    }

    await this.organizationalUnitRepository.updateById(
      context.businessId,
      organizationalUnitId,
      {
        statusCode: ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE,
        closingDate: null,
        updatedBy: context.platformUserId,
      }
    );

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  async removeUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ): Promise<OrganizationStructurePanelView> {
    await this.requireOrganizationParty(context, organizationPartyId);
    const unit = await this.requireUnitForOrganization(
      context,
      organizationPartyId,
      organizationalUnitId
    );

    if (unit.isHeadOffice) {
      throw new PartyError(
        "HEAD_OFFICE_UNIT_INACTIVE",
        PARTY_USER_MESSAGES.HEAD_OFFICE_UNIT_INACTIVE,
        400
      );
    }

    await this.organizationalUnitRepository.updateById(
      context.businessId,
      organizationalUnitId,
      {
        isHeadOffice: false,
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    return this.getOrganizationStructure(context, organizationPartyId);
  }

  private emptyPanel(isOrganization: boolean): OrganizationStructurePanelView {
    return {
      isOrganization,
      units: [],
      tree: [],
      availableUnitTypes: [],
      physicalAddressOptions: [],
      countries: [],
      parentUnitOptions: [],
      summary: {
        total: 0,
        active: 0,
        inactive: 0,
        headOfficeName: null,
        hasOnlyHeadOffice: false,
      },
    };
  }

  private async requireOrganizationParty(
    context: CurrentBusinessContext,
    organizationPartyId: string
  ) {
    const party = await this.partyRepository.findById(
      context.businessId,
      organizationPartyId
    );
    if (!party) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }
    if (party.partyTypeCode !== PARTY_TYPE_CODES.ORGANIZATION) {
      throw new PartyError(
        "ORGANIZATIONS_ONLY_UNITS",
        PARTY_USER_MESSAGES.ORGANIZATIONS_ONLY_UNITS,
        403
      );
    }
    return party;
  }

  private async requireUnitForOrganization(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    organizationalUnitId: string
  ) {
    const unit = await this.organizationalUnitRepository.findById(
      context.businessId,
      organizationalUnitId
    );
    if (!unit || unit.organizationPartyId !== organizationPartyId) {
      throw new PartyError(
        "ORGANIZATIONAL_UNIT_NOT_FOUND",
        PARTY_USER_MESSAGES.ORGANIZATIONAL_UNIT_NOT_FOUND,
        404
      );
    }
    return unit;
  }

  private async assertNoExistingHeadOffice(
    context: CurrentBusinessContext,
    organizationPartyId: string
  ) {
    const existing =
      await this.organizationalUnitRepository.findHeadOfficeForOrganization(
        context.businessId,
        organizationPartyId
      );
    if (existing) {
      throw new PartyError(
        "HEAD_OFFICE_ALREADY_EXISTS",
        PARTY_USER_MESSAGES.HEAD_OFFICE_ALREADY_EXISTS,
        409
      );
    }
  }

  private async validateParentUnit(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    unitId: string | null,
    parentOrganizationalUnitId: string
  ) {
    if (unitId && !isValidParentOrganizationalUnit(unitId, parentOrganizationalUnitId)) {
      throw new PartyError(
        "INVALID_PARENT_ORGANIZATIONAL_UNIT",
        PARTY_USER_MESSAGES.INVALID_PARENT_ORGANIZATIONAL_UNIT,
        400,
        "parentOrganizationalUnitId"
      );
    }

    const parent = await this.organizationalUnitRepository.findById(
      context.businessId,
      parentOrganizationalUnitId
    );
    if (!parent || parent.organizationPartyId !== organizationPartyId) {
      throw new PartyError(
        "INVALID_PARENT_ORGANIZATIONAL_UNIT",
        PARTY_USER_MESSAGES.INVALID_PARENT_ORGANIZATIONAL_UNIT,
        400,
        "parentOrganizationalUnitId"
      );
    }
  }

  private async validatePartyAddress(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    partyAddressId: string
  ) {
    const address = await this.partyAddressRepository.findById(
      context.businessId,
      partyAddressId
    );
    if (!address || address.partyId !== organizationPartyId) {
      throw new PartyError(
        "PARTY_ADDRESS_NOT_FOUND",
        "Select an existing physical address for this organization.",
        404,
        "partyAddressId"
      );
    }
    if (address.statusCode !== PARTY_ADDRESS_STATUS_CODES.ACTIVE) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select an active physical address.",
        400,
        "partyAddressId"
      );
    }
    if (!isUnitPhysicalAddressType(address.addressTypeCode)) {
      throw new PartyError(
        "ADDRESS_TYPE_NOT_ALLOWED",
        "Select a physical, branch, office, or head office address.",
        400,
        "partyAddressId"
      );
    }
  }

  private async resolvePhysicalAddressId(
    context: CurrentBusinessContext,
    organizationPartyId: string,
    input: {
      partyAddressId: string | null;
      newPhysicalAddress: InlinePhysicalAddressPayload | null;
      isHeadOffice: boolean;
    }
  ): Promise<string | null> {
    const hasNewAddress =
      input.newPhysicalAddress !== null &&
      input.newPhysicalAddress !== undefined &&
      Object.keys(input.newPhysicalAddress).length > 0;

    if (hasNewAddress && input.partyAddressId) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select an existing physical address or capture a new one — not both.",
        400,
        "partyAddressId"
      );
    }

    if (hasNewAddress) {
      const parsed = inlinePhysicalAddressSchema.safeParse(input.newPhysicalAddress);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new PartyError(
          "INVALID_INPUT",
          first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
          400,
          first?.path[0] ? String(first.path[0]) : undefined
        );
      }

      return this.partyAddressService.createAddressRecord(
        context,
        organizationPartyId,
        {
          addressTypeCode: defaultPhysicalAddressTypeForUnit(input.isHeadOffice),
          countryCode: parsed.data.countryCode,
          addressLine1: parsed.data.addressLine1,
          cityTown: parsed.data.cityTown,
          countyDistrict: parsed.data.countyDistrict,
          stateProvince: parsed.data.stateProvince,
          wardLocality: parsed.data.wardLocality,
          postalCode: parsed.data.postalCode,
          landmark: parsed.data.landmark,
          gpsLatitude: parsed.data.gpsLatitude,
          gpsLongitude: parsed.data.gpsLongitude,
          isDefault: false,
        }
      );
    }

    if (input.partyAddressId) {
      await this.validatePartyAddress(
        context,
        organizationPartyId,
        input.partyAddressId
      );
      return input.partyAddressId;
    }

    return null;
  }

  private normalizeOptionalPhone(
    value: string | null | undefined,
    phoneContext: BusinessPhoneContext,
    field: string
  ): string | null {
    const trimmed = nullableTrimmed(value ?? null);
    if (!trimmed) {
      return null;
    }
    try {
      return normalizePhoneNumberToE164(trimmed, {
        countryCode: phoneContext.countryCode,
        dialCode: phoneContext.dialCode,
      });
    } catch {
      throw new PartyError(
        "INVALID_INPUT",
        `Enter a valid phone number for ${phoneContext.countryCode}.`,
        400,
        field
      );
    }
  }

  private formatPhysicalAddressLabel(
    addressTypeCode: string,
    cityTown: string | null,
    addressLine1: string | null
  ): string {
    const parts = [addressTypeCode, cityTown, addressLine1].filter(Boolean);
    return parts.join(" · ") || addressTypeCode;
  }

  private buildSummary(
    units: OrganizationalUnitView[]
  ): OrganizationStructurePanelView["summary"] {
    const active = units.filter(
      (unit) => unit.statusCode === ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE
    ).length;
    const headOffice = units.find((unit) => unit.isHeadOffice);
    const nonHeadOfficeCount = units.filter((unit) => !unit.isHeadOffice).length;
    return {
      total: units.length,
      active,
      inactive: units.length - active,
      headOfficeName: headOffice?.unitName ?? null,
      hasOnlyHeadOffice: units.length > 0 && nonHeadOfficeCount === 0,
    };
  }

  private toView(
    row: {
      id: string;
      organizationPartyId: string;
      unitCode: string;
      unitName: string;
      organizationalUnitTypeCode: string;
      parentOrganizationalUnitId: string | null;
      isHeadOffice: boolean;
      phone: string | null;
      email: string | null;
      partyAddressId: string | null;
      countryCode: string | null;
      latitude: string | null;
      longitude: string | null;
      statusCode: string;
      openingDate: string | null;
      closingDate: string | null;
      notes: string | null;
    },
    typeNameByCode: Map<string, string>,
    unitNameById: Map<string, string>,
    addressLabelById: Map<string, string>
  ): OrganizationalUnitView {
    const statusCode = isOrganizationalUnitStatusCode(row.statusCode)
      ? row.statusCode
      : ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE;
    const partyAddressLabel = row.partyAddressId
      ? addressLabelById.get(row.partyAddressId) ?? null
      : null;

    return {
      id: row.id,
      organizationPartyId: row.organizationPartyId,
      unitCode: row.unitCode,
      unitName: row.unitName,
      organizationalUnitTypeCode: row.organizationalUnitTypeCode,
      organizationalUnitTypeName:
        typeNameByCode.get(row.organizationalUnitTypeCode) ??
        row.organizationalUnitTypeCode,
      parentOrganizationalUnitId: row.parentOrganizationalUnitId,
      parentUnitName: row.parentOrganizationalUnitId
        ? unitNameById.get(row.parentOrganizationalUnitId) ?? null
        : null,
      isHeadOffice: row.isHeadOffice,
      phone: row.phone,
      email: row.email,
      partyAddressId: row.partyAddressId,
      partyAddressLabel,
      countryCode: row.countryCode,
      latitude: row.latitude,
      longitude: row.longitude,
      locationDisplay: formatLocationDisplay({
        countryCode: row.countryCode,
        latitude: row.latitude,
        longitude: row.longitude,
        partyAddressLabel,
      }),
      statusCode,
      openingDate: row.openingDate,
      closingDate: row.closingDate,
      notes: row.notes,
    };
  }
}

export function createOrganizationalUnitService(): OrganizationalUnitService {
  return new OrganizationalUnitService();
}
