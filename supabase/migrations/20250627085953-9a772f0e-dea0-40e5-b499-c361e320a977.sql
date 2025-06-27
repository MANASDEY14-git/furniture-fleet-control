
-- Add last_restocked_date column to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS last_restocked_date DATE;

-- Update existing items to set last_restocked_date from stock_receive_date where available
UPDATE public.items 
SET last_restocked_date = stock_receive_date 
WHERE stock_receive_date IS NOT NULL AND last_restocked_date IS NULL;
