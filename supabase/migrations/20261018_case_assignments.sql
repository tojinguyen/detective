-- Đồng bộ gán phòng theo vụ án + cấp mã bài không trùng giữa các admin.
-- Chạy một lần trong Supabase Dashboard → SQL Editor. Chạy lại nhiều lần vẫn an toàn.

-- 1. Kiểm tra quyền admin theo bảng profiles (security definer để không vướng RLS của profiles).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. Bảng gán phòng: mỗi phòng của một vụ là một dòng.
create table if not exists public.case_assignments (
  case_id text not null,
  room_index integer not null,
  question_id integer not null
);
-- Ứng dụng upsert theo (case_id, room_index) nên cần ràng buộc duy nhất này.
create unique index if not exists case_assignments_case_room_key
  on public.case_assignments (case_id, room_index);

alter table public.case_assignments enable row level security;

drop policy if exists "case_assignments_read_all" on public.case_assignments;
create policy "case_assignments_read_all" on public.case_assignments
  for select using (true);

drop policy if exists "case_assignments_admin_write" on public.case_assignments;
create policy "case_assignments_admin_write" on public.case_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Cấp mã bài mới từ một bộ đếm chung trên Cloud.
create sequence if not exists public.question_id_seq;
-- Bắt đầu sau mã lớn nhất hiện có (tối thiểu 29: mã lớn nhất của bộ bài mẫu trong lib/questions.json).
select setval(
  'public.question_id_seq',
  greatest((select coalesce(max(id), 0) from public.questions), 29, (select last_value from public.question_id_seq)),
  true
);

create or replace function public.allocate_question_ids(how_many integer)
returns integer[]
language plpgsql
security definer
set search_path = public
as $$
declare
  ids integer[] := '{}';
  candidate integer;
begin
  if not public.is_admin() then
    raise exception 'Chỉ admin mới được cấp mã bài' using errcode = '42501';
  end if;
  if how_many is null or how_many < 1 or how_many > 500 then
    raise exception 'Số lượng mã không hợp lệ: %', how_many;
  end if;
  while coalesce(array_length(ids, 1), 0) < how_many loop
    candidate := nextval('public.question_id_seq');
    -- Bỏ qua mã đã có (vd. bài tạo khi mất mạng, dùng mã tạm trên máy).
    if not exists (select 1 from public.questions where id = candidate) then
      ids := ids || candidate;
    end if;
  end loop;
  return ids;
end;
$$;

revoke all on function public.allocate_question_ids(integer) from public, anon;
grant execute on function public.allocate_question_ids(integer) to authenticated;
