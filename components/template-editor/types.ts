export type EditorOption = {
  id: string;
  label: string;
  position: number;
};

export type EditorField = {
  id: string;
  name: string;
  textHtml: string | null;
  commentType: string;
  answerType: string;
  position: number;
  sourceOrder: number | null;
  sourceRowNumber: number;
  supportStatus: string;
  recommendation: string | null;
  options: EditorOption[];
  unitOptions: EditorOption[];
};

export type EditorItem = {
  id: string;
  name: string;
  position: number;
  fields: EditorField[];
};

export type EditorSection = {
  id: string;
  name: string;
  position: number;
  items: EditorItem[];
};

export type EditorIssue = {
  id: string;
  severity: string;
  rowNumber: number | null;
  sourceColumn: string | null;
  message: string;
  rawValue: string | null;
};

export type EditorTemplate = {
  id: string;
  name: string;
  sourceFilename: string;
  sections: EditorSection[];
  issues: EditorIssue[];
};
