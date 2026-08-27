/**
 * ENG-003k — Industry-native commercial / operations labels.
 */

export type OperationsTerminology = {
  invoice: string;
  fees: string;
  rent: string;
  bill: string;
  payment: string;
  receipt: string;
  sales: string;
  booking: string;
  reservation: string;
  appointment: string;
  treatment: string;
  inventory: string;
};

const DEFAULT_OPERATIONS_TERMINOLOGY: OperationsTerminology = {
  invoice: "Invoice",
  fees: "Fees",
  rent: "Rent",
  bill: "Bill",
  payment: "Payment",
  receipt: "Receipt",
  sales: "Sales",
  booking: "Booking",
  reservation: "Reservation",
  appointment: "Appointment",
  treatment: "Treatment",
  inventory: "Inventory",
};

const INDUSTRY_OPERATIONS_PROFILES: Partial<
  Record<string, Partial<OperationsTerminology>>
> = {
  EDUCATION: {
    fees: "Fees",
    invoice: "Fee Invoice",
    payment: "Fee Payment",
    receipt: "Fee Receipt",
  },
  PROPERTY: {
    rent: "Rent",
    invoice: "Rent Invoice",
    payment: "Rent Payment",
    receipt: "Rent Receipt",
    bill: "Rent Bill",
  },
  HEALTHCARE: {
    appointment: "Appointment",
    treatment: "Treatment",
    fees: "Consultation Fees",
    invoice: "Medical Invoice",
  },
  COMMERCE: {
    sales: "Sales",
    inventory: "Inventory",
    receipt: "Sales Receipt",
  },
  HOSPITALITY: {
    booking: "Booking",
    reservation: "Reservation",
    sales: "Sales",
  },
  PROFESSIONAL: {
    booking: "Booking",
    appointment: "Appointment",
    fees: "Professional Fees",
  },
  FINANCIAL: {
    payment: "Payment",
    fees: "Service Fees",
  },
};

export function resolveOperationsTerminology(
  industryCode: string | null | undefined
): OperationsTerminology {
  if (!industryCode) {
    return DEFAULT_OPERATIONS_TERMINOLOGY;
  }
  return {
    ...DEFAULT_OPERATIONS_TERMINOLOGY,
    ...INDUSTRY_OPERATIONS_PROFILES[industryCode],
  };
}
