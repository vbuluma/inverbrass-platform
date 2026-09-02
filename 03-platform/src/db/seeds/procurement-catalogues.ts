/**
 * Purpose:
 * Static catalogues for BP-009 IP-01 procurement relationship configuration.
 */

export const procurementSupplierCategories = [
  {
    code: "IT_HARDWARE",
    name: "IT Hardware",
    description: "Computers, devices, and related hardware.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "SOFTWARE",
    name: "Software",
    description: "Software licences and subscriptions.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "PROFESSIONAL_SERVICES",
    name: "Professional Services",
    description: "Consulting and professional services.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "CONSTRUCTION",
    name: "Construction",
    description: "Construction and works.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "LOGISTICS",
    name: "Logistics",
    description: "Transport, warehousing, and delivery.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "OFFICE_SUPPLIES",
    name: "Office Supplies",
    description: "Consumables and office materials.",
    displayOrder: 60,
    isActive: true,
  },
] as const;

export const procurementSupplierCapabilities = [
  {
    code: "SUPPLY",
    name: "Supply",
    description: "Supply goods or materials.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "INSTALLATION",
    name: "Installation",
    description: "Install supplied goods.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "MAINTENANCE",
    name: "Maintenance",
    description: "Maintain or support supplied goods.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "CONSULTING",
    name: "Consulting",
    description: "Advisory or consulting work.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "MANAGED_SERVICES",
    name: "Managed Services",
    description: "Ongoing managed service delivery.",
    displayOrder: 50,
    isActive: true,
  },
] as const;

export const procurementStatuses = [
  {
    code: "ACTIVE",
    name: "Active",
    description: "May participate in procurement subject to qualification.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "CONDITIONAL",
    name: "Conditional",
    description: "May participate with recorded restrictions.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "SUSPENDED",
    name: "Suspended",
    description: "Temporarily excluded from procurement.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "BLACKLISTED",
    name: "Blacklisted",
    description: "Excluded from procurement with a recorded reason.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "INACTIVE",
    name: "Inactive",
    description: "Procurement relationship is not currently in use.",
    displayOrder: 50,
    isActive: true,
  },
] as const;

export const procurementQualificationStatuses = [
  {
    code: "PENDING",
    name: "Pending",
    description: "Qualification has not been completed.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "QUALIFIED",
    name: "Qualified",
    description: "Qualification requirements have been met.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "CONDITIONAL",
    name: "Conditional",
    description: "Qualified with recorded conditions.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "FAILED",
    name: "Failed",
    description: "Qualification requirements were not met.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "EXPIRED",
    name: "Expired",
    description: "A previously valid qualification has expired.",
    displayOrder: 50,
    isActive: true,
  },
] as const;

export const procurementQualificationTypes = [
  {
    code: "GENERAL",
    name: "General",
    description: "General supplier qualification.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "TECHNICAL",
    name: "Technical",
    description: "Technical capability qualification.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "COMPLIANCE",
    name: "Compliance",
    description: "Regulatory or compliance qualification.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "FINANCIAL",
    name: "Financial",
    description: "Financial standing qualification.",
    displayOrder: 40,
    isActive: true,
  },
] as const;

export const procurementContractTypes = [
  {
    code: "FRAMEWORK_AGREEMENT",
    name: "Framework Agreement",
    description: "Master framework for call-off orders.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "MASTER_SERVICE_AGREEMENT",
    name: "Master Service Agreement",
    description: "Master services agreement.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "SUPPLY_AGREEMENT",
    name: "Supply Agreement",
    description: "Goods supply agreement.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "SERVICE_CONTRACT",
    name: "Service Contract",
    description: "Service delivery contract.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other contract type.",
    displayOrder: 90,
    isActive: true,
  },
] as const;

