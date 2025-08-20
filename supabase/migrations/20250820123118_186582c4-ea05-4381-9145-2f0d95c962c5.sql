-- Enable RLS on material_purchases table
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (corrected)
GRANT ALL ON public.material_purchases TO authenticated;
GRANT ALL ON public.material_purchases TO service_role;
GRANT SELECT ON public.material_purchases TO anon;

-- Create RLS policy for material_purchases
CREATE POLICY "Users can manage material purchases for their stores" 
ON public.material_purchases 
FOR ALL 
USING (user_has_store_access(store_id));

-- Create trigger for material stock updates
CREATE TRIGGER update_material_stock_on_purchase_trigger
AFTER INSERT ON public.material_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_material_stock_on_purchase();