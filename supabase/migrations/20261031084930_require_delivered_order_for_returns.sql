
create or replace function public.apply_return_stock_movements()
returns trigger language plpgsql set search_path=public as $$
declare
 v_original public.products%rowtype; v_replacement public.products%rowtype;
 v_item public.order_items%rowtype; v_order public.orders%rowtype;
 v_sold_qty numeric; v_already_returned numeric;
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then raise exception 'İcazə yoxdur'; end if;
 select * into v_original from public.products where id=new.product_id and owner_id=new.owner_id for update;
 if not found then raise exception 'Qaytarılan məhsul tapılmadı'; end if;
 if new.order_id is not null then
  select * into v_order from public.orders where id=new.order_id and owner_id=new.owner_id and delivery_status='delivered' for share;
  if not found then raise exception 'Yalnız təhvil verilmiş sifariş qaytarıla bilər'; end if;
 end if;
 if new.order_item_id is not null then
  select oi.* into v_item from public.order_items oi where oi.id=new.order_item_id and oi.owner_id=new.owner_id and oi.product_id=new.product_id for update;
  if not found then raise exception 'Sifariş məhsulu uyğun gəlmir'; end if;
  if new.order_id is not null and v_item.order_id<>new.order_id then raise exception 'Sifariş və məhsul uyğun gəlmir'; end if;
  select quantity into v_sold_qty from public.order_items where id=new.order_item_id;
  select coalesce(sum(quantity),0) into v_already_returned from public.returns where order_item_id=new.order_item_id and id<>new.id;
  if v_already_returned+new.quantity>v_sold_qty then raise exception 'Qaytarılan miqdar satılmış miqdardan çox ola bilməz'; end if;
 end if;
 if new.item_condition='restock' then
  update public.products set stock_qty=stock_qty+new.quantity,updated_at=now() where id=new.product_id and owner_id=new.owner_id;
  insert into public.stock_movements(owner_id,product_id,movement_type,quantity_delta,unit_cost,reference_type,reference_id,note)
  values(new.owner_id,new.product_id,'return',new.quantity,v_original.cost_price,'return',new.id,'Məhsul qaytarıldı — yararlı stok');
 end if;
 if new.return_type='exchange' then
  select * into v_replacement from public.products where id=new.replacement_product_id and owner_id=new.owner_id for update;
  if not found then raise exception 'Əvəz məhsul tapılmadı'; end if;
  if v_replacement.stock_qty<new.replacement_quantity then raise exception 'Əvəz məhsul üçün anbarda kifayət qədər qalıq yoxdur'; end if;
  update public.products set stock_qty=stock_qty-new.replacement_quantity,updated_at=now() where id=new.replacement_product_id and owner_id=new.owner_id;
  insert into public.stock_movements(owner_id,product_id,movement_type,quantity_delta,unit_cost,reference_type,reference_id,note)
  values(new.owner_id,new.replacement_product_id,'sale',-new.replacement_quantity,v_replacement.cost_price,'return_exchange',new.id,'Dəyişdirilmə — yeni məhsul verildi');
 end if;
 return new;
end; $$;
drop trigger if exists returns_apply_stock on public.returns;
create trigger returns_apply_stock after insert on public.returns for each row execute function public.apply_return_stock_movements();
