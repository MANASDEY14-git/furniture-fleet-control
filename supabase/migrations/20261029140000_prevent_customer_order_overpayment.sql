-- Migration: Prevent Customer Order Overpayment
-- Ensures payments collected on a sales order cannot exceed the remaining balance due

CREATE OR REPLACE FUNCTION public.check_payment_not_exceeding_order_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.sales_orders%ROWTYPE;
  v_total_paid numeric;
  v_remaining numeric;
BEGIN
  -- Only enforce on customer receipt payments attached to a sales order
  IF NEW.type = 'Receipt' AND NEW.sale_id IS NOT NULL THEN
    IF NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    SELECT * INTO v_order FROM public.sales_orders WHERE id = NEW.sale_id FOR UPDATE;
    IF FOUND THEN
      -- Calculate existing receipts for this order excluding the current record (for updates)
      SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
      FROM public.payments
      WHERE sale_id = NEW.sale_id 
        AND type = 'Receipt' 
        AND (NEW.id IS NULL OR id <> NEW.id);

      v_remaining := v_order.total_amount - v_total_paid;

      -- Allow a 0.01 tolerance for minor fractional rounding
      IF NEW.amount > (v_remaining + 0.01) THEN
        RAISE EXCEPTION 'Cannot collect ₹%. Maximum due amount remaining for order % is ₹%',
          round(NEW.amount, 2), v_order.order_number, round(v_remaining, 2);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_payment_not_exceeding_order_balance ON public.payments;

CREATE TRIGGER trg_check_payment_not_exceeding_order_balance
BEFORE INSERT OR UPDATE OF amount, sale_id, type ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.check_payment_not_exceeding_order_balance();
