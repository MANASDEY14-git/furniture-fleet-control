-- Phase 1: Database Schema Optimization for BOM System
-- Add proper foreign key constraints and indexes for better data integrity and performance

-- Add foreign key constraints for data integrity
ALTER TABLE bom 
ADD CONSTRAINT fk_bom_item_id 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE bom_components 
ADD CONSTRAINT fk_bom_components_bom_id 
FOREIGN KEY (bom_id) REFERENCES bom(id) ON DELETE CASCADE;

ALTER TABLE bom_components 
ADD CONSTRAINT fk_bom_components_material_id 
FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT;

ALTER TABLE bom_component_options 
ADD CONSTRAINT fk_bom_component_options_bom_component_id 
FOREIGN KEY (bom_component_id) REFERENCES bom_components(id) ON DELETE CASCADE;

ALTER TABLE bom_component_options 
ADD CONSTRAINT fk_bom_component_options_material_id 
FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT;

ALTER TABLE sales_customizations 
ADD CONSTRAINT fk_sales_customizations_sale_id 
FOREIGN KEY (sale_id) REFERENCES sales_orders(id) ON DELETE CASCADE;

ALTER TABLE sales_customizations 
ADD CONSTRAINT fk_sales_customizations_bom_component_id 
FOREIGN KEY (bom_component_id) REFERENCES bom_components(id) ON DELETE CASCADE;

ALTER TABLE sales_customizations 
ADD CONSTRAINT fk_sales_customizations_selected_material_id 
FOREIGN KEY (selected_material_id) REFERENCES materials(id) ON DELETE RESTRICT;

-- Add performance indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_bom_item_id ON bom(item_id);
CREATE INDEX IF NOT EXISTS idx_bom_is_active ON bom(is_active);
CREATE INDEX IF NOT EXISTS idx_bom_components_bom_id ON bom_components(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_material_id ON bom_components(material_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_customizable ON bom_components(is_customizable);
CREATE INDEX IF NOT EXISTS idx_bom_component_options_component_id ON bom_component_options(bom_component_id);
CREATE INDEX IF NOT EXISTS idx_sales_customizations_sale_id ON sales_customizations(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_customizations_component_id ON sales_customizations(bom_component_id);

-- Add validation constraints
ALTER TABLE bom_components 
ADD CONSTRAINT chk_quantity_required_positive 
CHECK (quantity_required > 0);

ALTER TABLE sales_customizations 
ADD CONSTRAINT chk_quantity_used_positive 
CHECK (quantity_used > 0);

-- Add BOM versioning support
ALTER TABLE bom ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE bom ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Add cost tracking to BOM
ALTER TABLE bom ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0;
ALTER TABLE bom ADD COLUMN IF NOT EXISTS last_cost_calculation TIMESTAMP WITH TIME ZONE;

-- Create function to update BOM estimated cost
CREATE OR REPLACE FUNCTION update_bom_estimated_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the BOM's estimated cost when components change
  UPDATE bom 
  SET estimated_cost = (
    SELECT COALESCE(SUM(bc.quantity_required * m.cost_price), 0)
    FROM bom_components bc
    JOIN materials m ON m.id = bc.material_id
    WHERE bc.bom_id = COALESCE(NEW.bom_id, OLD.bom_id)
  ),
  last_cost_calculation = NOW()
  WHERE id = COALESCE(NEW.bom_id, OLD.bom_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic cost calculation
DROP TRIGGER IF EXISTS trigger_update_bom_cost ON bom_components;
CREATE TRIGGER trigger_update_bom_cost
  AFTER INSERT OR UPDATE OR DELETE ON bom_components
  FOR EACH ROW
  EXECUTE FUNCTION update_bom_estimated_cost();

-- Add audit fields to track changes
ALTER TABLE bom ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE bom ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE bom_components ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE bom_components ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create function to automatically set user audit fields
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create audit triggers
DROP TRIGGER IF EXISTS trigger_bom_audit ON bom;
CREATE TRIGGER trigger_bom_audit
  BEFORE INSERT OR UPDATE ON bom
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trigger_bom_components_audit ON bom_components;
CREATE TRIGGER trigger_bom_components_audit
  BEFORE INSERT OR UPDATE ON bom_components
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_fields();