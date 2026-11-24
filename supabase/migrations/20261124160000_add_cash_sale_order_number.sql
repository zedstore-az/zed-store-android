alter table public.sales
  add column if not exists order_number text;

drop function if exists public.create_cash_sale(uuid, numeric, numeric, text);

create function public.create_cash_sale(
  p_product_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
  p_customer_name text default null,
  p_order_number text default null
)
returns table(sale_id uuid, new_stock_qty numeric)
language plpgsql
set search_path = ''
as $function$
declare
  v_product public.products%rowtype;
  v_sale_id uuid;
  v_new_stock numeric;
begin
  if auth.uid() is null then
    raise exception 'Giriş tələb olunur';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity <> trunc(p_quantity) then
    raise exception 'Miqdar tam və müsbət ədəd olmalıdır';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then
    raise exception 'Satış qiyməti düzgün deyil';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and owner_id = auth.uid() and is_active = true
  for update;

  if not found then
    raise exception 'Məhsul tapılmadı və ya aktiv deyil';
  end if;
  if v_product.stock_qty < p_quantity then
    raise exception 'Anbarda kifayət qədər məhsul yoxdur. Mövcud qalıq: %', v_product.stock_qty;
  end if;

  update public.products
  set stock_qty = stock_qty - p_quantity
  where id = p_product_id and owner_id = auth.uid()
  returning stock_qty into v_new_stock;

  insert into public.sales (
    owner_id, product_id, product_name, product_image_url, quantity,
    unit_cost, customer_sale_price, birmarket_sale_price,
    marketplace_commission, logistics_fee, bank_fee, transferred_amount,
    paid_at, sale_channel, stock_deducted_at, customer_name, order_number
  ) values (
    auth.uid(), v_product.id, v_product.name,
    coalesce(v_product.image_urls[1], v_product.image_url),
    p_quantity, coalesce(v_product.cost_price, 0), p_unit_price, p_unit_price,
    0, 0, 0, p_unit_price, null, 'cash', now(),
    nullif(btrim(coalesce(p_customer_name, '')), ''),
    nullif(btrim(coalesce(p_order_number, '')), '')
  ) returning id into v_sale_id;

  insert into public.stock_movements (
    owner_id, product_id, movement_type, quantity_delta, unit_cost,
    reference_type, reference_id, note
  ) values (
    auth.uid(), v_product.id, 'sale', -p_quantity,
    coalesce(v_product.cost_price, 0), 'cash_sale', v_sale_id,
    'Nağd satış yaradıldı — ödəniş gözləyir'
  );

  sale_id := v_sale_id;
  new_stock_qty := v_new_stock;
  return next;
end;
$function$;

revoke all on function public.create_cash_sale(uuid, numeric, numeric, text, text) from public, anon;
grant execute on function public.create_cash_sale(uuid, numeric, numeric, text, text) to authenticated;
