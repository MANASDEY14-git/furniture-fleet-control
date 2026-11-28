-- ==============================================================================
-- Migration: 20261124170000_indian_gst_compliance_engine.sql
-- Description: Phase 3 Indian GST Compliance Engine
-- 1. GST State Master Table with all 38 Indian State/UT Codes
-- 2. GST Master Data Enhancements for Stores, Customers, Suppliers, Items, Materials
-- 3. Sales Orders & Items Tax Breakdown & Place of Supply (POS) Engine
-- 4. Statutory Rule 46 Consecutive Invoice Number Generator (Max 16 chars)
-- 5. Analytical Views for GSTR-1 (B2B, B2CS, HSN) and GSTR-3B
-- ==============================================================================

-- 1. GST State Master Table
CREATE TABLE IF NOT EXISTS public.gst_states (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_union_territory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all 38 Indian State & UT Codes
INSERT INTO public.gst_states (code, name, is_union_territory) VALUES
  ('01', 'Jammu & Kashmir', true),
  ('02', 'Himachal Pradesh', false),
  ('03', 'Punjab', false),
  ('04', 'Chandigarh', true),
  ('05', 'Uttarakhand', false),
  ('06', 'Haryana', false),
  ('07', 'Delhi', true),
  ('08', 'Rajasthan', false),
  ('09', 'Uttar Pradesh', false),
  ('10', 'Bihar', false),
  ('11', 'Sikkim', false),
  ('12', 'Arunachal Pradesh', false),
  ('13', 'Nagaland', false),
  ('14', 'Manipur', false),
  ('15', 'Mizoram', false),
  ('16', 'Tripura', false),
  ('17', 'Meghalaya', false),
  ('18', 'Assam', false),
  ('19', 'West Bengal', false),
  ('20', 'Jharkhand', false),
  ('21', 'Odisha', false),
  ('22', 'Chhattisgarh', false),
  ('23', 'Madhya Pradesh', false),
  ('24', 'Gujarat', false),
  ('25', 'Daman and Diu', true),
  ('26', 'Dadra and Nagar Haveli', true),
  ('27', 'Maharashtra', false),
  ('28', 'Andhra Pradesh (Old)', false),
  ('29', 'Karnataka', false),
  ('30', 'Goa', false),
  ('31', 'Lakshadweep', true),
  ('32', 'Kerala', false),
  ('33', 'Tamil Nadu', false),
  ('34', 'Puducherry', true),
  ('35', 'Andaman & Nicobar Islands', true),
  ('36', 'Telangana', false),
  ('37', 'Andhra Pradesh (New)', false),
  ('38', 'Ladakh', true),
  ('97', 'Other Territory', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_union_territory = EXCLUDED.is_union_territory;

GRANT SELECT ON public.gst_states TO authenticated, anon;

-- 2. Store Master Enhancements
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(2) DEFAULT '19' REFERENCES public.gst_states(code),
  ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(6) DEFAULT 'BF',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing stores with their state code (all Kolkata / West Bengal)
UPDATE public.stores
SET state_code = '19',
    invoice_prefix = CASE 
      WHEN name ILIKE '%BIJOY%CHARU%' THEN 'BC'
      WHEN name ILIKE '%EASTERN%' THEN 'EF'
      ELSE 'BF'
    END
WHERE state_code IS NULL OR invoice_prefix IS NULL;

-- 3. Customer Master Enhancements
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(2) DEFAULT '19' REFERENCES public.gst_states(code),
  ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS gst_type VARCHAR(30) DEFAULT 'unregistered_consumer';

-- 4. Supplier Master Enhancements
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(2) DEFAULT '19' REFERENCES public.gst_states(code),
  ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS gst_type VARCHAR(30) DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS is_rcm_applicable BOOLEAN DEFAULT false;

-- 5. Items & Materials HSN & GST Rates
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10) DEFAULT '9403',
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS is_tax_inclusive BOOLEAN DEFAULT true;

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10) DEFAULT '9403',
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00;

