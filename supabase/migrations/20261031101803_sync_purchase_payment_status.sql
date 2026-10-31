DROP POLICY IF EXISTS purchases_owner_update ON public.purchases;
CREATE POLICY purchases_owner_update ON public.purchases
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
GRANT UPDATE ON public.purchases TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_purchase_stock_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.unit_cost IS DISTINCT FROM OLD.unit_cost
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.payment_account IS DISTINCT FROM OLD.payment_account
     OR NEW.purchased_at IS DISTINCT FROM OLD.purchased_at
     OR NEW.invoice_no IS DISTINCT FROM OLD.invoice_no
     OR NEW.stock_applied IS DISTINCT FROM OLD.stock_applied THEN
    RAISE EXCEPTION 'Alışın məhsul və stok məlumatları dəyişdirilə bilməz';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchases_protect_stock_fields ON public.purchases;
CREATE TRIGGER purchases_protect_stock_fields
BEFORE UPDATE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.protect_purchase_stock_fields();

DROP TRIGGER IF EXISTS purchases_activity_log ON public.purchases;
CREATE TRIGGER purchases_activity_log
AFTER INSERT OR UPDATE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();

CREATE OR REPLACE FUNCTION public.sync_purchase_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source_type = 'purchase'
     AND NEW.entry_type = 'payable'
     AND NEW.reference_type = 'purchase'
     AND NEW.reference_id IS NOT NULL
     AND NEW.status = 'paid'
     AND OLD.status IS DISTINCT FROM 'paid' THEN
    UPDATE public.purchases
       SET paid_amount = total_amount,
           payment_status = 'paid'
     WHERE id = NEW.reference_id
       AND owner_id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_entries_sync_purchase_payment ON public.finance_entries;
CREATE TRIGGER finance_entries_sync_purchase_payment
AFTER UPDATE OF status ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_purchase_payment_status();
