import { supabase } from '@/lib/supabase';
import { calculateCaseScore } from '@/lib/scoring';

type SessionRow = {
  case_id: string;
  summary: { score?: number; score_breakdown?: { totalScore?: number }; conclusion_attempts?: number } | null;
  records: { findMisses?: number; repairMisses?: number; hintOpened?: boolean }[] | null;
};

/** Điểm của một phiên thắng: ưu tiên điểm đã lưu, phiên cũ thiếu điểm thì tính lại từ chi tiết từng phòng. */
function sessionScore(row: SessionRow) {
  const saved = row.summary?.score ?? row.summary?.score_breakdown?.totalScore;
  if (typeof saved === 'number') return saved;
  if (!Array.isArray(row.records) || !row.records.length) return 0;
  const rooms = row.records.map(r => ({
    stage: 'done',
    findMisses: r.findMisses ?? 0,
    repairMisses: r.repairMisses ?? 0,
    hintOpened: Boolean(r.hintOpened),
  }));
  const misses = Math.max(0, (row.summary?.conclusion_attempts ?? 1) - 1);
  return calculateCaseScore(rooms, true, misses).totalScore;
}

/** Điểm tốt nhất của từng vụ án người chơi đã phá, lấy từ các phiên điều tra thắng trên database. */
export async function fetchCareer(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('investigation_sessions')
    .select('case_id, summary, records')
    .eq('user_id', userId)
    .eq('won', true);
  if (error) throw error;
  const career: Record<string, number> = {};
  for (const row of (data ?? []) as SessionRow[]) {
    career[row.case_id] = Math.max(career[row.case_id] ?? 0, sessionScore(row));
  }
  return career;
}

export async function fetchProgress<T>(userId: string, caseId: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('case_progress')
    .select('state')
    .eq('user_id', userId)
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  return (data?.state as T | undefined) ?? null;
}

export async function saveProgress(userId: string, caseId: string, state: unknown) {
  const { error } = await supabase
    .from('case_progress')
    .upsert({ user_id: userId, case_id: caseId, state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteProgress(userId: string, caseId: string) {
  const { error } = await supabase.from('case_progress').delete().eq('user_id', userId).eq('case_id', caseId);
  if (error) throw error;
}
