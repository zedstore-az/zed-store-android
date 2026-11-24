alter table public.sales
  add column if not exists customer_name text;

create or replace function public.delete_cash_sale(p_sale_id uuid)
returns table(sale_id uuid, product_id uuid, restored_stock_qty numeric)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sale public.sales%rowtype;
  v_stock numeric;
begin
  if auth.uid() is null then
    raise exception 'Giriş tələb olunur';
  end if;

  select *
    into v_sale
  from public.sales
  where id = p_sale_id
    and owner_id = auth.uid()
    and sale_channel = 'cash'
  for update;

  if not found then
    raise exception 'Nağd satış tapılmadı və ya giriş icazəsi yoxdur';
  end if;

  if v_sale.stock_deducted_at is not null and v_sale.product_id is not null then
    update public.products
       set stock_qty = stock_qty + v_sale.quantity
     where id = v_sale.product_id
       and owner_id = auth.uid()
     returning stock_qty into v_stock;
  end if;

  delete from public.stock_movements
   where owner_id = auth.uid()
     and reference_type = 'cash_sale'
     and reference_id = v_sale.id;

  delete from public.sales
   where id = v_sale.id
     and owner_id = auth.uid()
     and sale_channel = 'cash';

  sale_id := v_sale.id;
  product_id := v_sale.product_id;
  restored_stock_qty := v_stock;
  return next;
end;
$$;

revoke all on function public.delete_cash_sale(uuid) from public;
revoke all on function public.delete_cash_sale(uuid) from anon;
grant execute on function public.delete_cash_sale(uuid) to authenticated;
