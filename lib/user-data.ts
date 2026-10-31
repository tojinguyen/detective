import { supabase } from '@/lib/supabase';

/** Điểm tốt nhất của từng vụ án người chơi đã phá, lấy từ các phiên điều tra thắng trên database. */
export async function fetchCareer(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('investigation_sessions')
    .select('case_id, summary')
    .eq('user_id', userId)
    .eq('won', true);
  if (error) throw error;
  const career: Record<string, number> = {};
  for (const row of data ?? []) {
    const score = Number((row.summary as { score?: number } | null)?.score) || 0;
    career[row.case_id] = Math.max(career[row.case_id] ?? 0, score);
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
