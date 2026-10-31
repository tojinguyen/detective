-- Lưu dữ liệu người chơi trên database thay vì localStorage.
-- Chạy một lần trong Supabase Dashboard → SQL Editor. Chạy lại nhiều lần vẫn an toàn.

-- 1. Tiến trình đang chơi dở: mỗi (người chơi, vụ án) một dòng.
create table if not exists public.case_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  case_id text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

alter table public.case_progress enable row level security;

drop policy if exists "case_progress_owner_all" on public.case_progress;
create policy "case_progress_owner_all" on public.case_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. Vụ án đã phá và điểm sự nghiệp lấy từ investigation_sessions (đã có sẵn);
--    người chơi cần đọc được các dòng của chính mình.
alter table public.investigation_sessions enable row level security;

drop policy if exists "investigation_sessions_owner_select" on public.investigation_sessions;
create policy "investigation_sessions_owner_select" on public.investigation_sessions
  for select to authenticated
  using (user_id = auth.uid());
