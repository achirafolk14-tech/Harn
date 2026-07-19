-- ให้แก้ payload ของลิงก์สั้นเดิมได้ (โปรเจกต์ harn)
grant update on table public.shares to anon, authenticated;

drop policy if exists "Public can update shares" on public.shares;
create policy "Public can update shares"
  on public.shares
  for update
  to anon, authenticated
  using (true)
  with check (
    char_length(id) between 4 and 16
    and char_length(payload) > 0
    and char_length(payload) <= 50000
  );
