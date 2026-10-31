import rawQuestions from '@/lib/questions.json';
import { CASE_01, CASES, type CaseDefinition } from '@/lib/cases';

export type QuestionKind = 'symbol' | 'value' | 'expression' | 'choice';
export type QuestionOption = {
  key: string;
  value: string;
};
export type Question = {
  id: number;
  grade: number;
  topic: string;
  auditStatus: 'approved' | 'draft' | 'needs_review';
  kind: QuestionKind;
  answer: string | number;
  options?: QuestionOption[];
  target: number;
  errorLine?: number;
  segments: string[];
  intro: string;
  hint: string;
  explanation: string;
  repairLabel: string;
  difficulty: string | null;
  givenLine: number | null;
  bad: string[];
  correct: string[];
  sourceLatex: string;
};

export const QUESTION_BANK = rawQuestions as Question[];

/** Nội dung kho bài lấy từ database: bài tự tạo, bài mẫu đã sửa, và bộ bài gán cho từng vụ án. */
export type BankContent = {
  customQuestions: Question[];
  questionOverrides: Question[];
  caseQuestionIds: Record<string, number[]>;
};

export const DEFAULT_BANK_CONTENT: BankContent = {
  customQuestions: [],
  questionOverrides: [],
  caseQuestionIds: { [CASE_01.id]: [...CASE_01.defaultQuestionIds] },
};

export function allQuestions(content: BankContent) {
  const merged = new Map<number, Question>();
  QUESTION_BANK.forEach(question => merged.set(question.id, question));
  content.customQuestions.forEach(question => merged.set(question.id, question));
  content.questionOverrides.forEach(question => merged.set(question.id, question));
  return [...merged.values()];
}

/** Bản bài đang có trong kho (tự tạo hoặc đã sửa từ bài mẫu), null nếu không có. */
export function findLocalQuestion(content: BankContent, id: number) {
  return content.questionOverrides.find(q => q.id === id) ?? content.customQuestions.find(q => q.id === id) ?? null;
}

/** Dựng nội dung kho bài từ dữ liệu database. Vụ nào chưa có bộ gán phòng thì dùng bộ bài gốc. */
export function buildContent(cloud: Question[], cloudAssignments: Record<string, number[]>): BankContent {
  const defaultIds = new Set(QUESTION_BANK.map(q => q.id));
  const caseQuestionIds: Record<string, number[]> = {};
  CASES.forEach(c => {
    caseQuestionIds[c.id] = cloudAssignments[c.id] ?? [...c.defaultQuestionIds];
  });
  return {
    customQuestions: cloud.filter(q => !defaultIds.has(q.id)),
    questionOverrides: cloud.filter(q => defaultIds.has(q.id)),
    caseQuestionIds,
  };
}

export function questionIdsForCase(content: BankContent, caseData: CaseDefinition) {
  const stored = content.caseQuestionIds[caseData.id];
  return stored?.length === caseData.rooms.length ? stored : [...caseData.defaultQuestionIds];
}

export function questionsForCase(content: BankContent, caseData: CaseDefinition = CASE_01): Question[] {
  const bank = new Map(allQuestions(content).map(question => [question.id, question]));
  return questionIdsForCase(content, caseData).map((id, index) => {
    const fallbackId = caseData.defaultQuestionIds[index];
    const question = bank.get(id) ?? QUESTION_BANK.find(item => item.id === fallbackId);
    if (!question) throw new Error(`Missing question for ${caseData.id}, room ${index + 1}`);
    return question;
  });
}

export function defaultQuestionsForCase(caseData: CaseDefinition) {
  return caseData.defaultQuestionIds.map(id => {
    const question = QUESTION_BANK.find(item => item.id === id);
    if (!question) throw new Error(`Missing question ${id} for ${caseData.id}`);
    return question;
  });
}
