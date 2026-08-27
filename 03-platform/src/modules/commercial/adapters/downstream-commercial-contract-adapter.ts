/**
 * Purpose:
 * Downstream integration adapter for future BP-006 / BP-007 / RA consumers.
 * Routes through IP-10 CommercialContractService only — never BP-003 / tax engines.
 *
 * Implementation Package:
 * BP-005 / IP-10 – Downstream Commercial Contract & Integration
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  CommercialContractService,
  createCommercialContractService,
} from "@/modules/commercial/services/commercial-contract-service";
import type {
  CommercialSnapshot,
  CommercialTransactionContract,
  ConsumeCommercialContractRequest,
  ExpectedCommercialAmount,
} from "@/modules/commercial/types";

/**
 * Adapter boundary for future transaction Build Packs.
 * Consumers must call this (or CommercialContractService) instead of
 * BasePriceResolutionService / TaxResolutionService / CompositionService.
 */
export class DownstreamCommercialContractAdapter {
  constructor(
    private readonly contractService: CommercialContractService =
      createCommercialContractService()
  ) {}

  consume(
    context: CurrentBusinessContext,
    request: ConsumeCommercialContractRequest
  ): CommercialTransactionContract {
    return this.contractService.consumeCommercialContract(context, request);
  }

  consumeFromSnapshot(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot,
    options?: {
      expected?: ExpectedCommercialAmount | null;
      expectedCurrency?: string | null;
      consumerRef?: string | null;
      downstreamContextKey?: string | null;
    }
  ): CommercialTransactionContract {
    return this.contractService.consumeCommercialContract(context, {
      businessId: context.businessId,
      snapshot,
      expected: options?.expected,
      expectedCurrency: options?.expectedCurrency,
      consumerRef: options?.consumerRef,
      downstreamContextKey: options?.downstreamContextKey,
    });
  }

  validate(
    context: CurrentBusinessContext,
    contract: CommercialTransactionContract,
    snapshot?: CommercialSnapshot | null
  ): CommercialTransactionContract {
    return this.contractService.validateCommercialContract(context, {
      businessId: context.businessId,
      contract,
      snapshot,
    });
  }
}

export function createDownstreamCommercialContractAdapter() {
  return new DownstreamCommercialContractAdapter();
}
