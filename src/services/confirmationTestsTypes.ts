export type Choice = {
  value?: string;
  text?: string;
  html?: string;
};

export type Question = {
  id?: string;
  type?: string;
  badge?: string;
  choices: Choice[];
  userAnswer?: unknown;
  isCorrect?: boolean | null;
  explanationText?: string;
  explanationHtml?: string;
};

export type CapturedConfirmationTest = {
  id: number;
  title?: string;
  resourceType: 'exercise';
  materialType?: string;
  learningMaterialCode?: string;
  sourceUrl: string;
  passed?: boolean;
  history?: unknown;
  statementText?: string;
  statementHtml?: string;
  questions: Question[];
};

export type CaptureFailure = {
  id: number;
  title?: string;
  sourceUrl?: string;
  message: string;
};
