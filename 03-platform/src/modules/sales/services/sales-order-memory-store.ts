/**
 * Purpose:
 * In-memory sales order store for IP-01 smoke validation (mirrors commercial governance).
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

import type {
  OfferingLookupPort,
  OfferingLookupResult,
  PartyLookupPort,
  PartyLookupResult,
  QuotationLookupPort,
  QuotationLookupResult,
  SalesOrderCommercialLinkInsert,
  SalesOrderCommercialLinkRecord,
  SalesOrderInsert,
  SalesOrderLineInsert,
  SalesOrderLineRecord,
  SalesOrderRecord,
  SalesOrderRepositoryPort,
} from "@/modules/sales/ports";
import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";

function now() {
  return new Date();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemorySalesOrderStore implements SalesOrderRepositoryPort {
  readonly orders = new Map<string, SalesOrderRecord>();
  readonly lines = new Map<string, SalesOrderLineRecord[]>();
  readonly links = new Map<string, SalesOrderCommercialLinkRecord[]>();

  async insert(values: SalesOrderInsert): Promise<SalesOrderRecord> {
    const duplicate = [...this.orders.values()].find(
      (row) =>
        row.businessId === values.businessId &&
        row.orderNumber === values.orderNumber
    );
    if (duplicate) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_NUMBER_NOT_UNIQUE,
        undefined,
        409,
        { field: "orderNumber", entity: "sale" }
      );
    }
    const id = values.id ?? crypto.randomUUID();
    const timestamp = now();
    const row: SalesOrderRecord = {
      ...values,
      id,
      completionRequiresSod: values.completionRequiresSod ?? true,
      completionSubmittedBy: values.completionSubmittedBy ?? null,
      completionSubmittedAt: values.completionSubmittedAt ?? null,
      completedBy: values.completedBy ?? null,
      completedAt: values.completedAt ?? null,
      completionRejectedBy: values.completionRejectedBy ?? null,
      completionRejectedAt: values.completionRejectedAt ?? null,
      completionRejectedReason: values.completionRejectedReason ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    this.orders.set(id, row);
    this.lines.set(id, []);
    this.links.set(id, []);
    return clone(row);
  }

  async update(
    businessId: string,
    orderId: string,
    values: Partial<SalesOrderRecord>
  ): Promise<SalesOrderRecord> {
    const existing = await this.findById(businessId, orderId);
    if (!existing) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    const next: SalesOrderRecord = {
      ...existing,
      ...values,
      id: existing.id,
      businessId: existing.businessId,
      updatedAt: now(),
      version: existing.version + 1,
    };
    this.orders.set(orderId, next);
    return clone(next);
  }

  async replaceLines(
    businessId: string,
    orderId: string,
    lines: SalesOrderLineInsert[]
  ): Promise<SalesOrderLineRecord[]> {
    const existing = await this.findById(businessId, orderId);
    if (!existing) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    const timestamp = now();
    const stored = lines.map((line, index) => ({
      ...line,
      id: line.id ?? crypto.randomUUID(),
      businessId,
      salesOrderId: orderId,
      lineNumber: line.lineNumber ?? index + 1,
      createdAt: timestamp,
    }));
    this.lines.set(orderId, stored);
    return clone(stored);
  }

  async replaceCommercialLinks(
    businessId: string,
    orderId: string,
    links: SalesOrderCommercialLinkInsert[]
  ): Promise<SalesOrderCommercialLinkRecord[]> {
    const existing = await this.findById(businessId, orderId);
    if (!existing) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    const timestamp = now();
    const stored = links.map((link) => ({
      ...link,
      id: link.id ?? crypto.randomUUID(),
      businessId,
      salesOrderId: orderId,
      consumedAt: link.consumedAt ?? timestamp,
      createdAt: timestamp,
    }));
    this.links.set(orderId, stored);
    return clone(stored);
  }

  async findById(businessId: string, orderId: string) {
    const row = this.orders.get(orderId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findByOrderNumber(businessId: string, orderNumber: string) {
    const row = [...this.orders.values()].find(
      (item) => item.businessId === businessId && item.orderNumber === orderNumber
    );
    return row ? clone(row) : null;
  }

  async findByQuotationId(businessId: string, quotationId: string) {
    const row = [...this.orders.values()].find(
      (item) => item.businessId === businessId && item.quotationId === quotationId
    );
    return row ? clone(row) : null;
  }

  async listByBusiness(businessId: string) {
    return [...this.orders.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async countAll(businessId: string) {
    return [...this.orders.values()].filter((row) => row.businessId === businessId)
      .length;
  }

  async listLines(businessId: string, orderId: string) {
    const order = await this.findById(businessId, orderId);
    if (!order) {
      return [];
    }
    return clone(this.lines.get(orderId) ?? []);
  }

  async listCommercialLinks(businessId: string, orderId: string) {
    const order = await this.findById(businessId, orderId);
    if (!order) {
      return [];
    }
    return clone(this.links.get(orderId) ?? []);
  }

  async updateLine(
    businessId: string,
    lineId: string,
    values: Partial<SalesOrderLineRecord>
  ) {
    for (const [orderId, lines] of this.lines.entries()) {
      const index = lines.findIndex(
        (line) => line.id === lineId && line.businessId === businessId
      );
      if (index < 0) {
        continue;
      }
      const next = { ...lines[index]!, ...values, id: lineId, businessId };
      const copy = [...lines];
      copy[index] = next;
      this.lines.set(orderId, copy);
      return clone(next);
    }
    throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
  }

  async updateCommercialLink(
    businessId: string,
    linkId: string,
    values: Partial<SalesOrderCommercialLinkRecord>
  ) {
    for (const [orderId, links] of this.links.entries()) {
      const index = links.findIndex(
        (link) => link.id === linkId && link.businessId === businessId
      );
      if (index < 0) {
        continue;
      }
      const next = { ...links[index]!, ...values, id: linkId, businessId };
      const copy = [...links];
      copy[index] = next;
      this.links.set(orderId, copy);
      return clone(next);
    }
    throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
  }
}

export class InMemoryPartyLookup implements PartyLookupPort {
  constructor(private readonly parties: PartyLookupResult[]) {}

  async findInBusiness(businessId: string, partyId: string) {
    return (
      this.parties.find(
        (party) => party.businessId === businessId && party.id === partyId
      ) ?? null
    );
  }
}

export class InMemoryOfferingLookup implements OfferingLookupPort {
  constructor(private readonly offerings: OfferingLookupResult[]) {}

  async findInBusiness(businessId: string, offeringId: string) {
    return (
      this.offerings.find(
        (offering) =>
          offering.businessId === businessId && offering.id === offeringId
      ) ?? null
    );
  }
}

export class InMemoryQuotationLookup implements QuotationLookupPort {
  constructor(private readonly quotations: QuotationLookupResult[]) {}

  async findInBusiness(businessId: string, quotationId: string) {
    return (
      this.quotations.find(
        (quotation) =>
          quotation.businessId === businessId && quotation.id === quotationId
      ) ?? null
    );
  }
}

export function createInMemorySalesOrderStore() {
  return new InMemorySalesOrderStore();
}
