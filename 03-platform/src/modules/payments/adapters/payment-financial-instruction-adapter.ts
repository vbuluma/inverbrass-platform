/**
 * Purpose:
 * Optional BP-006 financial-instruction lookup for IP-06. Does not own
 * the sales return workflow.
 *
 * Implementation Package:
 * BP-007 / IP-06 – Refunds, Reversals & Adjustments
 */

import type { PaymentFinancialInstructionPort } from "@/modules/payments/ports";
import type { RefundFinancialInstruction } from "@/modules/payments/types";

export class InMemoryFinancialInstructionAdapter implements PaymentFinancialInstructionPort {
  readonly instructions = new Map<string, RefundFinancialInstruction>();

  seed(instruction: RefundFinancialInstruction) {
    this.instructions.set(instruction.id, { ...instruction });
  }

  async getById(businessId: string, instructionId: string) {
    const row = this.instructions.get(instructionId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return { ...row };
  }
}

export function createNoopFinancialInstructionAdapter(): PaymentFinancialInstructionPort {
  return {
    async getById() {
      return null;
    },
  };
}
