alter table public.sales
  add column if not exists sale_channel text not null default 'birmarket';

alter table public.sales
  drop constraint if exists sales_sale_channel_check;
alter table public.sales
  add constraint sales_sale_channel_check
  check (sale_channel in ('birmarket','cash'));

create index if not exists sales_owner_channel_paid_idx
  on public.sales (owner_id, sale_channel, paid_at);

create or replace function public.confirm_cash_sale_payment(p_sale_id uuid)
returns table(sale_id uuid, product_id uuid, new_stock_qty numeric, paid_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sale public.sales%rowtype;
  v_stock numeric;
  v_cost numeric;
begin
  if auth.uid() is null then
    raise exception 'Giriş tələb olunur';
  end if;

  select * into v_sale from public.sales
  where id = p_sale_id and owner_id = auth.uid() and sale_channel = 'cash'
  for update;

  if not found then raise exception 'Nağd satış tapılmadı və ya giriş icazəsi yoxdur'; end if;
  if v_sale.paid_at is not null then raise exception 'Bu nağd satış artıq ödənilib'; end if;
  if v_sale.product_id is null then raise exception 'Satış məhsulla əlaqələndirilməyib'; end if;

  select stock_qty, cost_price into v_stock, v_cost from public.products
  where id = v_sale.product_id and owner_id = auth.uid() for update;

  if not found then raise exception 'Məhsul tapılmadı'; end if;
  if v_stock < v_sale.quantity then
    raise exception 'Anbarda kifayət qədər məhsul yoxdur. Mövcud qalıq: %', v_stock;
  end if;

  update public.products set stock_qty = stock_qty - v_sale.quantity
  where id = v_sale.product_id and owner_id = auth.uid()
  returning stock_qty into v_stock;

  insert into public.stock_movements
    (owner_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, note)
  values (auth.uid(), v_sale.product_id, 'sale', -v_sale.quantity,
    coalesce(v_sale.unit_cost, v_cost, 0), 'cash_sale', v_sale.id, 'Nağd satış ödənişi təsdiqləndi');

  update public.sales as s set paid_at = now()
  where s.id = v_sale.id and s.owner_id = auth.uid()
  returning s.paid_at into paid_at;

  sale_id := v_sale.id;
  product_id := v_sale.product_id;
  new_stock_qty := v_stock;
  return next;
end;
$$;

revoke all on function public.confirm_cash_sale_payment(uuid) from public;
grant execute on function public.confirm_cash_sale_payment(uuid) to authenticated;
