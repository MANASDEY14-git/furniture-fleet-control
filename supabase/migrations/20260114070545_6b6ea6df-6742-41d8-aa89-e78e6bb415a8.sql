-- Phase 1: Enhanced BOM Customization Schema
-- Add new columns to bom_component_options for per-option quantity and default flag
ALTER TABLE bom_component_options 
ADD COLUMN IF NOT EXISTS quantity_required NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_adjustment NUMERIC DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN bom_component_options.quantity_required IS 'Optional per-option quantity override. If null, uses parent component quantity.';
COMMENT ON COLUMN bom_component_options.is_default IS 'Marks the default/display option for cost calculation and inventory display.';
COMMENT ON COLUMN bom_component_options.price_adjustment IS 'Price adjustment for premium options (positive for surcharge, negative for discount).';

-- Create index for faster default option lookups
CREATE INDEX IF NOT EXISTS idx_bom_component_options_default ON bom_component_options (bom_component_id, is_default) WHERE is_default = true;