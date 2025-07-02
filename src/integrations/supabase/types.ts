export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
      item_variant_attributes: {
        Row: {
          attribute_value_id: string | null
          created_at: string | null
          id: string
          variant_id: string | null
        }
        Insert: {
          attribute_value_id?: string | null
          created_at?: string | null
          id?: string
          variant_id?: string | null
        }
        Update: {
          attribute_value_id?: string | null
          created_at?: string | null
          id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_variant_attributes_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_variant_attributes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variants: {
        Row: {
          cost_price: number
          created_at: string | null
          id: string
          item_id: string | null
          quantity_available: number | null
          selling_price: number
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          cost_price: number
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity_available?: number | null
          selling_price: number
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity_available?: number | null
          selling_price?: number
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_variants_item_id_fkey"
            columns: ["item_id"]
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
      payments: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          sale_id: string | null
          store_id: string | null
          supplier_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          store_id?: string | null
          supplier_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          store_id?: string | null
          supplier_id?: string | null
          type?: string
        }
        Relationships: [
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
      purchases: {
        Row: {
          created_at: string | null
          date: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          item_id: string | null
          item_name: string
          quantity: number
          store_id: string | null
          supplier_id: string | null
          total_cost: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_id?: string | null
          item_name: string
          quantity: number
          store_id?: string | null
          supplier_id?: string | null
          total_cost: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_id?: string | null
          item_name?: string
          quantity?: number
          store_id?: string | null
          supplier_id?: string | null
          total_cost?: number
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
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
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
        ]
      }
      sales_orders: {
        Row: {
          advance_paid: number | null
          balance_due: number | null
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string
          delivery_date: string | null
          delivery_status: string
          id: string
          order_number: string
          store_id: string | null
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          advance_paid?: number | null
          balance_due?: number | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date: string
          delivery_date?: string | null
          delivery_status?: string
          id?: string
          order_number: string
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          advance_paid?: number | null
          balance_due?: number | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string
          delivery_date?: string | null
          delivery_status?: string
          id?: string
          order_number?: string
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
    }
    Views: {
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
