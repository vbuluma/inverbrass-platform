/**
 * Purpose:
 * IP-10 downstream commercial contract service.
 * Consumes validated IP-06 snapshot + IP-07 expected amount; never recalculates.
 *
 * Architecture:
 *   Downstream request
 *           ↓
 *   CommercialContractService (IP-10)
 *           ↓
 *   IP-09 validation + IP-06 snapshot + IP-07 expected
 *           ↓
 *   CommercialTransactionContract
 *
 * Implementation Package:
 * BP-005 / IP-10 – Downstream Commercial Contract & Integration
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  assertCommercialSnapshotValid,
  computeCommercialIntegrityHash,
} from "@/modules/commercial/services/commercial-snapshot-rules";
import {
  assertContractMatchesSnapshot,
  assertExpectedMatchesSnapshot,
  buildCommercialTransactionContract,
} from "@/modules/commercial/services/commercial-contract-rules";
import {
  createExpectedCommercialAmountService,
  ExpectedCommercialAmountService,
} from "@/modules/commercial/services/expected-commercial-amount-service";
import {
  CommercialValidationService,
  createCommercialValidationService,
} from "@/modules/commercial/services/commercial-validation-service";
import type {
  CommercialSnapshot,
  CommercialTransactionContract,
  ConsumeCommercialContractRequest,
  ExpectedCommercialAmount,
  ValidateCommercialContractRequest,
} from "@/modules/commercial/types";

export class CommercialContractService {
  constructor(
    private readonly expectedAmountService: ExpectedCommercialAmountService =
      createExpectedCommercialAmountService(),
    private readonly validation: CommercialValidationService =
      createCommercialValidationService()
  ) {}

  /**
   * Build the authoritative downstream contract from a frozen snapshot.
   * Does not mutate the snapshot or invent amounts.
   */
  getCommercialContract(
    context: CurrentBusinessContext,
    request: ConsumeCommercialContractRequest
  ): CommercialTransactionContract {
    return this.consumeCommercialContract(context, request);
  }

  /**
   * Idempotent consumption: same businessId + snapshot → same commercial identity.
   * consumerRef / consumedAt may differ; monetary fields and contractId do not.
   */
  consumeCommercialContract(
    context: CurrentBusinessContext,
    request: ConsumeCommercialContractRequest
  ): CommercialTransactionContract {
    this.assertBusinessScope(context, request.businessId);
    const snapshot = this.requireValidSnapshot(request.snapshot, context);

    // IP-09 post-validate — invalid commercial state cannot enter the contract.
    this.validation.assertPostValidateResolution(snapshot.resolution);

    const expected = this.resolveExpected(context, snapshot, request.expected);
    assertExpectedMatchesSnapshot(snapshot, expected);

    if (request.expectedCurrency?.trim()) {
      const wanted = request.expectedCurrency.trim().toUpperCase();
      if (wanted !== expected.currency.trim().toUpperCase()) {
        throw new CommercialError(
          "COMMERCIAL_CONTRACT_CURRENCY_MISMATCH",
          COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_CURRENCY_MISMATCH,
          409,
          "expectedCurrency",
          {
            requestedCurrency: wanted,
            contractCurrency: expected.currency,
          }
        );
      }
    }

    const fingerprint = this.validation.fingerprint(snapshot.resolution);

    return buildCommercialTransactionContract({
      snapshot,
      expected,
      determinismFingerprint: fingerprint,
      consumerRef: request.consumerRef ?? request.downstreamContextKey ?? null,
    });
  }

  /**
   * Re-validate a previously issued contract against optional snapshot.
   */
  validateCommercialContract(
    context: CurrentBusinessContext,
    request: ValidateCommercialContractRequest
  ): CommercialTransactionContract {
    this.assertBusinessScope(context, request.businessId);
    if (request.contract.identity.businessId !== context.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId"
      );
    }
    if (request.contract.status !== "VALIDATED") {
      throw new CommercialError(
        "COMMERCIAL_CONTRACT_INVALID",
        COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_INVALID,
        400,
        "status"
      );
    }
    if (request.snapshot) {
      const snapshot = this.requireValidSnapshot(request.snapshot, context);
      assertContractMatchesSnapshot(request.contract, snapshot);
      this.verifyCommercialContractIntegrity(context, request.contract, snapshot);
    }
    return request.contract;
  }

  verifyCommercialContractIntegrity(
    context: CurrentBusinessContext,
    contract: CommercialTransactionContract,
    snapshot: CommercialSnapshot
  ): true {
    this.assertBusinessScope(context, contract.identity.businessId);
    assertCommercialSnapshotValid(snapshot);
    const recomputed = computeCommercialIntegrityHash(snapshot.resolution);
    if (recomputed !== snapshot.integrityHash) {
      throw new CommercialError(
        "SNAPSHOT_INTEGRITY_FAILURE",
        COMMERCIAL_USER_MESSAGES.SNAPSHOT_INTEGRITY_FAILURE,
        409
      );
    }
    if (contract.integrity.snapshotIntegrityHash !== snapshot.integrityHash) {
      throw new CommercialError(
        "COMMERCIAL_CONTRACT_TAMPERED",
        COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
        409,
        "integrityHash"
      );
    }
    assertContractMatchesSnapshot(contract, snapshot);

    const payableScaledOk =
      Number(contract.commercial.expectedPayable) ===
      Number(snapshot.resolution.payable);
    if (!payableScaledOk) {
      throw new CommercialError(
        "COMMERCIAL_CONTRACT_TAMPERED",
        COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
        409,
        "expectedPayable"
      );
    }
    return true;
  }

  private resolveExpected(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot,
    provided?: ExpectedCommercialAmount | null
  ): ExpectedCommercialAmount {
    if (provided) {
      return provided;
    }
    return this.expectedAmountService.calculateExpectedAmount(context, snapshot);
  }

  private requireValidSnapshot(
    snapshot: CommercialSnapshot,
    context: CurrentBusinessContext
  ): CommercialSnapshot {
    if (!snapshot?.snapshotId?.trim()) {
      throw new CommercialError(
        "SNAPSHOT_NOT_FOUND",
        COMMERCIAL_USER_MESSAGES.SNAPSHOT_NOT_FOUND,
        404,
        "snapshotId"
      );
    }
    if (snapshot.businessId !== context.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId",
        {
          snapshotBusinessId: snapshot.businessId,
          contextBusinessId: context.businessId,
        }
      );
    }
    try {
      assertCommercialSnapshotValid(snapshot);
    } catch (error) {
      if (error instanceof CommercialError) {
        throw error;
      }
      throw new CommercialError(
        "INVALID_COMMERCIAL_SNAPSHOT",
        COMMERCIAL_USER_MESSAGES.INVALID_COMMERCIAL_SNAPSHOT,
        400
      );
    }
    const recomputed = computeCommercialIntegrityHash(snapshot.resolution);
    if (recomputed !== snapshot.integrityHash) {
      throw new CommercialError(
        "SNAPSHOT_INTEGRITY_FAILURE",
        COMMERCIAL_USER_MESSAGES.SNAPSHOT_INTEGRITY_FAILURE,
        409
      );
    }
    if (!snapshot.immutable) {
      throw new CommercialError(
        "COMMERCIAL_CONTRACT_STALE",
        COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_STALE,
        409
      );
    }
    return snapshot;
  }

  private assertBusinessScope(
    context: CurrentBusinessContext,
    businessId: string
  ): void {
    if (!businessId?.trim()) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        400,
        "businessId"
      );
    }
    if (businessId !== context.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId"
      );
    }
  }
}

export function createCommercialContractService() {
  return new CommercialContractService();
}
