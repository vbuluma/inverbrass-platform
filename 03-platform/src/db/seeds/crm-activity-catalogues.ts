/**
 * Static seed data for CRM Activity metadata catalogues.
 * BP-004 / IP-05
 */

export const crmActivityTypes = [
  { code: "CALL", name: "Call", displayOrder: 10, requiresCompletionNotes: false },
  { code: "MEETING", name: "Meeting", displayOrder: 20, requiresCompletionNotes: false },
  { code: "VISIT", name: "Visit", displayOrder: 30, requiresCompletionNotes: true },
  { code: "TASK", name: "Task", displayOrder: 40, requiresCompletionNotes: false },
  { code: "FOLLOW_UP", name: "Follow-up", displayOrder: 50, requiresCompletionNotes: false },
  { code: "EMAIL", name: "Email", displayOrder: 60, requiresCompletionNotes: false },
  { code: "REMINDER", name: "Reminder", displayOrder: 70, requiresCompletionNotes: false },
  {
    code: "DOCUMENT_REVIEW",
    name: "Document Review",
    displayOrder: 80,
    requiresCompletionNotes: true,
  },
  { code: "APPROVAL", name: "Approval", displayOrder: 90, requiresCompletionNotes: true },
  { code: "NOTE", name: "Note", displayOrder: 100, requiresCompletionNotes: false },
  { code: "OTHER", name: "Other", displayOrder: 110, requiresCompletionNotes: true },
] as const;

export const crmActivityStatuses = [
  { code: "PLANNED", name: "Planned", isTerminal: false, isEditable: true, displayOrder: 10 },
  { code: "ASSIGNED", name: "Assigned", isTerminal: false, isEditable: true, displayOrder: 20 },
  {
    code: "IN_PROGRESS",
    name: "In Progress",
    isTerminal: false,
    isEditable: true,
    displayOrder: 30,
  },
  { code: "WAITING", name: "Waiting", isTerminal: false, isEditable: true, displayOrder: 40 },
  { code: "COMPLETED", name: "Completed", isTerminal: true, isEditable: false, displayOrder: 50 },
  { code: "CANCELLED", name: "Cancelled", isTerminal: true, isEditable: false, displayOrder: 60 },
  { code: "DEFERRED", name: "Deferred", isTerminal: false, isEditable: true, displayOrder: 70 },
] as const;

export const crmActivityPriorities = [
  { code: "LOW", name: "Low", displayOrder: 10 },
  { code: "NORMAL", name: "Normal", displayOrder: 20 },
  { code: "HIGH", name: "High", displayOrder: 30 },
  { code: "URGENT", name: "Urgent", displayOrder: 40 },
] as const;