-- 6. Sales Orders & Items GST Breakdown
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS place_of_supply_state_code VARCHAR(2) DEFAULT '19' REFERENCES public.gst_states(code),
  ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10) DEFAULT '9403',
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5,2) DEFAULT 9.00,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5,2) DEFAULT 9.00,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0;

-- 7. Consecutive Financial Year GST Invoice Sequence Table
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  financial_year VARCHAR(10) NOT NULL, -- e.g. '26-27'
  last_sequence INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_store_fy UNIQUE (store_id, financial_year)
);

-- Enable RLS & Grants on invoice_sequences
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read and manage invoice_sequences"
  ON public.invoice_sequences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. Statutory Rule 46 Consecutive Invoice Number Generator
CREATE OR REPLACE FUNCTION public.generate_gst_invoice_number(p_store_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year INT;
  v_month INT;
  v_fy VARCHAR(10);
  v_prefix VARCHAR(6);
  v_next_val INT;
  v_invoice_num VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM p_date);
  v_month := EXTRACT(MONTH FROM p_date);

  -- Indian Financial Year runs from April 1 to March 31
  IF v_month >= 4 THEN
    v_fy := TO_CHAR(v_year % 100, 'FM00') || '-' || TO_CHAR((v_year + 1) % 100, 'FM00');
  ELSE
    v_fy := TO_CHAR((v_year - 1) % 100, 'FM00') || '-' || TO_CHAR(v_year % 100, 'FM00');
  END IF;

  SELECT COALESCE(invoice_prefix, 'INV') INTO v_prefix
  FROM public.stores
  WHERE id = p_store_id;

  IF v_prefix IS NULL OR v_prefix = '' THEN
    v_prefix := 'INV';
  END IF;

  -- Atomic increment of sequence
  INSERT INTO public.invoice_sequences (store_id, financial_year, last_sequence, updated_at)
  VALUES (p_store_id, v_fy, 1, NOW())
  ON CONFLICT (store_id, financial_year)
  DO UPDATE SET
    last_sequence = public.invoice_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_next_val;

  -- Statutory Rule 46 Format: e.g. "BF/26-27/0001" (Max 16 chars)
  v_invoice_num := v_prefix || '/' || v_fy || '/' || LPAD(v_next_val::TEXT, 4, '0');

  RETURN v_invoice_num;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_gst_invoice_number(UUID, DATE) TO authenticated, service_role;

