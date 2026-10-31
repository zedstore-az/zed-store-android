CREATE OR REPLACE FUNCTION public.apply_purchase_receipt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old_qty numeric;
  v_old_cost numeric;
  v_supplier_name text;
  v_new_qty numeric;
  v_remaining numeric;
BEGIN
  IF NEW.stock_applied THEN
    RETURN NEW;
  END IF;
  SELECT stock_qty, cost_price INTO v_old_qty, v_old_cost
    FROM public.products
   WHERE id = NEW.product_id AND owner_id = NEW.owner_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Məhsul tapılmadı və ya bu hesaba aid deyil';
  END IF;
  v_old_qty := COALESCE(v_old_qty, 0);
  v_old_cost := COALESCE(v_old_cost, 0);
  v_new_qty := v_old_qty + NEW.quantity;
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT name INTO v_supplier_name FROM public.suppliers
     WHERE id = NEW.supplier_id AND owner_id = NEW.owner_id;
    IF v_supplier_name IS NULL THEN
      RAISE EXCEPTION 'Təchizatçı tapılmadı və ya bu hesaba aid deyil';
    END IF;
  END IF;
  UPDATE public.products
     SET stock_qty = v_new_qty,
         cost_price = CASE WHEN v_new_qty > 0
           THEN ((v_old_qty * v_old_cost) + (NEW.quantity * NEW.unit_cost)) / v_new_qty
           ELSE NEW.unit_cost END
   WHERE id = NEW.product_id AND owner_id = NEW.owner_id;
  INSERT INTO public.stock_movements
    (owner_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, note)
  VALUES
    (NEW.owner_id, NEW.product_id, 'purchase', NEW.quantity, NEW.unit_cost,
     'purchase', NEW.id,
     'Məhsul alışı' || CASE WHEN v_supplier_name IS NOT NULL THEN ' · ' || v_supplier_name ELSE '' END);
  IF NEW.paid_amount > 0 THEN
    INSERT INTO public.finance_entries
      (owner_id, entry_type, amount, status, title, counterparty, payment_account, source_type, reference_type, reference_id, paid_at, notes)
    VALUES
      (NEW.owner_id, 'expense', NEW.paid_amount, 'paid',
       'Məhsul alışı · ödənilmiş hissə', v_supplier_name, NEW.payment_account,
       'purchase', 'purchase', NEW.id, now(), NEW.notes);
  END IF;
  v_remaining := NEW.total_amount - NEW.paid_amount;
  IF v_remaining > 0 THEN
    INSERT INTO public.finance_entries
      (owner_id, entry_type, amount, status, title, counterparty, payment_account, source_type, reference_type, reference_id, due_date, notes)
    VALUES
      (NEW.owner_id, 'payable', v_remaining, 'pending',
       'Məhsul alışı · qalıq borc', v_supplier_name, NEW.payment_account,
       'purchase', 'purchase', NEW.id, NEW.purchased_at::date, NEW.notes);
  END IF;
  NEW.stock_applied := true;
  RETURN NEW;
END;
$$;