export const procurementExceptionTypes = [
  { code: "PRICE_VARIANCE", name: "Price variance", description: "Invoice or award price differs from PO.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 10, isActive: true },
  { code: "QUANTITY_VARIANCE", name: "Quantity variance", description: "Invoiced or received quantity differs from PO.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 20, isActive: true },
  { code: "PARTIAL_DELIVERY", name: "Partial delivery", description: "Only part of the order was delivered.", defaultSeverity: "MEDIUM", requiresApprovalOnClose: false, displayOrder: 30, isActive: true },
  { code: "OVER_DELIVERY", name: "Over-delivery", description: "More was received than ordered.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 40, isActive: true },
  { code: "UNDER_DELIVERY", name: "Under-delivery", description: "Less was received than ordered.", defaultSeverity: "MEDIUM", requiresApprovalOnClose: false, displayOrder: 50, isActive: true },
  { code: "DAMAGED_GOODS", name: "Damaged goods", description: "Goods arrived damaged.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 60, isActive: true },
  { code: "REJECTED_GOODS", name: "Rejected goods", description: "Delivery was rejected at receipt.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 70, isActive: true },
  { code: "MISSING_RECEIPT", name: "Missing receipt", description: "Invoice cannot be matched without a receipt.", defaultSeverity: "MEDIUM", requiresApprovalOnClose: false, displayOrder: 80, isActive: true },
  { code: "INVOICE_MISMATCH", name: "Invoice mismatch", description: "Invoice does not match PO or receipt.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 90, isActive: true },
  { code: "DUPLICATE_INVOICE", name: "Duplicate invoice", description: "Supplier invoice number already exists.", defaultSeverity: "CRITICAL", requiresApprovalOnClose: true, displayOrder: 100, isActive: true },
  { code: "EXPIRED_CONTRACT", name: "Expired contract", description: "Referenced contract has expired.", defaultSeverity: "MEDIUM", requiresApprovalOnClose: false, displayOrder: 110, isActive: true },
  { code: "PO_EXPIRY", name: "PO expiry", description: "Purchase order validity has expired.", defaultSeverity: "MEDIUM", requiresApprovalOnClose: false, displayOrder: 120, isActive: true },
  { code: "SUPPLIER_DISPUTE", name: "Supplier dispute", description: "Commercial dispute with supplier.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 130, isActive: true },
  { code: "LATE_DELIVERY", name: "Late delivery", description: "Delivery is overdue against promise.", defaultSeverity: "MEDIUM", requiresApprovalOnClose: false, displayOrder: 140, isActive: true },
  { code: "QUALITY_FAILURE", name: "Quality failure", description: "Inspection or quality check failed.", defaultSeverity: "HIGH", requiresApprovalOnClose: true, displayOrder: 150, isActive: true },
] as const;

export const procurementPerformanceMeasures = [
  { code: "DELIVERY_ON_TIME", name: "On-time delivery", description: "Receipt confirmed on or before promised date.", dimension: "DELIVERY", weight: "15", higherIsBetter: true, displayOrder: 10, isActive: true },
  { code: "DELIVERY_LATE", name: "Late delivery", description: "Receipt confirmed after promised date.", dimension: "DELIVERY", weight: "15", higherIsBetter: false, displayOrder: 20, isActive: true },
  { code: "FULFILMENT_PARTIAL", name: "Partial delivery", description: "Received quantity below PO line.", dimension: "FULFILMENT", weight: "10", higherIsBetter: false, displayOrder: 30, isActive: true },
  { code: "FULFILMENT_OVER", name: "Over-delivery", description: "Received quantity above PO line.", dimension: "FULFILMENT", weight: "10", higherIsBetter: false, displayOrder: 40, isActive: true },
  { code: "QUALITY_REJECTION", name: "Quality rejection", description: "Goods rejected or failed inspection.", dimension: "QUALITY", weight: "15", higherIsBetter: false, displayOrder: 50, isActive: true },
  { code: "INVOICE_VARIANCE", name: "Invoice variance", description: "Invoice match produced a variance.", dimension: "INVOICE_ACCURACY", weight: "15", higherIsBetter: false, displayOrder: 60, isActive: true },
  { code: "INVOICE_DUPLICATE", name: "Duplicate invoice", description: "Duplicate supplier invoice detected.", dimension: "INVOICE_ACCURACY", weight: "10", higherIsBetter: false, displayOrder: 70, isActive: true },
  { code: "DISPUTE_OPENED", name: "Dispute opened", description: "Procurement exception raised.", dimension: "DISPUTES", weight: "5", higherIsBetter: false, displayOrder: 80, isActive: true },
  { code: "DISPUTE_RESOLVED", name: "Dispute resolved", description: "Procurement exception closed.", dimension: "DISPUTES", weight: "5", higherIsBetter: true, displayOrder: 90, isActive: true },
  { code: "PO_ISSUED", name: "PO issued", description: "Purchase order issued to supplier.", dimension: "SERVICE", weight: "5", higherIsBetter: true, displayOrder: 100, isActive: true },
] as const;
