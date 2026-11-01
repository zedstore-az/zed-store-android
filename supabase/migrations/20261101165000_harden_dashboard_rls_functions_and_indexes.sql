-- Harden ZED STORE dashboard access and address Supabase advisor findings.
-- No business records, stock quantities, or order data are modified.

grant select on table public.birmarket_sms_events to authenticated;
drop policy if exists birmarket_sms_events_admin_select on public.birmarket_sms_events;
create policy birmarket_sms_events_admin_select
on public.birmarket_sms_events
for select
to authenticated
using (
  exists (
    select 1 from public.admin_access aa
    where aa.user_id = (select auth.uid()) and aa.enabled = true
  )
);

alter policy activity_logs_owner_select on public.activity_logs
  using ((select auth.uid()) = owner_id);
alter policy cancellations_owner_all on public.cancellations
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy expenses_owner_all on public.expenses
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy notifications_owner_select on public.notifications
  using ((select auth.uid()) = owner_id);
alter policy notifications_owner_update on public.notifications
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy order_items_owner_all on public.order_items
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy orders_owner_all on public.orders
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy products_owner_all on public.products
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy sales_owner_all on public.sales
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy stock_movements_owner_all on public.stock_movements
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
alter policy store_settings_owner_all on public.store_settings
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

alter function public.handle_order_status_change() set search_path = pg_catalog;
alter function public.notify_order_events() set search_path = pg_catalog;
alter function public.notify_product_low_stock() set search_path = pg_catalog;
alter function public.notify_return_event() set search_path = pg_catalog;
alter function public.write_activity_log() set search_path = pg_catalog;
alter function public.set_updated_at() set search_path = pg_catalog;

revoke execute on function public.handle_order_status_change() from public, anon, authenticated;
revoke execute on function public.notify_order_events() from public, anon, authenticated;
revoke execute on function public.notify_product_low_stock() from public, anon, authenticated;
revoke execute on function public.notify_return_event() from public, anon, authenticated;
revoke execute on function public.write_activity_log() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create index if not exists activity_logs_actor_id_idx on public.activity_logs(actor_id);
create index if not exists cancellations_order_id_idx on public.cancellations(order_id);
create index if not exists cancellations_product_id_idx on public.cancellations(product_id);
create index if not exists chatgpt_api_keys_owner_id_idx on public.chatgpt_api_keys(owner_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_owner_id_idx on public.order_items(owner_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists purchases_supplier_id_idx on public.purchases(supplier_id);
create index if not exists returns_order_id_idx on public.returns(order_id);
create index if not exists returns_product_id_idx on public.returns(product_id);
create index if not exists returns_replacement_product_id_idx on public.returns(replacement_product_id);
create index if not exists sales_order_id_idx on public.sales(order_id);
create index if not exists sales_product_id_idx on public.sales(product_id);
