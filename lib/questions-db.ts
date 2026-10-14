import { supabase } from '@/lib/supabase';
import type { Question, QuestionKind } from '@/lib/content';

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
  is_hidden?: boolean;
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
    is_hidden: false,
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
 * Tải toàn bộ danh sách câu hỏi từ Supabase
 */
export async function fetchQuestionsFromDb(): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Lỗi khi fetch câu hỏi từ Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(fromDbQuestion);
  } catch (err) {
    console.warn('Ngoại lệ khi fetch câu hỏi từ Supabase:', err);
    return [];
  }
}

/**
 * Lưu/Cập nhật một câu hỏi lên Supabase
 */
export async function syncQuestionToDb(question: Question): Promise<{ success: boolean; error?: string }> {
  try {
    const row = toDbQuestion(question);
    const { error } = await supabase.from('questions').upsert(row);

    if (error) {
      console.error('Lỗi khi sync câu hỏi lên Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi lưu lên cloud';
    console.error('Ngoại lệ khi sync câu hỏi lên Supabase:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Lưu/Cập nhật hàng loạt câu hỏi lên Supabase
 */
export async function syncBatchQuestionsToDb(questions: Question[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (questions.length === 0) return { success: true, count: 0 };
  try {
    const rows = questions.map(toDbQuestion);
    const { error } = await supabase.from('questions').upsert(rows);

    if (error) {
      console.error('Lỗi khi sync batch câu hỏi lên Supabase:', error.message);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi lưu batch lên cloud';
    console.error('Ngoại lệ khi sync batch câu hỏi lên Supabase:', msg);
    return { success: false, count: 0, error: msg };
  }
}

/**
 * Xóa một câu hỏi khỏi Supabase
 */
export async function deleteQuestionFromDb(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('questions').delete().eq('id', id);

    if (error) {
      console.error(`Lỗi khi xóa câu hỏi #${id} trên Supabase:`, error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi xóa trên cloud';
    console.error(`Ngoại lệ khi xóa câu hỏi #${id} trên Supabase:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Tự động đồng bộ các câu hỏi mẫu ban đầu lên Supabase nếu bảng còn trống
 */
export async function seedQuestionsIfEmpty(defaultQuestions: Question[]): Promise<boolean> {
  try {
    const { count, error: countErr } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.warn('Không thể kiểm tra số lượng câu hỏi trên Supabase:', countErr.message);
      return false;
    }

    if (count === 0 && defaultQuestions.length > 0) {
      const rows = defaultQuestions.map(toDbQuestion);
      const { error: insertErr } = await supabase.from('questions').insert(rows);
      if (insertErr) {
        console.warn('Tự động khởi tạo câu hỏi mẫu lên Supabase thất bại:', insertErr.message);
        return false;
      }
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Ngoại lệ khi seed câu hỏi mẫu lên Supabase:', err);
    return false;
  }
}
