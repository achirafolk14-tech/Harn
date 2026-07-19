-- รายงานปัญหา / แนะนำระบบ (โปรเจกต์ harn เท่านั้น)
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bug', 'idea')),
  message text not null,
  created_at timestamptz not null default now(),
  constraint feedbacks_message_len check (
    char_length(trim(message)) between 1 and 2000
  )
);

create index if not exists feedbacks_created_at_idx
  on public.feedbacks (created_at desc);

create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);

insert into public.app_secrets (key, value)
values ('feedback_admin_token', 'apptook-fb-w8k3m7qp2x')
on conflict (key) do nothing;

alter table public.feedbacks enable row level security;
alter table public.app_secrets enable row level security;

-- ปิดการอ่าน/เขียน secrets จาก client โดยตรง
revoke all on table public.app_secrets from anon, authenticated, public;
revoke all on table public.feedbacks from anon, authenticated, public;

grant usage on schema public to anon, authenticated;

drop policy if exists "Anyone can insert feedbacks" on public.feedbacks;
-- ไม่ให้ select/insert ตรง ๆ — ใช้ RPC เท่านั้น

create or replace function public.submit_feedback(p_kind text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  msg text := trim(p_message);
begin
  if p_kind not in ('bug', 'idea') then
    raise exception 'invalid kind';
  end if;
  if char_length(msg) < 1 or char_length(msg) > 2000 then
    raise exception 'invalid message';
  end if;
  insert into public.feedbacks (kind, message)
  values (p_kind, msg)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.list_feedbacks(p_token text)
returns table (
  id uuid,
  kind text,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is distinct from (
    select s.value from public.app_secrets s where s.key = 'feedback_admin_token'
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select f.id, f.kind, f.message, f.created_at
  from public.feedbacks f
  order by f.created_at desc
  limit 200;
end;
$$;

revoke all on function public.submit_feedback(text, text) from public;
revoke all on function public.list_feedbacks(text) from public;
grant execute on function public.submit_feedback(text, text) to anon, authenticated;
grant execute on function public.list_feedbacks(text) to anon, authenticated;
