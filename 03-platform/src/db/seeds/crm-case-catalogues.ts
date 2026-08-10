/** Default CRM Case metadata catalogues — BP-004 / IP-09 */

export const crmCaseTypes = [
  { code: "ENQUIRY", name: "Enquiry", description: "General customer enquiry", displayOrder: 10 },
  { code: "COMPLAINT", name: "Complaint", description: "Customer complaint", displayOrder: 20 },
  { code: "FEEDBACK", name: "Feedback", description: "Customer feedback", displayOrder: 30 },
  {
    code: "SERVICE_REQUEST",
    name: "Service Request",
    description: "Service or support request",
    displayOrder: 40,
  },
  { code: "QUERY", name: "Query", description: "Information query", displayOrder: 50 },
  { code: "INCIDENT", name: "Incident", description: "Service incident", displayOrder: 60 },
  {
    code: "INVESTIGATION",
    name: "Investigation",
    description: "Investigation case",
    displayOrder: 70,
  },
  { code: "FOLLOW_UP", name: "Follow-up", description: "Follow-up case", displayOrder: 80 },
] as const;

export const crmCaseStatuses = [
  {
    code: "NEW",
    name: "New",
    isTerminal: false,
    isEditable: true,
    pausesSla: false,
    displayOrder: 10,
  },
  {
    code: "OPEN",
    name: "Open",
    isTerminal: false,
    isEditable: true,
    pausesSla: false,
    displayOrder: 20,
  },
  {
    code: "PENDING_CUSTOMER",
    name: "Pending Customer",
    isTerminal: false,
    isEditable: true,
    pausesSla: true,
    displayOrder: 30,
  },
  {
    code: "ESCALATED",
    name: "Escalated",
    isTerminal: false,
    isEditable: true,
    pausesSla: false,
    displayOrder: 40,
  },
  {
    code: "RESOLVED",
    name: "Resolved",
    isTerminal: true,
    isEditable: true,
    pausesSla: false,
    displayOrder: 50,
  },
  {
    code: "CLOSED",
    name: "Closed",
    isTerminal: true,
    isEditable: false,
    pausesSla: false,
    displayOrder: 60,
  },
] as const;

export const crmCasePriorities = [
  {
    code: "LOW",
    name: "Low",
    displayOrder: 10,
    firstResponseTargetHours: 48,
    resolutionTargetHours: 168,
  },
  {
    code: "NORMAL",
    name: "Normal",
    displayOrder: 20,
    firstResponseTargetHours: 24,
    resolutionTargetHours: 72,
  },
  {
    code: "HIGH",
    name: "High",
    displayOrder: 30,
    firstResponseTargetHours: 8,
    resolutionTargetHours: 24,
  },
  {
    code: "CRITICAL",
    name: "Critical",
    displayOrder: 40,
    firstResponseTargetHours: 2,
    resolutionTargetHours: 8,
  },
] as const;

export const crmCaseSeverities = [
  {
    code: "LOW",
    name: "Low",
    requiresImmediateOwner: false,
    displayOrder: 10,
  },
  {
    code: "MEDIUM",
    name: "Medium",
    requiresImmediateOwner: false,
    displayOrder: 20,
  },
  {
    code: "HIGH",
    name: "High",
    requiresImmediateOwner: true,
    displayOrder: 30,
  },
  {
    code: "CRITICAL",
    name: "Critical",
    requiresImmediateOwner: true,
    displayOrder: 40,
  },
] as const;

export const crmCaseResolutionCodes = [
  {
    code: "RESOLVED_SATISFIED",
    name: "Resolved — Satisfied",
    description: "Issue resolved to customer satisfaction",
    displayOrder: 10,
  },
  {
    code: "RESOLVED_WORKAROUND",
    name: "Resolved — Workaround",
    description: "Workaround provided",
    displayOrder: 20,
  },
  {
    code: "UNABLE_TO_RESOLVE",
    name: "Unable to Resolve",
    description: "Could not resolve the issue",
    displayOrder: 30,
  },
  {
    code: "DUPLICATE",
    name: "Duplicate",
    description: "Duplicate of another case",
    displayOrder: 40,
  },
  {
    code: "WITHDRAWN",
    name: "Withdrawn",
    description: "Customer withdrew the request",
    displayOrder: 50,
  },
  {
    code: "INFORMATION_PROVIDED",
    name: "Information Provided",
    description: "Information provided; no further action",
    displayOrder: 60,
  },
] as const;
