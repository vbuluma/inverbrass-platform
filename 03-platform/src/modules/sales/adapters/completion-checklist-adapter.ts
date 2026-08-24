/**
 * Purpose:
 * Consume the ENG-003l checklist contract for sales completion readiness.
 * Evaluates metadata-style completion items from IP-02 facts — does not
 * create a second checklist engine or persist checklist tables.
 *
 * Implementation Package:
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 */

import { SALES_COMPLETION_BLOCKER_CODES } from "@/modules/sales/constants";
import type {
  CompletionChecklistFacts,
  CompletionChecklistItem,
  CompletionChecklistPort,
  CompletionChecklistResult,
} from "@/modules/sales/ports";

const DEFAULT_ITEMS: Array<{
  code: string;
  name: string;
  blockerCode: string;
  fact: keyof CompletionChecklistFacts;
}> = [
  {
    code: "OUTSTANDING_CLEARED",
    name: "Outstanding quantity cleared",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.OUTSTANDING_QUANTITY,
    fact: "outstandingQuantity",
  },
  {
    code: "INSPECTION_COMPLETE",
    name: "Required inspection complete",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.INSPECTION_PENDING,
    fact: "inspectionPending",
  },
  {
    code: "INSPECTION_PASSED",
    name: "Inspection passed",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.INSPECTION_FAILED,
    fact: "inspectionFailed",
  },
  {
    code: "SERVICE_COMPLETE",
    name: "Required service complete",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.SERVICE_INCOMPLETE,
    fact: "serviceIncomplete",
  },
  {
    code: "REJECTED_DISPOSED",
    name: "Rejected quantity decided",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.DISPOSITION_REQUIRED,
    fact: "dispositionRequired",
  },
  {
    code: "EVIDENCE_PRESENT",
    name: "Required evidence present",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.EVIDENCE_MISSING,
    fact: "evidenceMissing",
  },
  {
    code: "ACCEPTED_WITHIN_ORDERED",
    name: "Accepted quantity within ordered",
    blockerCode: SALES_COMPLETION_BLOCKER_CODES.ACCEPTED_EXCEEDS_ORDERED,
    fact: "acceptedExceedsOrdered",
  },
];

function factFailed(facts: CompletionChecklistFacts, key: keyof CompletionChecklistFacts): boolean {
  const value = facts[key];
  if (typeof value === "number") {
    return value > 0;
  }
  return Boolean(value);
}

export class SalesCompletionChecklistAdapter implements CompletionChecklistPort {
  async evaluate(facts: CompletionChecklistFacts): Promise<CompletionChecklistResult> {
    const items: CompletionChecklistItem[] = DEFAULT_ITEMS.map((definition) => {
      const failed = factFailed(facts, definition.fact);
      return {
        code: definition.code,
        name: definition.name,
        mandatory: true,
        passed: !failed,
        blockerCode: failed ? definition.blockerCode : null,
        detail: failed ? definition.name : null,
      };
    });
    const blockers = items
      .filter((item) => !item.passed && item.blockerCode)
      .map((item) => item.blockerCode as string);
    return {
      passed: blockers.length === 0,
      blockers,
      items,
    };
  }
}

export class InjectedCompletionChecklistAdapter implements CompletionChecklistPort {
  constructor(private readonly result: CompletionChecklistResult) {}

  async evaluate(): Promise<CompletionChecklistResult> {
    return this.result;
  }
}

export function createSalesCompletionChecklistAdapter() {
  return new SalesCompletionChecklistAdapter();
}
