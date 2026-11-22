-- Password-protected administrator cancellation for ZED STORE orders.
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.order_action_passwords (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.order_action_passwords enable row level security;
revoke all on public.order_action_passwords from public, anon, authenticated;

create or replace function private.change_order_action_password_impl(
  p_current_password text,
  p_new_password text,
  p_repeat_password text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_hash text;
begin
  if v_owner is null then raise exception 'Giriş tələb olunur'; end if;
  if coalesce(length(p_new_password),0) < 4 then raise exception 'Yeni təsdiqləmə şifrəsi ən azı 4 simvol olmalıdır'; end if;
  if p_new_password is distinct from p_repeat_password then raise exception 'Yeni şifrələr uyğun gəlmir'; end if;

  select password_hash into v_hash
  from public.order_action_passwords where owner_id = v_owner for update;

  if not found then
    if p_current_password is distinct from '1157' then
      raise exception 'Cari təsdiqləmə şifrəsi yanlışdır';
    end if;
    insert into public.order_action_passwords(owner_id,password_hash)
    values(v_owner, extensions.crypt(p_new_password, extensions.gen_salt('bf')));
  else
    if extensions.crypt(coalesce(p_current_password,''), v_hash) <> v_hash then
      raise exception 'Cari təsdiqləmə şifrəsi yanlışdır';
    end if;
    update public.order_action_passwords
       set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
           updated_at = pg_catalog.now()
     where owner_id = v_owner;
  end if;
  return pg_catalog.jsonb_build_object('success',true);
end;
$$;

create or replace function private.admin_cancel_order_impl(
  p_order_id uuid,
  p_password text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_hash text;
  v_order public.orders%rowtype;
  v_item record;
begin
  if v_owner is null then raise exception 'Giriş tələb olunur'; end if;
  if p_order_id is null then raise exception 'Sifariş seçilməyib'; end if;

  select password_hash into v_hash
  from public.order_action_passwords where owner_id = v_owner;
  if not found then
    if p_password is distinct from '1157' then raise exception 'Təsdiqləmə şifrəsi yanlışdır'; end if;
  elsif extensions.crypt(coalesce(p_password,''), v_hash) <> v_hash then
    raise exception 'Təsdiqləmə şifrəsi yanlışdır';
  end if;

  select * into v_order from public.orders
   where id = p_order_id and owner_id = v_owner for update;
  if not found then raise exception 'Sifariş tapılmadı'; end if;

  -- Return every ordered quantity exactly once, within this transaction.
  if v_order.stock_deducted_at is not null then
    for v_item in
      select product_id, sum(quantity)::numeric as quantity
        from public.order_items
       where order_id = p_order_id and owner_id = v_owner and product_id is not null
       group by product_id
    loop
      update public.products
         set stock_qty = coalesce(stock_qty,0) + v_item.quantity
       where id = v_item.product_id and owner_id = v_owner;
    end loop;
  end if;

  -- Remove dependent business records so the admin-cancelled order leaves no
  -- cancellation, sales, or order-linked stock history behind.
  delete from public.cancellations where order_id = p_order_id and owner_id = v_owner;
  delete from public.sales where order_id = p_order_id and owner_id = v_owner;
  delete from public.stock_movements
   where owner_id = v_owner and reference_id = p_order_id
     and reference_type in ('order','order_item','sale');
  delete from public.order_items where order_id = p_order_id;
  delete from public.orders where id = p_order_id and owner_id = v_owner;

  return pg_catalog.jsonb_build_object('success',true,'order_id',p_order_id);
end;
$$;

revoke all on function private.change_order_action_password_impl(text,text,text) from public, anon, authenticated;
grant execute on function private.change_order_action_password_impl(text,text,text) to authenticated;
revoke all on function private.admin_cancel_order_impl(uuid,text) from public, anon, authenticated;
grant execute on function private.admin_cancel_order_impl(uuid,text) to authenticated;

create or replace function public.change_order_action_password(
  p_current_password text, p_new_password text, p_repeat_password text
) returns jsonb language sql security invoker set search_path = ''
as $ select private.change_order_action_password_impl(p_current_password,p_new_password,p_repeat_password); $;

create or replace function public.admin_cancel_order(
  p_order_id uuid, p_password text
) returns jsonb language sql security invoker set search_path = ''
as $ select private.admin_cancel_order_impl(p_order_id,p_password); $;

revoke all on function public.change_order_action_password(text,text,text) from public, anon, authenticated;
grant execute on function public.change_order_action_password(text,text,text) to authenticated;
revoke all on function public.admin_cancel_order(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_cancel_order(uuid,text) to authenticated;
