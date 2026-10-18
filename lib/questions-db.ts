import { supabase } from '@/lib/supabase';
import { findLocalQuestion, type LocalContent, type Question, type QuestionKind } from '@/lib/content';

export interface DbQuestionRow {
  id: number;
  grade: number;
  topic: string;
  audit_status: string;
  kind: string;
  answer: string;
  options: any;
  target: number;
  error_line: number | null;
  segments: string[];
  intro: string;
  hint: string;
  explanation: string;
  repair_label: string;
  difficulty: string | null;
  given_line: number | null;
  bad: string[];
  correct: string[];
  source_latex: string;
  created_at?: string;
}

/**
 * Chuyển đối tượng Question (TypeScript camelCase) sang schema của Supabase (snake_case)
 */
export function toDbQuestion(q: Question): DbQuestionRow {
  return {
    id: Number(q.id),
    grade: Number(q.grade) || 7,
    topic: q.topic || 'Toán học',
    audit_status: q.auditStatus || 'approved',
    kind: q.kind || 'value',
    answer: String(q.answer ?? ''),
    options: Array.isArray(q.options) ? q.options : [],
    target: Number(q.target) || 0,
    error_line: q.errorLine !== undefined && q.errorLine !== null ? Number(q.errorLine) : 1,
    segments: Array.isArray(q.segments) ? q.segments : [],
    intro: q.intro || '',
    hint: q.hint || '',
    explanation: q.explanation || '',
    repair_label: q.repairLabel || 'Sửa lại bước sai:',
    difficulty: q.difficulty || null,
    given_line: q.givenLine !== undefined && q.givenLine !== null ? Number(q.givenLine) : null,
    bad: Array.isArray(q.bad) ? q.bad : [],
    correct: Array.isArray(q.correct) ? q.correct : [],
    source_latex: q.sourceLatex || '',
  };
}

/**
 * Chuyển bản ghi từ Supabase (snake_case) về Question (camelCase)
 */
export function fromDbQuestion(row: any): Question {
  return {
    id: Number(row.id),
    grade: Number(row.grade) || 7,
    topic: row.topic || 'Toán học',
    auditStatus: (row.audit_status || 'approved') as 'approved' | 'draft' | 'needs_review',
    kind: (row.kind || 'value') as QuestionKind,
    answer: row.answer ?? '',
    options: Array.isArray(row.options) && row.options.length > 0 ? row.options : undefined,
    target: Number(row.target) || 0,
    errorLine: row.error_line !== null && row.error_line !== undefined ? Number(row.error_line) : undefined,
    segments: Array.isArray(row.segments) ? row.segments : [],
    intro: row.intro || '',
    hint: row.hint || '',
    explanation: row.explanation || '',
    repairLabel: row.repair_label || 'Sửa lại bước sai:',
    difficulty: row.difficulty ?? null,
    givenLine: row.given_line !== null && row.given_line !== undefined ? Number(row.given_line) : null,
    bad: Array.isArray(row.bad) ? row.bad : [],
    correct: Array.isArray(row.correct) ? row.correct : [],
    sourceLatex: row.source_latex || '',
  };
}

/**
 * Tải toàn bộ câu hỏi trên Cloud. Ném lỗi khi không đọc được, để bên gọi
 * phân biệt "Cloud trống" với "không kết nối được" và không ghi đè dữ liệu trên máy.
 */
export async function fetchQuestionsFromDb(): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDbQuestion);
}

export type PushResult = {
  /** Bài đã ghi xong, kèm bản đã gửi (null = đã xóa) để bên gọi biết bản đó còn mới nhất không. */
  synced: { id: number; snapshot: Question | null }[];
  error?: string;
};

/**
 * Đẩy các thay đổi trong pendingSyncIds lên Cloud: bài còn trên máy thì upsert,
 * bài không còn thì xóa.
 */
export async function pushPendingQuestions(content: LocalContent): Promise<PushResult> {
  const entries = [...new Set(content.pendingSyncIds)].map(id => ({ id, snapshot: findLocalQuestion(content, id) }));
  const upserts = entries.filter(e => e.snapshot);
  const deletes = entries.filter(e => !e.snapshot);
  const synced: PushResult['synced'] = [];
  const errors: string[] = [];

  if (upserts.length) {
    const { error } = await supabase.from('questions').upsert(upserts.map(e => toDbQuestion(e.snapshot!)));
    if (error) errors.push(error.message); else synced.push(...upserts);
  }
  if (deletes.length) {
    const { error } = await supabase.from('questions').delete().in('id', deletes.map(e => e.id));
    if (error) errors.push(error.message); else synced.push(...deletes);
  }
  return { synced, error: errors.length ? errors.join('; ') : undefined };
}
