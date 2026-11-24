-- Give every store user an independent order-cancellation password.
-- First-time setup does not use a shared default password.
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
  if coalesce(length(p_new_password),0) < 4 then
    raise exception 'Yeni təsdiqləmə şifrəsi ən azı 4 simvol olmalıdır';
  end if;
  if p_new_password is distinct from p_repeat_password then
    raise exception 'Yeni şifrələr uyğun gəlmir';
  end if;

  select password_hash into v_hash
    from public.order_action_passwords
   where owner_id = v_owner
   for update;

  if not found then
    -- A user creates their own first password; no shared/default password.
    if coalesce(p_current_password,'') <> '' then
      raise exception 'İlk şifrəni yaratmaq üçün cari şifrə sahəsini boş saxla';
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
    from public.order_action_passwords
   where owner_id = v_owner;

  if not found then
    raise exception 'Sifarişi ləğv etməzdən əvvəl öz ləğvetmə şifrənizi yaradın';
  end if;
  if extensions.crypt(coalesce(p_password,''), v_hash) <> v_hash then
    raise exception 'Təsdiqləmə şifrəsi yanlışdır';
  end if;

  select * into v_order from public.orders
   where id = p_order_id and owner_id = v_owner for update;
  if not found then raise exception 'Sifariş tapılmadı'; end if;

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
