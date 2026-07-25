/**
 * Purpose:
 * Configurable branch-type catalogue used during Business Setup.
 *
 * Design rationale:
 * Branch types are configuration codes — not hardcoded UI enums scattered
 * across components — so catalogues can evolve without redesign.
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

export const BRANCH_TYPES = {
  HEAD_OFFICE: "HEAD_OFFICE",
  OUTLET: "OUTLET",
  WAREHOUSE: "WAREHOUSE",
  OTHER: "OTHER",
} as const;

export type BranchType = (typeof BRANCH_TYPES)[keyof typeof BRANCH_TYPES];

export const BRANCH_TYPE_OPTIONS: ReadonlyArray<{
  code: BranchType;
  label: string;
}> = [
  { code: BRANCH_TYPES.HEAD_OFFICE, label: "Head Office" },
  { code: BRANCH_TYPES.OUTLET, label: "Outlet" },
  { code: BRANCH_TYPES.WAREHOUSE, label: "Warehouse" },
  { code: BRANCH_TYPES.OTHER, label: "Other" },
];

export function isBranchType(value: string): value is BranchType {
  return Object.values(BRANCH_TYPES).includes(value as BranchType);
}
