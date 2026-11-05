-- Atomic, owner-scoped supplier payment settlement.
-- SECURITY DEFINER is required because the idempotency ledger is intentionally
-- not writable by clients. The function checks auth.uid() and explicitly scopes
-- every purchase, supplier, and finance row by owner_id.
-- Draft migration for review; this file is not applied to the live Supabase project.

create table if not exists public.purchase_payment_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  request_id uuid not null,
  amount numeric not null check (amount > 0),
  paid_total_after numeric not null check (paid_total_after >= 0),
  remaining_after numeric not null check (remaining_after >= 0),
  payment_status_after text not null
    check (payment_status_after in ('partial', 'paid')),
  created_at timestamptz not null default now(),
  constraint purchase_payment_events_owner_request_unique
    unique (owner_id, request_id)
);

create index if not exists purchase_payment_events_purchase_created_idx
  on public.purchase_payment_events (owner_id, purchase_id, created_at desc);

alter table public.purchase_payment_events enable row level security;

drop policy if exists purchase_payment_events_owner_select
  on public.purchase_payment_events;
create policy purchase_payment_events_owner_select
  on public.purchase_payment_events
  for select to authenticated
  using ((select auth.uid()) = owner_id);

-- The event ledger is read-only to the client. Writes are performed only by
-- the owner-checked RPC below, so clients cannot forge an idempotency receipt.
drop policy if exists purchase_payment_events_owner_insert
  on public.purchase_payment_events;

revoke all on table public.purchase_payment_events from anon, public, authenticated;
grant select on table public.purchase_payment_events to authenticated;

