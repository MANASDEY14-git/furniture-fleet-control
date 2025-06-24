
-- Create audit_trails table to track all transactions
CREATE TABLE public.audit_trails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_audit_trails_table_record ON public.audit_trails(table_name, record_id);
CREATE INDEX idx_audit_trails_created_at ON public.audit_trails(created_at);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_trails (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_trails (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trails (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for all main tables
CREATE TRIGGER audit_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_purchases_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_stores_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Create low_stock_alerts table
CREATE TABLE public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  current_quantity INTEGER NOT NULL,
  threshold_quantity INTEGER NOT NULL DEFAULT 10,
  store_id UUID,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create index for better query performance
CREATE INDEX idx_low_stock_alerts_item_id ON public.low_stock_alerts(item_id);
CREATE INDEX idx_low_stock_alerts_resolved ON public.low_stock_alerts(is_resolved);
