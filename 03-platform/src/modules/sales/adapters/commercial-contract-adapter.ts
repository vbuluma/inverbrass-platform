/**
 * Purpose:
 * Consume / validate / verify BP-005 CommercialTransactionContract.
 * Never queries pricing_item or recalculates tax, discount, or commission.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createCommercialContractService,
  createCommercialResolutionService,
  createDownstreamCommercialContractAdapter,
  type CommercialSnapshot,
  type CommercialTransactionContract,
  type ExpectedCommercialAmount,
} from "@/modules/commercial";
import type {
  CommercialContractPort,
  CommercialResolvePort,
} from "@/modules/sales/ports";
import type { ConsumedCommercialResult } from "@/modules/sales/types";

export class SalesCommercialContractAdapter implements CommercialContractPort {
  constructor(
    private readonly adapter = createDownstreamCommercialContractAdapter(),
    private readonly contractService = createCommercialContractService()
  ) {}

  consumeFromSnapshot(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot,
    options?: {
      expected?: ExpectedCommercialAmount | null;
      expectedCurrency?: string | null;
      consumerRef?: string | null;
    }
  ): CommercialTransactionContract {
    return this.adapter.consumeFromSnapshot(context, snapshot, options);
  }

  validate(
    context: CurrentBusinessContext,
    contract: CommercialTransactionContract,
    snapshot?: CommercialSnapshot | null
  ): CommercialTransactionContract {
    return this.adapter.validate(context, contract, snapshot);
  }

  verifyIntegrity(
    context: CurrentBusinessContext,
    contract: CommercialTransactionContract,
    snapshot: CommercialSnapshot
  ): true {
    return this.contractService.verifyCommercialContractIntegrity(
      context,
      contract,
      snapshot
    );
  }
}

export class Bp005CommercialResolveAdapter implements CommercialResolvePort {
  constructor(
    private readonly resolution = createCommercialResolutionService(),
    private readonly contracts = new SalesCommercialContractAdapter()
  ) {}

  async resolveAndConsume(
    context: CurrentBusinessContext,
    input: {
      offeringId: string;
      partyId: string;
      currencyCode: string;
      quantity: number;
      consumerRef?: string | null;
    }
  ): Promise<ConsumedCommercialResult> {
    const pipeline = await this.resolution.resolveExpectedAmount(context, {
      businessId: context.businessId,
      offeringId: input.offeringId,
      partyId: input.partyId,
      currencyCode: input.currencyCode,
      quantity: input.quantity,
    });
    const contract = this.contracts.consumeFromSnapshot(context, pipeline.snapshot, {
      expected: pipeline.expected,
      expectedCurrency: input.currencyCode,
      consumerRef: input.consumerRef ?? null,
    });
    return {
      snapshot: pipeline.snapshot,
      expected: pipeline.expected,
      contract,
    };
  }
}

export function createSalesCommercialContractAdapter() {
  return new SalesCommercialContractAdapter();
}

export function createBp005CommercialResolveAdapter() {
  return new Bp005CommercialResolveAdapter();
}
