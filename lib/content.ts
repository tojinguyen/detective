import rawQuestions from '@/lib/questions.json';
import { CASE_01, type CaseDefinition } from '@/lib/cases';

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

export type LocalContent = {
  customQuestions: Question[];
  questionOverrides: Question[];
  caseQuestionIds: Record<string, number[]>;
  /** Id các bài đã sửa/xóa trên máy này nhưng chưa ghi được lên Cloud. */
  pendingSyncIds: number[];
};

type StoredContent = Partial<LocalContent> & { case01QuestionIds?: unknown };

const STORAGE_KEY = 'erase-content-studio-v1';

export const DEFAULT_LOCAL_CONTENT: LocalContent = {
  customQuestions: [],
  questionOverrides: [],
  caseQuestionIds: { [CASE_01.id]: [...CASE_01.defaultQuestionIds] },
  pendingSyncIds: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numericIds(value: unknown) {
  return Array.isArray(value) && value.every(id => Number.isFinite(Number(id))) ? value.map(Number) : null;
}

export function readLocalContent(): LocalContent {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_CONTENT;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredContent | null;
    const storedAssignments = isRecord(parsed?.caseQuestionIds)
      ? Object.fromEntries(Object.entries(parsed.caseQuestionIds).flatMap(([caseId, ids]) => {
        const parsedIds = numericIds(ids);
        return parsedIds ? [[caseId, parsedIds]] : [];
      }))
      : {};
    const legacyCase01Ids = numericIds(parsed?.case01QuestionIds);
    const case01Ids = storedAssignments[CASE_01.id]?.length === CASE_01.rooms.length
      ? storedAssignments[CASE_01.id]
      : legacyCase01Ids?.length === CASE_01.rooms.length
        ? legacyCase01Ids
        : [...CASE_01.defaultQuestionIds];
    return {
      customQuestions: Array.isArray(parsed?.customQuestions) ? parsed.customQuestions : [],
      questionOverrides: Array.isArray(parsed?.questionOverrides) ? parsed.questionOverrides : [],
      caseQuestionIds: { ...storedAssignments, [CASE_01.id]: case01Ids },
      pendingSyncIds: numericIds(parsed?.pendingSyncIds) ?? [],
    };
  } catch {
    return DEFAULT_LOCAL_CONTENT;
  }
}

export function writeLocalContent(content: LocalContent) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}

export function allQuestions(content: LocalContent) {
  const merged = new Map<number, Question>();
  QUESTION_BANK.forEach(question => merged.set(question.id, question));
  content.customQuestions.forEach(question => merged.set(question.id, question));
  content.questionOverrides.forEach(question => merged.set(question.id, question));
  return [...merged.values()];
}

/** Bản bài đang lưu trên máy (tự tạo hoặc đã sửa từ bài mẫu), null nếu không có. */
export function findLocalQuestion(content: LocalContent, id: number) {
  return content.questionOverrides.find(q => q.id === id) ?? content.customQuestions.find(q => q.id === id) ?? null;
}

/**
 * Ghép dữ liệu Cloud vào nội dung trên máy. Cloud là nguồn chuẩn, trừ những bài
 * còn trong pendingSyncIds: với các bài đó giữ nguyên bản trên máy (kể cả việc đã xóa).
 */
export function mergeCloudQuestions(local: LocalContent, cloud: Question[]): LocalContent {
  const pending = new Set(local.pendingSyncIds);
  const defaultIds = new Set(QUESTION_BANK.map(q => q.id));
  const fromCloud = cloud.filter(q => !pending.has(q.id));
  return {
    ...local,
    customQuestions: [
      ...fromCloud.filter(q => !defaultIds.has(q.id)),
      ...local.customQuestions.filter(q => pending.has(q.id)),
    ],
    questionOverrides: [
      ...fromCloud.filter(q => defaultIds.has(q.id)),
      ...local.questionOverrides.filter(q => pending.has(q.id)),
    ],
  };
}

export function questionIdsForCase(content: LocalContent, caseData: CaseDefinition) {
  const stored = content.caseQuestionIds[caseData.id];
  return stored?.length === caseData.rooms.length ? stored : [...caseData.defaultQuestionIds];
}

export function questionsForCase(content: LocalContent, caseData: CaseDefinition = CASE_01): Question[] {
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
