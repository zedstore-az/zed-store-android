-- ZED STORE finance ledger, return notification and realtime feed
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('income','expense','receivable','payable')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'paid' check (status in ('paid','pending')),
  title text not null,
  counterparty text,
  due_date date,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists finance_entries_owner_created_idx on public.finance_entries(owner_id, created_at desc);
alter table public.finance_entries enable row level security;
drop policy if exists "finance_entries_owner_all" on public.finance_entries;
create policy "finance_entries_owner_all" on public.finance_entries
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.finance_entries to authenticated;

create or replace function public.notify_return_event()
returns trigger language plpgsql set search_path = public
as $$
begin
  insert into public.notifications(owner_id, type, title, message, severity, entity_type, entity_id)
  values (
    new.owner_id,
    'return',
    case when new.return_type = 'exchange' then 'Məhsul dəyişdirildi' else 'Məhsul qaytarıldı' end,
    'Qaytarılma əməliyyatı qeydə alındı. Məbləğ: ' || to_char(coalesce(new.refund_amount,0), 'FM999999990.00') || ' ₼',
    'warning',
    'return',
    new.id
  );
  return new;
end;
$$;
drop trigger if exists returns_event_notifications on public.returns;
create trigger returns_event_notifications
after insert on public.returns
for each row execute function public.notify_return_event();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
