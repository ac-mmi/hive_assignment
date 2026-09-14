export const COMMENT_TYPES = ["info", "limit", "defect"] as const;
export type CommentType = (typeof COMMENT_TYPES)[number];

export const ANSWER_TYPES = [
  "boolean",
  "checkbox",
  "date",
  "number",
  "range",
  "text",
] as const;
export type AnswerType = (typeof ANSWER_TYPES)[number];

export const ISSUE_SEVERITIES = ["warning", "unsupported"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const SUPPORT_STATUSES = ["full", "partial"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export type PhotoSlot = {
  index: number;
  photo: string | null;
  caption: string | null;
};

export type ImportIssue = {
  id: string;
  severity: IssueSeverity;
  rowNumber: number | null;
  sourceColumn: string | null;
  message: string;
  rawValue: string | null;
};

export type ImportedOption = {
  id: string;
  label: string;
  position: number;
};

export type ImportedField = {
  id: string;
  name: string;
  textHtml: string | null;
  commentType: string;
  category: number | null;
  answerType: string;
  position: number;
  sourceOrder: number | null;
  sourceRowNumber: number;
  defaultValue: string | null;
  defaultValue2: string | null;
  defaultUnitType: string | null;
  defaultLocation: string | null;
  estimateMin: number | null;
  estimateMax: number | null;
  locked: string | null;
  simpleFormat: string | null;
  disablePhotos: string | null;
  uses: string | null;
  recommendation: string | null;
  sourceLastModified: string | null;
  photos: PhotoSlot[];
  supportStatus: SupportStatus;
  options: ImportedOption[];
  unitOptions: ImportedOption[];
};

export type ImportedItem = {
  id: string;
  name: string;
  position: number;
  fields: ImportedField[];
};

export type ImportedSection = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  items: ImportedItem[];
};

export type ImportSummary = {
  rowsRead: number;
  fieldsCreated: number;
  silentlyDropped: number;
  fullyImported: number;
  partiallySupported: number;
  warningCount: number;
  unsupportedCount: number;
  sectionCount: number;
  itemCount: number;
  uniqueItemNameCount: number;
};

export type ImportedTemplate = {
  id: string;
  name: string;
  sourceFormat: "spectora-xlsx";
  sourceFilename: string;
  sections: ImportedSection[];
  issues: ImportIssue[];
  summary: ImportSummary;
};

export type SpreadsheetRow = {
  sourceRowNumber: number;
  values: Record<string, string>;
};

export type SpreadsheetGrid = {
  sheetName: string;
  headers: string[];
  headerToColumn: Map<string, number>;
  rows: SpreadsheetRow[];
};
