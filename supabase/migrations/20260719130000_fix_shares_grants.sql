-- แก้สิทธิ์ตาราง shares สำหรับโปรเจกต์ harn เท่านั้น
-- ให้ anon / authenticated ใช้งานผ่าน RLS ได้

grant usage on schema public to anon, authenticated;

grant select, insert on table public.shares to anon, authenticated;

alter table public.shares enable row level security;

drop policy if exists "Public can read shares" on public.shares;
create policy "Public can read shares"
  on public.shares
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can create shares" on public.shares;
create policy "Public can create shares"
  on public.shares
  for insert
  to anon, authenticated
  with check (
    char_length(id) between 4 and 16
    and char_length(payload) > 0
    and char_length(payload) <= 50000
  );
