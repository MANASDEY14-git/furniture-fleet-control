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
      agent_briefings: {
        Row: {
          agent_outputs: Json
          created_at: string
          generated_at: string
          generated_for_date: string
          id: string
          source: string
          store_id: string
          summary: string
        }
        Insert: {
          agent_outputs?: Json
          created_at?: string
          generated_at?: string
          generated_for_date?: string
          id?: string
          source?: string
          store_id: string
          summary: string
        }
        Update: {
          agent_outputs?: Json
          created_at?: string
          generated_at?: string
          generated_for_date?: string
          id?: string
          source?: string
          store_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_briefings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          briefing_enabled: boolean
          briefing_time: string
          briefing_timezone: string
          created_at: string
          enabled_agents: string[]
          last_briefing_at: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          briefing_enabled?: boolean
          briefing_time?: string
          briefing_timezone?: string
          created_at?: string
          enabled_agents?: string[]
          last_briefing_at?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          briefing_enabled?: boolean
          briefing_time?: string
          briefing_timezone?: string
          created_at?: string
          enabled_agents?: string[]
          last_briefing_at?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          store_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          category: string
          confidence: number
          created_at: string | null
          id: string
          impact_score: number
          priority: string
          recommendation: string
          store_id: string | null
          summary: string
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string | null
          id?: string
          impact_score?: number
          priority: string
          recommendation: string
          store_id?: string | null
          summary: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string | null
          id?: string
          impact_score?: number
          priority?: string
          recommendation?: string
          store_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          is_default: boolean | null
          material_id: string | null
          option_name: string
          price_adjustment: number | null
          quantity_required: number | null
        }
        Insert: {
          bom_component_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          material_id?: string | null
          option_name: string
          price_adjustment?: number | null
          quantity_required?: number | null
        }
        Update: {
          bom_component_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          material_id?: string | null
          option_name?: string
          price_adjustment?: number | null
          quantity_required?: number | null
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
          service_cost_type: string
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
          service_cost_type?: string
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
          service_cost_type?: string
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
      customer_addresses: {
        Row: {
          address: string
          contact_person: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address: string
          contact_person?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          contact_person?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_ledger: {
        Row: {
          created_at: string
          credit_amount: number
          customer_id: string
          debit_amount: number
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          store_id: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number
          customer_id: string
          debit_amount?: number
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          store_id: string
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          credit_amount?: number
          customer_id?: string
          debit_amount?: number
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_business_kpis: {
        Row: {
          collections_amount: number
          created_at: string | null
          date: string
          dead_stock_value: number
          delivery_success_rate: number
          gross_margin: number
          id: string
          inventory_value: number
          pending_collections: number
          sales_amount: number
          store_id: string
        }
        Insert: {
          collections_amount?: number
          created_at?: string | null
          date: string
          dead_stock_value?: number
          delivery_success_rate?: number
          gross_margin?: number
          id?: string
          inventory_value?: number
          pending_collections?: number
          sales_amount?: number
          store_id: string
        }
        Update: {
          collections_amount?: number
          created_at?: string | null
          date?: string
          dead_stock_value?: number
          delivery_success_rate?: number
          gross_margin?: number
          id?: string
          inventory_value?: number
          pending_collections?: number
          sales_amount?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_business_kpis_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_closed: boolean | null
          label: string
          start_date: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          label: string
          start_date: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          label?: string
          start_date?: string
        }
        Relationships: []
      }
      inventory_snapshots: {
        Row: {
          age_days_avg: number | null
          cost_price: number
          created_at: string | null
          dead_stock_value: number | null
          fast_moving_value: number | null
          id: string
          item_id: string | null
          quantity_available: number
          selling_price: number
          slow_moving_value: number | null
          snapshot_date: string
          store_id: string | null
          total_cost: number
          total_value: number
        }
        Insert: {
          age_days_avg?: number | null
          cost_price?: number
          created_at?: string | null
          dead_stock_value?: number | null
          fast_moving_value?: number | null
          id?: string
          item_id?: string | null
          quantity_available?: number
          selling_price?: number
          slow_moving_value?: number | null
          snapshot_date?: string
          store_id?: string | null
          total_cost?: number
          total_value?: number
        }
        Update: {
          age_days_avg?: number | null
          cost_price?: number
          created_at?: string | null
          dead_stock_value?: number | null
          fast_moving_value?: number | null
          id?: string
          item_id?: string | null
          quantity_available?: number
          selling_price?: number
          slow_moving_value?: number | null
          snapshot_date?: string
          store_id?: string | null
          total_cost?: number
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      item_opening_balances: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          financial_year_id: string
          id: string
          item_id: string
          notes: string | null
          opening_quantity: number
          opening_unit_cost: number
          opening_value: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          financial_year_id: string
          id?: string
          item_id: string
          notes?: string | null
          opening_quantity?: number
          opening_unit_cost?: number
          opening_value?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          financial_year_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          opening_quantity?: number
          opening_unit_cost?: number
          opening_value?: number
          store_id?: string
          updated_at?: string
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
          is_discontinued: boolean
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
          is_discontinued?: boolean
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
          is_discontinued?: boolean
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
          brand: string | null
          category_id: string | null
          cost_price: number
          created_at: string | null
          id: string
          image_url: string | null
          is_discontinued: boolean
          last_restocked_date: string | null
          name: string
          quantity_available: number
          selling_price: number
          stock_receive_date: string | null
          store_id: string | null
          supplier_id: string | null
          updated_at: string | null
          warehouse: string | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          cost_price: number
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_discontinued?: boolean
          last_restocked_date?: string | null
          name: string
          quantity_available?: number
          selling_price: number
          stock_receive_date?: string | null
          store_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse?: string | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_discontinued?: boolean
          last_restocked_date?: string | null
          name?: string
          quantity_available?: number
          selling_price?: number
          stock_receive_date?: string | null
          store_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse?: string | null
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
      material_consumptions: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          material_id: string | null
          notes: string | null
          quantity_used: number
          reference_id: string | null
          reference_type: string
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity_used: number
          reference_id?: string | null
          reference_type?: string
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity_used?: number
          reference_id?: string | null
          reference_type?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_consumptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          avg_cost: number | null
          cost_price: number
          costing_method: string
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
          avg_cost?: number | null
          cost_price?: number
          costing_method?: string
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
          avg_cost?: number | null
          cost_price?: number
          costing_method?: string
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
      operational_alerts: {
        Row: {
          ai_confidence: number | null
          ai_recommendation: string | null
          ai_summary: string | null
          alert_type: string
          assigned_to: string | null
          auto_resolved: boolean
          created_at: string | null
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          last_numeric_signal: number | null
          last_seen_at: string | null
          last_signal_hash: string | null
          message: string
          metadata: Json | null
          priority_score: number | null
          reopened_from: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_source: string | null
          severity: string
          snoozed_until: string | null
          status: string | null
          store_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_recommendation?: string | null
          ai_summary?: string | null
          alert_type: string
          assigned_to?: string | null
          auto_resolved?: boolean
          created_at?: string | null
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_numeric_signal?: number | null
          last_seen_at?: string | null
          last_signal_hash?: string | null
          message: string
          metadata?: Json | null
          priority_score?: number | null
          reopened_from?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_source?: string | null
          severity: string
          snoozed_until?: string | null
          status?: string | null
          store_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_recommendation?: string | null
          ai_summary?: string | null
          alert_type?: string
          assigned_to?: string | null
          auto_resolved?: boolean
          created_at?: string | null
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_numeric_signal?: number | null
          last_seen_at?: string | null
          last_signal_hash?: string | null
          message?: string
          metadata?: Json | null
          priority_score?: number | null
          reopened_from?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_source?: string | null
          severity?: string
          snoozed_until?: string | null
          status?: string | null
          store_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
            referencedRelation: "sales_order_material_cost"
            referencedColumns: ["sales_order_id"]
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
            referencedRelation: "sales_order_material_cost"
            referencedColumns: ["sales_order_id"]
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
            foreignKeyName: "sales_customizations_selected_material_id_fkey"
            columns: ["selected_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_bom_snapshot: {
        Row: {
          bom_id: string | null
          bom_name: string | null
          bom_version: number | null
          created_at: string
          id: string
          sales_order_item_id: string
          snapshot_json: Json
        }
        Insert: {
          bom_id?: string | null
          bom_name?: string | null
          bom_version?: number | null
          created_at?: string
          id?: string
          sales_order_item_id: string
          snapshot_json?: Json
        }
        Update: {
          bom_id?: string | null
          bom_name?: string | null
          bom_version?: number | null
          created_at?: string
          id?: string
          sales_order_item_id?: string
          snapshot_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_bom_snapshot_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          item_id: string | null
          item_name: string
          order_id: string
          quantity: number
          stock_deducted: boolean | null
          supplier_id: string | null
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          item_id?: string | null
          item_name: string
          order_id: string
          quantity: number
          stock_deducted?: boolean | null
          supplier_id?: string | null
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          item_id?: string | null
          item_name?: string
          order_id?: string
          quantity?: number
          stock_deducted?: boolean | null
          supplier_id?: string | null
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
            referencedRelation: "sales_order_material_cost"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      sales_order_material_usage: {
        Row: {
          created_at: string
          id: string
          material_id: string | null
          material_name: string | null
          quantity_used: number
          sales_order_item_id: string
          source: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id?: string | null
          material_name?: string | null
          quantity_used?: number
          sales_order_item_id: string
          source?: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string | null
          material_name?: string | null
          quantity_used?: number
          sales_order_item_id?: string
          source?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_material_usage_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_material_usage_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          advance_paid: number | null
          balance_due: number | null
          bom_processed: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string
          delivered_at: string | null
          delivery_date: string | null
          delivery_status: string
          description: string | null
          document_type: string | null
          id: string
          order_number: string
          order_sequence: number
          quote_status: string | null
          salesperson_name: string | null
          status: string | null
          stock_deducted: boolean | null
          store_id: string | null
          supplier_id: string | null
          total_amount: number
          updated_at: string
          workflow_state: string | null
        }
        Insert: {
          advance_paid?: number | null
          balance_due?: number | null
          bom_processed?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date: string
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_status?: string
          description?: string | null
          document_type?: string | null
          id?: string
          order_number: string
          order_sequence?: number
          quote_status?: string | null
          salesperson_name?: string | null
          status?: string | null
          stock_deducted?: boolean | null
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          workflow_state?: string | null
        }
        Update: {
          advance_paid?: number | null
          balance_due?: number | null
          bom_processed?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_status?: string
          description?: string | null
          document_type?: string | null
          id?: string
          order_number?: string
          order_sequence?: number
          quote_status?: string | null
          salesperson_name?: string | null
          status?: string | null
          stock_deducted?: boolean | null
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          workflow_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          created_at: string | null
          id: string
          item_id: string | null
          notes: string | null
          quantity_change: number
          reason: string | null
          store_id: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity_change: number
          reason?: string | null
          store_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity_change?: number
          reason?: string | null
          store_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_operational_scores: {
        Row: {
          compliance_score: number
          created_at: string | null
          customer_score: number
          date: string
          delivery_score: number
          finance_score: number
          id: string
          inventory_score: number
          overall_score: number
          store_id: string
        }
        Insert: {
          compliance_score?: number
          created_at?: string | null
          customer_score?: number
          date: string
          delivery_score?: number
          finance_score?: number
          id?: string
          inventory_score?: number
          overall_score?: number
          store_id: string
        }
        Update: {
          compliance_score?: number
          created_at?: string | null
          customer_score?: number
          date?: string
          delivery_score?: number
          finance_score?: number
          id?: string
          inventory_score?: number
          overall_score?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_operational_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
      supplier_opening_balances: {
        Row: {
          balance_type: string
          created_at: string | null
          effective_date: string
          financial_year_id: string | null
          id: string
          notes: string | null
          opening_balance: number
          store_id: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          balance_type?: string
          created_at?: string | null
          effective_date: string
          financial_year_id?: string | null
          id?: string
          notes?: string | null
          opening_balance?: number
          store_id: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          balance_type?: string
          created_at?: string | null
          effective_date?: string
          financial_year_id?: string | null
          id?: string
          notes?: string | null
          opening_balance?: number
          store_id?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_opening_balances_financial_year_id_fkey"
            columns: ["financial_year_id"]
            isOneToOne: false
            referencedRelation: "financial_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_opening_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_opening_balances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_store_access: {
        Row: {
          created_at: string
          id: string
          store_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_store_access_supplier_id_fkey"
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
      system_events: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
          source_operation: string | null
          source_table: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          source_operation?: string | null
          source_table?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          source_operation?: string | null
          source_table?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_chat_context: {
        Row: {
          active_store_id: string
          ai_conversation_id: string | null
          chat_id: number
          created_at: string
          last_message_at: string
          updated_at: string
        }
        Insert: {
          active_store_id: string
          ai_conversation_id?: string | null
          chat_id: number
          created_at?: string
          last_message_at?: string
          updated_at?: string
        }
        Update: {
          active_store_id?: string
          ai_conversation_id?: string | null
          chat_id?: number
          created_at?: string
          last_message_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_chat_context_active_store_id_fkey"
            columns: ["active_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_chat_context_ai_conversation_id_fkey"
            columns: ["ai_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          store_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          store_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          store_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_links: {
        Row: {
          ai_conversation_id: string | null
          chat_id: number
          created_at: string
          id: string
          is_active: boolean
          linked_at: string
          notification_preferences: Json
          store_id: string
          telegram_first_name: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_conversation_id?: string | null
          chat_id: number
          created_at?: string
          id?: string
          is_active?: boolean
          linked_at?: string
          notification_preferences?: Json
          store_id: string
          telegram_first_name?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_conversation_id?: string | null
          chat_id?: number
          created_at?: string
          id?: string
          is_active?: boolean
          linked_at?: string
          notification_preferences?: Json
          store_id?: string
          telegram_first_name?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_links_ai_conversation_id_fkey"
            columns: ["ai_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          raw_update: Json
          text: string | null
          update_id: number
          user_id: number | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          raw_update: Json
          text?: string | null
          update_id: number
          user_id?: number | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          raw_update?: Json
          text?: string | null
          update_id?: number
          user_id?: number | null
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
      year_end_snapshots: {
        Row: {
          balance_type: string | null
          closing_amount: number | null
          closing_quantity: number | null
          created_at: string | null
          entity_id: string
          entity_name: string | null
          financial_year_id: string
          id: string
          metadata: Json | null
          snapshot_type: string
          store_id: string | null
        }
        Insert: {
          balance_type?: string | null
          closing_amount?: number | null
          closing_quantity?: number | null
          created_at?: string | null
          entity_id: string
          entity_name?: string | null
          financial_year_id: string
          id?: string
          metadata?: Json | null
          snapshot_type: string
          store_id?: string | null
        }
        Update: {
          balance_type?: string | null
          closing_amount?: number | null
          closing_quantity?: number | null
          created_at?: string | null
          entity_id?: string
          entity_name?: string | null
          financial_year_id?: string
          id?: string
          metadata?: Json | null
          snapshot_type?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "year_end_snapshots_financial_year_id_fkey"
            columns: ["financial_year_id"]
            isOneToOne: false
            referencedRelation: "financial_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "year_end_snapshots_store_id_fkey"
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
      customer_balances: {
        Row: {
          balance_due: number | null
          customer_id: string | null
          name: string | null
          store_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          document_type: string | null
          order_number: string | null
          quote_status: string | null
          sale_date: string | null
          sale_id: string | null
          salesperson_name: string | null
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
      sales_order_material_cost: {
        Row: {
          margin: number | null
          order_number: string | null
          order_total: number | null
          sales_order_id: string | null
          total_material_cost: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_material_stock: {
        Args: {
          p_adjustment_type: string
          p_material_id: string
          p_notes?: string
          p_quantity_change: number
        }
        Returns: undefined
      }
      calculate_daily_kpis_and_scores: {
        Args: { p_date: string }
        Returns: Json
      }
      can_access_customer_pii: { Args: { _user_id?: string }; Returns: boolean }
      convert_quote_to_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      create_sales_order_secure: {
        Args: {
          _advance_bank_account_id?: string
          _advance_paid?: number
          _advance_payment_method?: string
          _customer_address?: string
          _customer_id?: string
          _customer_name?: string
          _customer_phone?: string
          _customizations?: Json
          _date?: string
          _delivery_date?: string
          _delivery_status?: string
          _description?: string
          _document_type?: string
          _items?: Json
          _order_number: string
          _salesperson_name?: string
          _store_id: string
          _supplier_id?: string
          _total_amount?: number
        }
        Returns: string
      }
      cron_check_briefings: { Args: never; Returns: undefined }
      customer_summary: {
        Args: { store_uuid?: string }
        Returns: {
          balance_due: number
          customer_id: string
          last_order_date: string
          name: string
          phone: string
          store_id: string
          total_orders: number
          total_revenue: number
        }[]
      }
      generate_ai_insights: { Args: never; Returns: number }
      get_all_users_for_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          last_name: string
          role: string
          store_count: number
          user_id: string
        }[]
      }
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
      get_edge_internal_secret: { Args: never; Returns: string }
      get_inventory_intelligence:
        | {
            Args: {
              p_age_max_days?: number
              p_age_min_days?: number
              p_brand?: string
              p_category_id?: string
              p_date_from?: string
              p_date_to?: string
              p_price_max?: number
              p_price_min?: number
              p_store_id?: string
              p_supplier_id?: string
              p_warehouse?: string
            }
            Returns: {
              brand: string
              cash_locked: number
              category_id: string
              category_name: string
              cost_price: number
              days_since_last_sale: number
              days_to_sell: number
              gross_profit_period: number
              hero_score: number
              image_url: string
              inventory_cost: number
              inventory_value: number
              item_id: string
              item_name: string
              last_sold_date: string
              monthly_velocity: number
              quantity_available: number
              recommended_action: string
              reorder_status: string
              revenue_period: number
              selling_price: number
              stock_age_bucket: string
              stock_age_days: number
              stock_receive_date: string
              store_id: string
              store_name: string
              supplier_id: string
              supplier_name: string
              units_sold_period: number
              warehouse: string
            }[]
          }
        | {
            Args: {
              age_bucket_filter?: string
              brand_filter?: string
              category_id_filter?: string
              date_from?: string
              date_to?: string
              price_max?: number
              price_min?: number
              store_id_filter?: string
              supplier_id_filter?: string
              warehouse_filter?: string
            }
            Returns: {
              avg_days_between_sales: number
              brand: string
              cash_locked: number
              category_id: string
              category_name: string
              cost_price: number
              days_since_last_sale: number
              days_to_sell: number
              gross_profit_period: number
              hero_score: number
              id: string
              image_url: string
              inventory_cost: number
              inventory_value: number
              last_sold_date: string
              monthly_velocity: number
              name: string
              quantity_available: number
              recommended_action: string
              reorder_status: string
              revenue_period: number
              selling_price: number
              stock_age_bucket: string
              stock_age_days: number
              stock_coverage_days: number
              stock_receive_date: string
              supplier_id: string
              supplier_name: string
              units_sold_period: number
              warehouse: string
            }[]
          }
      get_sales_intelligence_summary: {
        Args: { _end_date?: string; _start_date?: string; _store_id?: string }
        Returns: Json
      }
      get_sales_order_for_user: {
        Args: { _order_id: string }
        Returns: {
          advance_paid: number
          balance_due: number
          cancellation_reason: string
          cancelled_at: string
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
          sales_order_items: Json
          status: string
          store_id: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_sales_orders_for_user: {
        Args: { _document_type?: string; _store_id?: string }
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
          document_type: string
          id: string
          order_number: string
          quote_status: string
          salesperson_name: string
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
      get_stock_opening_balance: {
        Args: { p_as_of_date: string; p_item_id: string; p_store_id: string }
        Returns: number
      }
      get_stock_opening_value: {
        Args: { p_as_of_date: string; p_item_id: string; p_store_id: string }
        Returns: {
          qty: number
          value: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_module_enabled: {
        Args: { _module: string; _store_id: string }
        Returns: boolean
      }
      notify_telegram: {
        Args: { p_data: Json; p_event: string; p_store_id: string }
        Returns: undefined
      }
      perform_year_end_closing: { Args: { p_year_id: string }; Returns: Json }
      ping: { Args: never; Returns: undefined }
      process_system_events: { Args: never; Returns: Json }
      raise_operational_alert: {
        Args: {
          p_alert_type: string
          p_dedupe_key: string
          p_entity_id: string
          p_entity_type: string
          p_message: string
          p_metadata: Json
          p_numeric_signal: number
          p_priority: number
          p_severity: string
          p_store_id: string
          p_title: string
          p_worsen_ratio?: number
        }
        Returns: string
      }
      scan_operational_risks: { Args: never; Returns: Json }
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
          is_discontinued: boolean
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
      update_quote_status: {
        Args: { _order_id: string; _quote_status: string }
        Returns: undefined
      }
      user_has_any_store_access: {
        Args: { _user_id?: string }
        Returns: boolean
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
