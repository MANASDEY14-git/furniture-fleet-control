import { z } from 'zod';

// Base interfaces for BOM system
export interface BOMComponentOption {
  id: string;
  bom_component_id: string;
  material_id: string;
  option_name: string;
  materials: {
    id: string;
    name: string;
    unit?: string;
    quantity_available: number;
    cost_price: number;
  };
}

export interface BOMComponent {
  id: string;
  bom_id: string;
  material_id?: string;
  quantity_required: number;
  component_name?: string;
  is_customizable: boolean;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  component_type: 'material' | 'labor' | 'service';
  time_hours?: number;
  time_minutes?: number;
  hourly_rate?: number;
  service_cost?: number;
  labor_category_id?: string;
  materials?: {
    id: string;
    name: string;
    unit?: string;
    quantity_available: number;
    cost_price: number;
  };
  labor_categories?: {
    id: string;
    name: string;
    description?: string;
    default_hourly_rate: number;
  };
  bom_component_options: BOMComponentOption[];
}

export interface BOM {
  id: string;
  item_id: string;
  name?: string;
  is_active: boolean;
  version: number;
  version_notes?: string;
  estimated_cost: number;
  last_cost_calculation?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  bom_components: BOMComponent[];
}

export interface SalesCustomization {
  id: string;
  sale_id: string;
  bom_component_id: string;
  selected_material_id: string;
  selected_option_name: string;
  quantity_used: number;
  created_at: string;
}

// Validation schemas with Zod
export const BOMComponentOptionSchema = z.object({
  material_id: z.string().uuid(),
  option_name: z.string().min(1, 'Option name is required'),
});

export const BOMComponentSchema = z.object({
  material_id: z.string().uuid().optional(),
  quantity_required: z.number().positive('Quantity must be positive'),
  component_name: z.string().optional(),
  is_customizable: z.boolean(),
  notes: z.string().optional(),
  component_type: z.enum(['material', 'labor', 'service']).default('material'),
  time_hours: z.number().min(0).optional(),
  time_minutes: z.number().min(0).max(59).optional(),
  hourly_rate: z.number().min(0).optional(),
  service_cost: z.number().min(0).optional(),
  labor_category_id: z.string().uuid().optional(),
  options: z.array(BOMComponentOptionSchema).optional(),
});

export const CreateBOMSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().optional(),
  version_notes: z.string().optional(),
  components: z.array(BOMComponentSchema).min(1, 'At least one component is required'),
});

export const UpdateBOMSchema = z.object({
  bomId: z.string().uuid(),
  itemId: z.string().uuid(),
  name: z.string().optional(),
  version_notes: z.string().optional(),
  components: z.array(BOMComponentSchema).min(1, 'At least one component is required'),
});

export const SalesCustomizationSchema = z.object({
  sale_id: z.string().uuid(),
  bom_component_id: z.string().uuid(),
  selected_material_id: z.string().uuid(),
  selected_option_name: z.string().min(1, 'Option name is required'),
  quantity_used: z.number().positive('Quantity must be positive'),
});

// Form data types
export interface CreateBOMComponentData {
  material_id?: string;
  quantity_required: number;
  component_name?: string;
  is_customizable: boolean;
  notes?: string;
  component_type: 'material' | 'labor' | 'service';
  time_hours?: number;
  time_minutes?: number;
  hourly_rate?: number;
  service_cost?: number;
  labor_category_id?: string;
  options?: {
    material_id: string;
    option_name: string;
  }[];
}

export interface CreateBOMData {
  item_id: string;
  name?: string;
  version_notes?: string;
  components: CreateBOMComponentData[];
}

export interface UpdateBOMData {
  bomId: string;
  itemId: string;
  name?: string;
  version_notes?: string;
  components: CreateBOMComponentData[];
}

export interface CreateSalesCustomizationData {
  sale_id: string;
  bom_component_id: string;
  selected_material_id: string;
  selected_option_name: string;
  quantity_used: number;
}

// Utility types for BOM operations
export interface BOMCostCalculation {
  totalEstimatedCost: number;
  componentCosts: Array<{
    componentId: string;
    componentName?: string;
    materialName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  materialsAvailable: boolean;
  unavailableMaterials: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
    shortage: number;
  }>;
}

export interface BOMValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Template types for BOM reuse
export interface BOMTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  components: Omit<CreateBOMComponentData, 'material_id'>[];
  estimatedCost?: number;
  createdAt: string;
  updatedAt: string;
}

// Search and filter types
export interface BOMSearchFilters {
  searchTerm?: string;
  categoryId?: string;
  hasStockIssues?: boolean;
  isActive?: boolean;
  sortBy?: 'name' | 'cost' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface BOMListItem {
  id: string;
  item_id: string;
  item_name: string;
  name?: string;
  estimated_cost: number;
  component_count: number;
  has_stock_issues: boolean;
  is_active: boolean;
  last_updated: string;
  version: number;
}