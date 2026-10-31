-- Browser push subscriptions for ZED STORE.
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null,
 subscription jsonb not null,
 user_agent text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint push_subscriptions_owner_endpoint_key unique(owner_id,endpoint)
);
create index if not exists push_subscriptions_owner_idx on public.push_subscriptions(owner_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
create policy push_subscriptions_owner_select on public.push_subscriptions for select to authenticated using ((select auth.uid())=owner_id);
drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
create policy push_subscriptions_owner_insert on public.push_subscriptions for insert to authenticated with check ((select auth.uid())=owner_id);
drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
create policy push_subscriptions_owner_update on public.push_subscriptions for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_delete on public.push_subscriptions for delete to authenticated using ((select auth.uid())=owner_id);
-- Explicit grants are required for newly created public tables on current Supabase projects.
grant select,insert,update,delete on public.push_subscriptions to authenticated;
grant select,delete on public.push_subscriptions to service_role;