create or replace function public.settle_purchase_payment(
  p_purchase_id uuid,
  p_amount numeric,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_purchase public.purchases%rowtype;
  v_existing public.purchase_payment_events%rowtype;
  v_payable_count integer := 0;
  v_payable_id uuid;
  v_counterparty text;
  v_new_paid numeric;
  v_remaining numeric;
  v_new_status text;
  v_event_id uuid;
  v_updated_rows integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Giriş tələb olunur';
  end if;

  if p_purchase_id is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'Alış və sorğu identifikatoru tələb olunur';
  end if;

  if p_amount is null
     or p_amount <= 0
     or p_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '22023', message = 'Ödəniş məbləği düzgün deyil';
  end if;

  -- Lock the purchase first so concurrent payments for the same purchase serialize.
  select p.*
    into v_purchase
    from public.purchases as p
   where p.id = p_purchase_id
     and p.owner_id = v_user_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Alış qeydi tapılmadı';
  end if;

  -- A retry with the same request ID returns the original result without charging twice.
  select e.*
    into v_existing
    from public.purchase_payment_events as e
   where e.owner_id = v_user_id
     and e.request_id = p_request_id;

  if found then
    if v_existing.purchase_id is distinct from p_purchase_id
       or v_existing.amount is distinct from p_amount then
      raise exception using errcode = '22023',
        message = 'Bu sorğu identifikatoru başqa ödəniş üçün artıq istifadə olunub';
    end if;

    return pg_catalog.jsonb_build_object(
      'success', true,
      'replayed', true,
      'purchase_id', v_existing.purchase_id,
      'paid_amount', v_existing.paid_total_after,
      'remaining_amount', v_existing.remaining_after,
      'payment_status', v_existing.payment_status_after,
      'request_id', v_existing.request_id
    );
  end if;

  v_remaining := v_purchase.total_amount - v_purchase.paid_amount;

  if v_remaining <= 0 or p_amount > v_remaining then
    raise exception using errcode = '22023',
      message = 'Ödəniş məbləği qalıq borcdan çox ola bilməz';
  end if;

  v_new_paid := v_purchase.paid_amount + p_amount;
  v_remaining := case when v_purchase.total_amount - v_new_paid < 0 then 0 else v_purchase.total_amount - v_new_paid end;
  v_new_status := case when v_remaining = 0 then 'paid' else 'partial' end;

  -- Claim the idempotency key inside the same transaction as all ledger writes.
  insert into public.purchase_payment_events (
    owner_id, purchase_id, request_id, amount,
    paid_total_after, remaining_after, payment_status_after
  )
  values (
    v_user_id, p_purchase_id, p_request_id, p_amount,
    v_new_paid, v_remaining, v_new_status
  )
  on conflict (owner_id, request_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select e.*
      into v_existing
      from public.purchase_payment_events as e
     where e.owner_id = v_user_id
       and e.request_id = p_request_id;

    if not found
       or v_existing.purchase_id is distinct from p_purchase_id
       or v_existing.amount is distinct from p_amount then
      raise exception using errcode = '22023',
        message = 'Sorğu identifikatoru artıq başqa əməliyyatda istifadə olunub';
    end if;

    return pg_catalog.jsonb_build_object(
      'success', true,
      'replayed', true,
      'purchase_id', v_existing.purchase_id,
      'paid_amount', v_existing.paid_total_after,
      'remaining_amount', v_existing.remaining_after,
      'payment_status', v_existing.payment_status_after,
      'request_id', v_existing.request_id
    );
  end if;

  -- If a legacy purchase has no payable row, retain the supplier name when
  -- reconstructing its outstanding balance.
  if v_counterparty is null and v_purchase.supplier_id is not null then
    select s.name
      into v_counterparty
      from public.suppliers as s
     where s.id = v_purchase.supplier_id
       and s.owner_id = v_user_id;
  end if;

  -- Lock and validate the existing payable entry before changing the ledger.
  perform fe.id
    from public.finance_entries as fe
   where fe.owner_id = v_user_id
     and fe.reference_type = 'purchase'
     and fe.reference_id = p_purchase_id
     and fe.entry_type = 'payable'
   for update;

  select count(*)
    into v_payable_count
    from public.finance_entries as fe
   where fe.owner_id = v_user_id
     and fe.reference_type = 'purchase'
     and fe.reference_id = p_purchase_id
     and fe.entry_type = 'payable';

  if v_payable_count > 1 then
    raise exception using errcode = 'P0001',
      message = 'Bu alış üçün birdən çox borc qeydi tapıldı; maliyyə tarixçəsi yoxlanmalıdır';
  elsif v_payable_count = 1 then
    select fe.id, fe.counterparty
      into v_payable_id, v_counterparty
      from public.finance_entries as fe
     where fe.owner_id = v_user_id
       and fe.reference_type = 'purchase'
       and fe.reference_id = p_purchase_id
       and fe.entry_type = 'payable';
  end if;

  -- Expense, payable, purchase balance and idempotency event commit or roll back together.
  insert into public.finance_entries (
    owner_id, entry_type, amount, status, title, counterparty,
    payment_account, source_type, reference_type, reference_id,
    paid_at, notes
  )
  values (
    v_user_id, 'expense', p_amount, 'paid', 'Məhsul alışı · əlavə ödəniş',
    v_counterparty, v_purchase.payment_account, 'purchase', 'purchase',
    p_purchase_id, pg_catalog.now(), v_purchase.notes
  );

  if v_payable_count = 1 then
    if v_remaining > 0 then
      update public.finance_entries
         set amount = v_remaining,
             status = 'pending',
             paid_at = null
       where id = v_payable_id
         and owner_id = v_user_id;
    else
      delete from public.finance_entries
       where id = v_payable_id
         and owner_id = v_user_id;
    end if;
  elsif v_remaining > 0 then
    insert into public.finance_entries (
      owner_id, entry_type, amount, status, title, counterparty,
      payment_account, source_type, reference_type, reference_id,
      due_date, notes
    )
    values (
      v_user_id, 'payable', v_remaining, 'pending', 'Məhsul alışı · qalıq borc',
      v_counterparty, v_purchase.payment_account, 'purchase', 'purchase',
      p_purchase_id, v_purchase.purchased_at::date, v_purchase.notes
    );
  end if;

  update public.purchases
     set paid_amount = v_new_paid,
         payment_status = v_new_status
   where id = p_purchase_id
     and owner_id = v_user_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception using errcode = 'P0001',
      message = 'Alış balansı yenilənmədi; əməliyyat geri qaytarıldı';
  end if;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'replayed', false,
    'purchase_id', p_purchase_id,
    'paid_amount', v_new_paid,
    'remaining_amount', v_remaining,
    'payment_status', v_new_status,
    'request_id', p_request_id
  );
end;
$function$;

revoke all on function public.settle_purchase_payment(uuid, numeric, uuid)
  from public, anon, authenticated;
grant execute on function public.settle_purchase_payment(uuid, numeric, uuid)
  to authenticated;
