ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS payment_account text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_entries_payment_account_check') THEN
    ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_payment_account_check
      CHECK (payment_account = ANY (ARRAY['cash','bank','marketplace']));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_entries_source_type_check') THEN
    ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_source_type_check
      CHECK (source_type = ANY (ARRAY['manual','purchase']));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_owner_name_unique UNIQUE (owner_id, name)
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  paid_amount numeric NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status = ANY (ARRAY['paid','partial','pending'])),
  payment_account text NOT NULL DEFAULT 'cash' CHECK (payment_account = ANY (ARRAY['cash','bank','marketplace'])),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  invoice_no text,
  notes text,
  stock_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_payment_consistency CHECK (
    (payment_status = 'paid' AND paid_amount = total_amount) OR
    (payment_status = 'partial' AND paid_amount > 0 AND paid_amount < total_amount) OR
    (payment_status = 'pending' AND paid_amount = 0)
  )
);

CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['sign_in','sign_out'])),
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_owner_all ON public.suppliers;
CREATE POLICY suppliers_owner_all ON public.suppliers
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS purchases_owner_select ON public.purchases;
CREATE POLICY purchases_owner_select ON public.purchases
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS purchases_owner_insert ON public.purchases;
CREATE POLICY purchases_owner_insert ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS login_events_owner_select ON public.login_events;
CREATE POLICY login_events_owner_select ON public.login_events
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS login_events_owner_insert ON public.login_events;
CREATE POLICY login_events_owner_insert ON public.login_events
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;

CREATE INDEX IF NOT EXISTS purchases_owner_date_idx ON public.purchases(owner_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS purchases_product_idx ON public.purchases(product_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS login_events_owner_date_idx ON public.login_events(owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_supplier_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suppliers_set_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_set_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_supplier_updated_at();

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

  SELECT stock_qty, cost_price
    INTO v_old_qty, v_old_cost
    FROM public.products
   WHERE id = NEW.product_id
     AND owner_id = NEW.owner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Məhsul tapılmadı və ya bu hesaba aid deyil';
  END IF;

  v_old_qty := COALESCE(v_old_qty, 0);
  v_old_cost := COALESCE(v_old_cost, 0);
  v_new_qty := v_old_qty + NEW.quantity;

  UPDATE public.products
     SET stock_qty = v_new_qty,
         cost_price = CASE
           WHEN v_new_qty > 0
             THEN ((v_old_qty * v_old_cost) + (NEW.quantity * NEW.unit_cost)) / v_new_qty
           ELSE NEW.unit_cost
         END
   WHERE id = NEW.product_id
     AND owner_id = NEW.owner_id;

  SELECT name INTO v_supplier_name
    FROM public.suppliers
   WHERE id = NEW.supplier_id
     AND owner_id = NEW.owner_id;

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
       'Məhsul alışı · ödənilmiş hissə',
       v_supplier_name, NEW.payment_account, 'purchase', 'purchase', NEW.id,
       now(), NEW.notes);
  END IF;

  v_remaining := NEW.total_amount - NEW.paid_amount;
  IF v_remaining > 0 THEN
    INSERT INTO public.finance_entries
      (owner_id, entry_type, amount, status, title, counterparty, payment_account, source_type, reference_type, reference_id, due_date, notes)
    VALUES
      (NEW.owner_id, 'payable', v_remaining, 'pending',
       'Məhsul alışı · qalıq borc',
       v_supplier_name, NEW.payment_account, 'purchase', 'purchase', NEW.id,
       NEW.purchased_at::date, NEW.notes);
  END IF;

  NEW.stock_applied := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchases_apply_receipt ON public.purchases;
CREATE TRIGGER purchases_apply_receipt
BEFORE INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.apply_purchase_receipt();

DROP TRIGGER IF EXISTS purchases_activity_log ON public.purchases;
CREATE TRIGGER purchases_activity_log
AFTER INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();

DROP TRIGGER IF EXISTS suppliers_activity_log ON public.suppliers;
CREATE TRIGGER suppliers_activity_log
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
