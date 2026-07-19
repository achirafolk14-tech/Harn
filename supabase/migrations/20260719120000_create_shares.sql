-- Harn CheckBill share links (โปรเจกต์ harn เท่านั้น)
create table if not exists public.shares (
  id text primary key,
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists shares_created_at_idx on public.shares (created_at desc);

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
