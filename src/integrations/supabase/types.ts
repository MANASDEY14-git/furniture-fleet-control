export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      attribute_values: {
        Row: {
          attribute_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          value: string
        }
        Update: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attribute_values_attribute_id"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_trails: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string | null
          bank_name: string
          branch_name: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          opening_balance: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          branch_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          branch_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bom: {
        Row: {
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          id: string
          is_active: boolean | null
          item_id: string | null
          last_cost_calculation: string | null
          name: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
          version_notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          last_cost_calculation?: string | null
          name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          last_cost_calculation?: string | null
          name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_component_options: {
        Row: {
          bom_component_id: string | null
          created_at: string | null
          id: string
          material_id: string | null
          option_name: string
        }
        Insert: {
          bom_component_id?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          option_name: string
        }
        Update: {
          bom_component_id?: string | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          option_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_component_options_bom_component_id_fkey"
            columns: ["bom_component_id"]
            isOneToOne: false
            referencedRelation: "bom_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_component_options_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_components: {
        Row: {
          bom_id: string | null
          component_name: string | null
          component_type: string
          created_at: string | null
          created_by: string | null
          hourly_rate: number | null
          id: string
          is_customizable: boolean | null
          labor_category_id: string | null
          material_id: string | null
          notes: string | null
          quantity_required: number
          service_cost: number | null
          time_hours: number | null
          time_minutes: number | null
          updated_by: string | null
        }
        Insert: {
          bom_id?: string | null
          component_name?: string | null
          component_type?: string
          created_at?: string | null
          created_by?: string | null
          hourly_rate?: number | null
          id?: string
          is_customizable?: boolean | null
          labor_category_id?: string | null
          material_id?: string | null
          notes?: string | null
          quantity_required: number
          service_cost?: number | null
          time_hours?: number | null
          time_minutes?: number | null
          updated_by?: string | null
        }
        Update: {
          bom_id?: string | null
          component_name?: string | null
          component_type?: string
          created_at?: string | null
          created_by?: string | null
          hourly_rate?: number | null
          id?: string
          is_customizable?: boolean | null
          labor_category_id?: string | null
          material_id?: string | null
          notes?: string | null
          quantity_required?: number
          service_cost?: number | null
          time_hours?: number | null
          time_minutes?: number | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_components_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bom"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_components_labor_category_id_fkey"
            columns: ["labor_category_id"]
            isOneToOne: false
            referencedRelation: "labor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_components_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      item_variants: {
        Row: {
          attributes: Json | null
          cost_price: number
          created_at: string | null
          id: string
          is_active: boolean | null
          parent_item_id: string
          quantity_available: number
          selling_price: number
          sku: string | null
          updated_at: string | null
          variant_name: string
        }
        Insert: {
          attributes?: Json | null
          cost_price?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_item_id: string
          quantity_available?: number
          selling_price?: number
          sku?: string | null
          updated_at?: string | null
          variant_name: string
        }
        Update: {
          attributes?: Json | null
          cost_price?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_item_id?: string
          quantity_available?: number
          selling_price?: number
          sku?: string | null
          updated_at?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_variants_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string | null
          id: string
          last_restocked_date: string | null
          name: string
          quantity_available: number
          selling_price: number
          stock_receive_date: string | null
          store_id: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price: number
          created_at?: string | null
          id?: string
          last_restocked_date?: string | null
          name: string
          quantity_available?: number
          selling_price: number
          stock_receive_date?: string | null
          store_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          last_restocked_date?: string | null
          name?: string
          quantity_available?: number
          selling_price?: number
          stock_receive_date?: string | null
          store_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_categories: {
        Row: {
          created_at: string | null
          default_hourly_rate: number | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_hourly_rate?: number | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_hourly_rate?: number | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      low_stock_alerts: {
        Row: {
          created_at: string
          current_quantity: number
          id: string
          is_resolved: boolean
          item_id: string
          item_name: string
          resolved_at: string | null
          store_id: string | null
          threshold_quantity: number
        }
        Insert: {
          created_at?: string
          current_quantity: number
          id?: string
          is_resolved?: boolean
          item_id: string
          item_name: string
          resolved_at?: string | null
          store_id?: string | null
          threshold_quantity?: number
        }
        Update: {
          created_at?: string
          current_quantity?: number
          id?: string
          is_resolved?: boolean
          item_id?: string
          item_name?: string
          resolved_at?: string | null
          store_id?: string | null
          threshold_quantity?: number
        }
        Relationships: []
      }
      material_purchases: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          invoice_number: string | null
          material_id: string | null
          quantity: number
          store_id: string | null
          supplier_id: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          invoice_number?: string | null
          material_id?: string | null
          quantity: number
          store_id?: string | null
          supplier_id?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          invoice_number?: string | null
          material_id?: string | null
          quantity?: number
          store_id?: string | null
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_stock_movements: {
        Row: {
          created_at: string | null
          id: string
          material_id: string | null
          movement_type: string
          notes: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          movement_type: string
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          movement_type?: string
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          cost_price: number
          created_at: string | null
          id: string
          name: string
          quantity_available: number | null
          store_id: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          cost_price?: number
          created_at?: string | null
          id?: string
          name: string
          quantity_available?: number | null
          store_id?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          id?: string
          name?: string
          quantity_available?: number | null
          store_id?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_charges: number | null
          card_last_four: string | null
          cheque_date: string | null
          cheque_number: string | null
          cleared_at: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          net_amount: number | null
          notes: string | null
          payment_gateway: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status: string | null
          reference_id: string | null
          reference_type: string | null
          sale_id: string | null
          store_id: string | null
          supplier_id: string | null
          transaction_reference: string | null
          type: string
          upi_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_charges?: number | null
          card_last_four?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          cleared_at?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_gateway?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          store_id?: string | null
          supplier_id?: string | null
          transaction_reference?: string | null
          type: string
          upi_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_charges?: number | null
          card_last_four?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          cleared_at?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_gateway?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          store_id?: string | null
          supplier_id?: string | null
          transaction_reference?: string | null
          type?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_payment_status"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_completed: boolean
          onboarding_step: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string | null
          date: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          item_id: string | null
          item_name: string
          items: Json | null
          quantity: number
          store_id: string | null
          supplier_id: string | null
          total_cost: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_id?: string | null
          item_name: string
          items?: Json | null
          quantity: number
          store_id?: string | null
          supplier_id?: string | null
          total_cost: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_id?: string | null
          item_name?: string
          items?: Json | null
          quantity?: number
          store_id?: string | null
          supplier_id?: string | null
          total_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          date: string
          delivery_status: string
          id: string
          item_id: string | null
          item_name: string
          quantity: number
          store_id: string | null
          supplier_id: string | null
          total_price: number
        }
        Insert: {
          created_at?: string | null
          date: string
          delivery_status: string
          id?: string
          item_id?: string | null
          item_name: string
          quantity: number
          store_id?: string | null
          supplier_id?: string | null
          total_price: number
        }
        Update: {
          created_at?: string | null
          date?: string
          delivery_status?: string
          id?: string
          item_id?: string | null
          item_name?: string
          quantity?: number
          store_id?: string | null
          supplier_id?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_customizations: {
        Row: {
          bom_component_id: string | null
          created_at: string | null
          id: string
          quantity_used: number
          sale_id: string | null
          selected_material_id: string | null
          selected_option_name: string | null
        }
        Insert: {
          bom_component_id?: string | null
          created_at?: string | null
          id?: string
          quantity_used: number
          sale_id?: string | null
          selected_material_id?: string | null
          selected_option_name?: string | null
        }
        Update: {
          bom_component_id?: string | null
          created_at?: string | null
          id?: string
          quantity_used?: number
          sale_id?: string | null
          selected_material_id?: string | null
          selected_option_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_customizations_sale_id"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_payment_status"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "fk_sales_customizations_sale_id"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sales_customizations_selected_material_id"
            columns: ["selected_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customizations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customizations_selected_material_id_fkey"
            columns: ["selected_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          order_id: string
          quantity: number
          stock_deducted: boolean | null
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          order_id: string
          quantity: number
          stock_deducted?: boolean | null
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          order_id?: string
          quantity?: number
          stock_deducted?: boolean | null
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sale_payment_status"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          advance_paid: number | null
          balance_due: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string
          delivered_at: string | null
          delivery_date: string | null
          delivery_status: string
          description: string | null
          id: string
          order_number: string
          status: string | null
          store_id: string | null
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          advance_paid?: number | null
          balance_due?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date: string
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_status?: string
          description?: string | null
          id?: string
          order_number: string
          status?: string | null
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          advance_paid?: number | null
          balance_due?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_status?: string
          description?: string | null
          id?: string
          order_number?: string
          status?: string | null
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string | null
          id: string
          location: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_ledger: {
        Row: {
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          invoice_number: string | null
          payment_reference: string | null
          store_id: string
          supplier_id: string
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          payment_reference?: string | null
          store_id: string
          supplier_id: string
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          payment_reference?: string | null
          store_id?: string
          supplier_id?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_store_access: {
        Row: {
          created_at: string | null
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bank_transaction_ledger: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number | null
          bank_charges: number | null
          bank_name: string | null
          card_last_four: string | null
          cheque_date: string | null
          cheque_number: string | null
          cleared_at: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string | null
          net_amount: number | null
          payment_gateway: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status: string | null
          store_name: string | null
          supplier_name: string | null
          transaction_reference: string | null
          type: string | null
          upi_id: string | null
        }
        Relationships: []
      }
      payment_summary: {
        Row: {
          net_balance: number | null
          store_id: string | null
          total_payments: number | null
          total_receipts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payment_status: {
        Row: {
          balance_due: number | null
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_date: string | null
          delivery_status: string | null
          order_number: string | null
          sale_date: string | null
          sale_id: string | null
          store_id: string | null
          supplier_id: string | null
          total_paid: number | null
          total_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_customer_pii: { Args: { _user_id?: string }; Returns: boolean }
      get_bank_transactions: {
        Args: { _store_id?: string }
        Returns: {
          account_name: string
          account_number: string
          amount: number
          bank_charges: number
          bank_name: string
          card_last_four: string
          cheque_date: string
          cheque_number: string
          cleared_at: string
          created_at: string
          date: string
          description: string
          id: string
          net_amount: number
          payment_gateway: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          payment_status: string
          store_name: string
          supplier_name: string
          transaction_reference: string
          type: string
          upi_id: string
        }[]
      }
      get_sales_orders_for_user: {
        Args: { _store_id?: string }
        Returns: {
          advance_paid: number
          balance_due: number
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          date: string
          delivered_at: string
          delivery_date: string
          delivery_status: string
          description: string
          id: string
          order_number: string
          status: string
          store_id: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_sales_orders_secure: {
        Args: { _store_id?: string; _user_id?: string }
        Returns: {
          advance_paid: number
          balance_due: number
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          date: string
          delivered_at: string
          delivery_date: string
          delivery_status: string
          description: string
          id: string
          order_number: string
          status: string
          store_id: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ping: { Args: never; Returns: undefined }
      search_items_enhanced: {
        Args: {
          category_id_filter?: string
          page_offset?: number
          page_size?: number
          search_term?: string
          show_low_stock_only?: boolean
          store_id_filter?: string
          supplier_id_filter?: string
        }
        Returns: {
          category_id: string
          cost_price: number
          created_at: string
          has_variants: boolean
          id: string
          last_restocked_date: string
          name: string
          quantity_available: number
          selling_price: number
          stock_receive_date: string
          store_id: string
          supplier_id: string
          total_count: number
          total_quantity: number
          updated_at: string
        }[]
      }
      user_has_store_access: { Args: { _store_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "employee"
        | "sales_representative"
        | "accountant"
      payment_method_type:
        | "cash"
        | "upi"
        | "bank_transfer"
        | "debit_card"
        | "credit_card"
        | "cheque"
        | "online_wallet"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "employee",
        "sales_representative",
        "accountant",
      ],
      payment_method_type: [
        "cash",
        "upi",
        "bank_transfer",
        "debit_card",
        "credit_card",
        "cheque",
        "online_wallet",
        "other",
      ],
    },
  },
} as const
