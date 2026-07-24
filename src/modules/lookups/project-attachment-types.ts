export const PROJECT_ATTACHMENT_TYPES = [
  { id: 1, docTypeName: "system_diagram" },
  { id: 2, docTypeName: "network_diagram" },
  { id: 3, docTypeName: "use_case_diagram" },
  { id: 4, docTypeName: "security_diagram" },
  { id: 5, docTypeName: "presentation" },
  { id: 6, docTypeName: "report" },
  { id: 7, docTypeName: "ใบเบิกเงิน" },
  { id: 8, docTypeName: "other" },
  { id: 9, docTypeName: "quotation" },
  { id: 10, docTypeName: "one_page_summary" },
  { id: 11, docTypeName: "approval_document" },
  { id: 12, docTypeName: "bma_dc_usage" },
] as const;

export const PROJECT_ATTACHMENT_TYPE_LABELS = {
  system_diagram: "System Diagram",
  network_diagram: "Network Diagram",
  use_case_diagram: "Use Case Diagram",
  security_diagram: "Security Diagram",
  presentation: "Presentation",
  report: "Report",
  quotation: "Quotation",
  one_page_summary: "One Page Summary",
  approval_document: "Approval Document",
  bma_dc_usage: "การใช้ BMA DC",
  other: "Other Documents",
  "ใบเบิกเงิน": "ใบเบิกเงิน",
} as const;

export type ProjectAttachmentTypeName = keyof typeof PROJECT_ATTACHMENT_TYPE_LABELS;

export function getProjectAttachmentTypeLabel(name: string) {
  return PROJECT_ATTACHMENT_TYPE_LABELS[name as ProjectAttachmentTypeName] ?? name;
}