-- 9. Place of Supply (POS) & Line Tax Computation Function
CREATE OR REPLACE FUNCTION public.calculate_order_taxes(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_store_state VARCHAR(2);
  v_pos_state VARCHAR(2);
  v_is_intra_state BOOLEAN;
  v_item RECORD;
  v_item_taxable NUMERIC(12,2);
  v_cgst_rate NUMERIC(5,2);
  v_cgst_amt NUMERIC(12,2);
  v_sgst_rate NUMERIC(5,2);
  v_sgst_amt NUMERIC(12,2);
  v_igst_rate NUMERIC(5,2);
  v_igst_amt NUMERIC(12,2);
  v_total_taxable NUMERIC(12,2) := 0;
  v_total_cgst NUMERIC(12,2) := 0;
  v_total_sgst NUMERIC(12,2) := 0;
  v_total_igst NUMERIC(12,2) := 0;
  v_total_tax NUMERIC(12,2) := 0;
BEGIN
  -- Fetch order and store information
  SELECT o.*, s.state_code AS store_state_code
  INTO v_order
  FROM public.sales_orders o
  JOIN public.stores s ON o.store_id = s.id
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order % not found', p_order_id;
  END IF;

  v_store_state := COALESCE(v_order.store_state_code, '19');
  v_pos_state := COALESCE(v_order.place_of_supply_state_code, v_store_state);
  v_is_intra_state := (v_store_state = v_pos_state);

  -- Loop through each item in the order
  FOR v_item IN
    SELECT soi.*, COALESCE(i.gst_rate, 18.00) AS master_gst_rate, COALESCE(i.hsn_code, '9403') AS master_hsn,
           COALESCE(i.is_tax_inclusive, true) AS master_tax_inclusive
    FROM public.sales_order_items soi
    LEFT JOIN public.items i ON soi.item_id = i.id
    WHERE soi.order_id = p_order_id AND (soi.is_removed IS NOT TRUE)
  LOOP
    -- Calculate taxable amount:
    -- In standard retail, selling price is tax-inclusive:
    -- Taxable = Total / (1 + Rate / 100)
    -- If tax-exclusive: Taxable = Total
    IF v_item.master_tax_inclusive THEN
      v_item_taxable := ROUND((v_item.total_price / (1.0 + (v_item.master_gst_rate / 100.0))), 2);
    ELSE
      v_item_taxable := v_item.total_price;
    END IF;

    IF v_is_intra_state THEN
      v_cgst_rate := v_item.master_gst_rate / 2.0;
      v_sgst_rate := v_item.master_gst_rate / 2.0;
      v_igst_rate := 0.0;
      v_cgst_amt := ROUND((v_item_taxable * (v_cgst_rate / 100.0)), 2);
      v_sgst_amt := ROUND((v_item_taxable * (v_sgst_rate / 100.0)), 2);
      v_igst_amt := 0.0;
    ELSE
      v_cgst_rate := 0.0;
      v_sgst_rate := 0.0;
      v_igst_rate := v_item.master_gst_rate;
      v_cgst_amt := 0.0;
      v_sgst_amt := 0.0;
      v_igst_amt := ROUND((v_item_taxable * (v_igst_rate / 100.0)), 2);
    END IF;

    -- Update line item tax breakdown
    UPDATE public.sales_order_items
    SET hsn_code = v_item.master_hsn,
        gst_rate = v_item.master_gst_rate,
        taxable_amount = v_item_taxable,
        cgst_rate = v_cgst_rate,
        cgst_amount = v_cgst_amt,
        sgst_rate = v_sgst_rate,
        sgst_amount = v_sgst_amt,
        igst_rate = v_igst_rate,
        igst_amount = v_igst_amt
    WHERE id = v_item.id;

    v_total_taxable := v_total_taxable + v_item_taxable;
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;
  END LOOP;

  v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;

  -- Update order totals
  UPDATE public.sales_orders
  SET taxable_amount = v_total_taxable,
      cgst_amount = v_total_cgst,
      sgst_amount = v_total_sgst,
      igst_amount = v_total_igst,
      total_tax_amount = v_total_tax,
      invoice_date = COALESCE(invoice_date, date)
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'taxable_amount', v_total_taxable,
    'cgst_amount', v_total_cgst,
    'sgst_amount', v_total_sgst,
    'igst_amount', v_total_igst,
    'total_tax_amount', v_total_tax,
    'is_intra_state', v_is_intra_state
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.calculate_order_taxes(UUID) TO authenticated, service_role;

-- 10. Automated Invoice Numbering Trigger on Confirmed Orders
CREATE OR REPLACE FUNCTION public.assign_gst_invoice_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only assign statutory invoice number for orders (not quotes) that do not yet have one
  IF NEW.document_type = 'order' AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '') THEN
    NEW.invoice_number := public.generate_gst_invoice_number(NEW.store_id, COALESCE(NEW.date, CURRENT_DATE));
    NEW.invoice_date := COALESCE(NEW.date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assign_gst_invoice ON public.sales_orders;
CREATE TRIGGER trg_assign_gst_invoice
BEFORE INSERT ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.assign_gst_invoice_on_order();

-- 11. GSTR-1 & GSTR-3B Analytical Views
-- GSTR-1 B2B (Table 4: Registered Customers with GSTIN)
CREATE OR REPLACE VIEW public.view_gstr1_b2b AS
SELECT 
  o.id AS order_id,
  o.invoice_number,
  o.invoice_date,
  o.total_amount AS invoice_value,
  o.place_of_supply_state_code AS pos_state_code,
  pos.name AS pos_state_name,
  'N' AS reverse_charge,
  'Regular' AS invoice_type,
  c.gst_number AS recipient_gstin,
  COALESCE(c.legal_name, c.name, o.customer_name) AS recipient_name,
  o.taxable_amount,
  o.cgst_amount,
  o.sgst_amount,
  o.igst_amount,
  o.total_tax_amount,
  s.name AS store_name,
  s.gstin AS supplier_gstin
FROM public.sales_orders o
JOIN public.stores s ON o.store_id = s.id
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.gst_states pos ON o.place_of_supply_state_code = pos.code
WHERE o.document_type = 'order' 
  AND (o.status <> 'cancelled')
  AND (c.gst_number IS NOT NULL AND TRIM(c.gst_number) <> '');

-- GSTR-1 B2CS (Table 7: Small Retail / Unregistered Consumer Invoices)
CREATE OR REPLACE VIEW public.view_gstr1_b2cs AS
SELECT 
  'OE' AS type,
  COALESCE(o.place_of_supply_state_code, '19') AS pos_state_code,
  pos.name AS pos_state_name,
  COALESCE(soi.gst_rate, 18.00) AS rate,
  SUM(soi.taxable_amount) AS total_taxable_value,
  SUM(soi.cgst_amount) AS total_cgst,
  SUM(soi.sgst_amount) AS total_sgst,
  SUM(soi.igst_amount) AS total_igst,
  COUNT(DISTINCT o.id) AS invoice_count
FROM public.sales_orders o
JOIN public.sales_order_items soi ON o.id = soi.order_id
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.gst_states pos ON o.place_of_supply_state_code = pos.code
WHERE o.document_type = 'order'
  AND (o.status <> 'cancelled')
  AND (c.gst_number IS NULL OR TRIM(c.gst_number) = '')
  AND (soi.is_removed IS NOT TRUE)
GROUP BY o.place_of_supply_state_code, pos.name, soi.gst_rate;

-- GSTR-1 Table 12 HSN Summary of Outward Supplies
CREATE OR REPLACE VIEW public.view_gstr1_hsn_summary AS
SELECT 
  COALESCE(soi.hsn_code, '9403') AS hsn_code,
  'Wooden & Metal Furniture' AS description,
  'NOS' AS uqc,
  SUM(soi.quantity) AS total_quantity,
  SUM(soi.total_price) AS total_value,
  SUM(soi.taxable_amount) AS taxable_value,
  SUM(soi.igst_amount) AS integrated_tax_amount,
  SUM(soi.cgst_amount) AS central_tax_amount,
  SUM(soi.sgst_amount) AS state_tax_amount,
  SUM(soi.cgst_amount + soi.sgst_amount + soi.igst_amount) AS total_tax_amount
FROM public.sales_orders o
JOIN public.sales_order_items soi ON o.id = soi.order_id
WHERE o.document_type = 'order'
  AND (o.status <> 'cancelled')
  AND (soi.is_removed IS NOT TRUE)
GROUP BY soi.hsn_code;

-- GSTR-3B Outward Taxable Supplies Summary
CREATE OR REPLACE VIEW public.view_gstr3b_outward_supplies AS
SELECT 
  DATE_TRUNC('month', o.invoice_date)::DATE AS tax_period,
  '3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)' AS nature_of_supplies,
  SUM(o.taxable_amount) AS total_taxable_value,
  SUM(o.igst_amount) AS total_igst,
  SUM(o.cgst_amount) AS total_cgst,
  SUM(o.sgst_amount) AS total_sgst,
  0.00 AS total_cess
FROM public.sales_orders o
WHERE o.document_type = 'order'
  AND (o.status <> 'cancelled')
GROUP BY DATE_TRUNC('month', o.invoice_date);

GRANT SELECT ON public.view_gstr1_b2b TO authenticated, anon;
GRANT SELECT ON public.view_gstr1_b2cs TO authenticated, anon;
GRANT SELECT ON public.view_gstr1_hsn_summary TO authenticated, anon;
GRANT SELECT ON public.view_gstr3b_outward_supplies TO authenticated, anon;
