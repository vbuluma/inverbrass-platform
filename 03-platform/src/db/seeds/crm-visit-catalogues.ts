/** Default CRM Visit metadata catalogues — BP-004 / IP-07 */

export const crmVisitTypes = [
  { code: "SALES", name: "Sales Visit", displayOrder: 10 },
  { code: "SITE_AUDIT", name: "Site Audit", displayOrder: 20 },
  { code: "EXECUTIVE", name: "Executive Call", displayOrder: 30 },
  { code: "COMPLAINT", name: "Complaint Visit", displayOrder: 40 },
  { code: "TECHNICAL", name: "Technical Visit", displayOrder: 50 },
  { code: "INSPECTION", name: "Inspection", displayOrder: 60 },
  { code: "RELATIONSHIP", name: "Relationship Visit", displayOrder: 70 },
  { code: "FOLLOW_UP", name: "Follow-up Visit", displayOrder: 80 },
  { code: "VIRTUAL", name: "Virtual Visit", displayOrder: 90 },
  { code: "PHONE", name: "Phone Call Report", displayOrder: 100 },
] as const;

export const crmVisitStatuses = [
  { code: "DRAFT", name: "Draft", isTerminal: false, isEditable: true, displayOrder: 10 },
  { code: "IN_PROGRESS", name: "In Progress", isTerminal: false, isEditable: true, displayOrder: 20 },
  { code: "SUBMITTED", name: "Submitted", isTerminal: false, isEditable: false, displayOrder: 30 },
  { code: "RETURNED", name: "Returned", isTerminal: false, isEditable: true, displayOrder: 40 },
  { code: "APPROVED", name: "Approved", isTerminal: true, isEditable: false, displayOrder: 50 },
  { code: "REJECTED", name: "Rejected", isTerminal: true, isEditable: false, displayOrder: 60 },
  { code: "CANCELLED", name: "Cancelled", isTerminal: true, isEditable: false, displayOrder: 70 },
] as const;
