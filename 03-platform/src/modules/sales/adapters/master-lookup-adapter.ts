/**
 * Purpose:
 * Tenant-scoped lookups for customers, offerings, and quotations.
 * BP-006 reads these masters — it does not create them.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { PRODUCT_TYPE_CODES } from "@/modules/product/constants";
import { createQuotationLineRepository } from "@/modules/crm/quotation/repositories/quotation-line-repository";
import { createQuotationRepository } from "@/modules/crm/quotation/repositories/quotation-repository";
import { createQuotationVersionRepository } from "@/modules/crm/quotation/repositories/quotation-version-repository";
import type {
  OfferingLookupPort,
  OfferingLookupResult,
  PartyLookupPort,
  PartyLookupResult,
  QuotationLookupPort,
  QuotationLookupResult,
} from "@/modules/sales/ports";

export class PartyLookupAdapter implements PartyLookupPort {
  constructor(private readonly parties = createPartyRepository()) {}

  async findInBusiness(
    businessId: string,
    partyId: string
  ): Promise<PartyLookupResult | null> {
    const row = await this.parties.findById(businessId, partyId);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      businessId: row.businessId,
      displayName: row.displayName,
    };
  }
}

export class OfferingLookupAdapter implements OfferingLookupPort {
  constructor(private readonly products = createProductRepository()) {}

  async findInBusiness(
    businessId: string,
    offeringId: string
  ): Promise<OfferingLookupResult | null> {
    const row = await this.products.findById(businessId, offeringId);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      businessId: row.businessId,
      productCode: row.productCode,
      productName: row.productName,
      productTypeCode: row.productTypeCode ?? PRODUCT_TYPE_CODES.OTHER,
    };
  }
}

export class QuotationLookupAdapter implements QuotationLookupPort {
  constructor(
    private readonly quotations = createQuotationRepository(),
    private readonly versions = createQuotationVersionRepository(),
    private readonly lines = createQuotationLineRepository()
  ) {}

  async findInBusiness(
    businessId: string,
    quotationId: string
  ): Promise<QuotationLookupResult | null> {
    const quotation = await this.quotations.findById(businessId, quotationId);
    if (!quotation) {
      return null;
    }
    const version = await this.versions.findByQuotationAndNumber(
      businessId,
      quotationId,
      quotation.currentVersionNumber
    );
    const lineRows = version
      ? await this.lines.listByVersionIdWithRelations(businessId, version.id)
      : [];
    return {
      id: quotation.id,
      businessId: quotation.businessId,
      quotationNumber: quotation.quotationNumber,
      status: quotation.status,
      validUntil: quotation.validUntil,
      partyId: quotation.partyId,
      crmRecordId: quotation.crmRecordId,
      accountId: quotation.accountId,
      opportunityId: quotation.opportunityId,
      currencyCode: quotation.currencyCode,
      currentVersionId: version?.id ?? null,
      currentVersionNumber: quotation.currentVersionNumber,
      lines: lineRows.map(({ line }) => ({
        id: line.id,
        offeringId: line.offeringId,
        description: line.description,
        quantity: Number(line.quantity),
        lineNumber: line.lineNumber,
      })),
    };
  }
}

export function createPartyLookupAdapter() {
  return new PartyLookupAdapter();
}

export function createOfferingLookupAdapter() {
  return new OfferingLookupAdapter();
}

export function createQuotationLookupAdapter() {
  return new QuotationLookupAdapter();
}
