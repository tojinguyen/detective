import { supabase } from '@/lib/supabase';
import { buildContent, findLocalQuestion, questionIdsForCase, type BankContent, type Question, type QuestionKind } from '@/lib/content';
import { CASES } from '@/lib/cases';

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
 * Tải toàn bộ câu hỏi trên database. Ném lỗi khi không đọc được, để bên gọi
 * phân biệt "database trống" với "không kết nối được".
 */
export async function fetchQuestionsFromDb(): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDbQuestion);
}

/** Ghi các bài trong ids lên database: bài còn trong kho thì upsert, bài không còn thì xóa. */
export async function saveQuestions(content: BankContent, ids: number[]) {
  const entries = [...new Set(ids)].map(id => ({ id, snapshot: findLocalQuestion(content, id) }));
  const upserts = entries.filter(e => e.snapshot);
  const deletes = entries.filter(e => !e.snapshot);
  if (upserts.length) {
    const { error } = await supabase.from('questions').upsert(upserts.map(e => toDbQuestion(e.snapshot!)));
    if (error) throw new Error(error.message);
  }
  if (deletes.length) {
    const { error } = await supabase.from('questions').delete().in('id', deletes.map(e => e.id));
    if (error) throw new Error(error.message);
  }
}

/** Bộ gán phòng trên Cloud, dạng caseId → id bài theo thứ tự phòng (phòng thiếu dùng bài gốc). */
export async function fetchAssignmentsFromDb(): Promise<Record<string, number[]>> {
  const { data, error } = await supabase
    .from('case_assignments')
    .select('case_id, room_index, question_id');
  if (error) throw new Error(error.message);
  const result: Record<string, number[]> = {};
  (data ?? []).forEach(row => {
    const caseData = CASES.find(c => c.id === row.case_id);
    const room = Number(row.room_index);
    if (!caseData || !Number.isInteger(room) || room < 0 || room >= caseData.rooms.length) return;
    result[caseData.id] ??= [...caseData.defaultQuestionIds];
    result[caseData.id][room] = Number(row.question_id);
  });
  return result;
}

/** Ghi bộ gán phòng của các vụ trong caseIds lên database (mỗi phòng một dòng). */
export async function saveAssignments(content: BankContent, caseIds: string[]) {
  const cases = CASES.filter(c => caseIds.includes(c.id));
  if (!cases.length) return;
  const rows = cases.flatMap(c => questionIdsForCase(content, c).map((questionId, roomIndex) => ({
    case_id: c.id,
    room_index: roomIndex,
    question_id: questionId,
  })));
  const { error } = await supabase.from('case_assignments').upsert(rows, { onConflict: 'case_id,room_index' });
  if (error) throw new Error(error.message);
}

/** Tải toàn bộ nội dung kho bài và bộ gán phòng từ database. Ném lỗi nếu không đọc được. */
export async function loadContent(): Promise<BankContent> {
  const [questions, assignments] = await Promise.all([fetchQuestionsFromDb(), fetchAssignmentsFromDb()]);
  return buildContent(questions, assignments);
}

/**
 * Xin database cấp `count` mã bài mới để hai admin tạo bài cùng lúc không bị trùng mã.
 * Không gọi được hàm cấp mã thì lấy mã lớn nhất trong database; mất mạng thì đành dùng mã lớn nhất đang có.
 */
export async function allocateQuestionIds(count: number, takenIds: Set<number>): Promise<{ ids: number[]; fromCloud: boolean }> {
  const localMax = Math.max(0, ...takenIds);
  const range = (start: number) => Array.from({ length: count }, (_, i) => start + i);

  const { data, error } = await supabase.rpc('allocate_question_ids', { how_many: count });
  if (!error && Array.isArray(data) && data.length === count) {
    const ids = data.map(Number);
    if (ids.every(id => Number.isInteger(id) && !takenIds.has(id))) return { ids, fromCloud: true };
  }

  const { data: top, error: topError } = await supabase
    .from('questions')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  if (!topError) return { ids: range(Math.max(localMax, Number(top?.[0]?.id ?? 0)) + 1), fromCloud: true };

  return { ids: range(localMax + 1), fromCloud: false };
}
