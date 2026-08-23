export type Choice = {
  value?: string;
  text?: string;
  html?: string;
  selected?: boolean;
  correct?: boolean;
};

export type Question = {
  id?: string;
  type?: string;
  badge?: string;
  answerMode?: string;
  statementText?: string;
  statementHtml?: string;
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
  explanationText?: string;
  explanationHtml?: string;
  questions: Question[];
};

export type CaptureFailure = {
  id: number;
  title?: string;
  sourceUrl?: string;
  message: string;
};
