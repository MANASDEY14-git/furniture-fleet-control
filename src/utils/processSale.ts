import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface OrderItem {
  itemId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  [key: string]: any;
}

export interface OrderData {
  // Add your order fields here (customer_id, store_id, etc.)
  [key: string]: any;
}

export async function processSale(orderItems: OrderItem[], orderData: OrderData) {
  // 1. Insert the sales order
  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert([orderData])
    .select()
    .single();
  if (orderError) throw orderError;

  // 2. Deduct stock for each order item
  for (const item of orderItems) {
    if (item.variantId) {
      // Deduct from variant
      const { data: variant, error } = await supabase
        .from('item_variants')
        .select('quantity_available')
        .eq('id', item.variantId)
        .single();
      if (error) throw error;
      const newQty = (variant?.quantity_available ?? 0) - item.quantity;
      if (newQty < 0) throw new Error('Not enough stock for variant');
      const { error: updateError } = await supabase
        .from('item_variants')
        .update({ quantity_available: newQty })
        .eq('id', item.variantId);
      if (updateError) throw updateError;
    } else {
      // Deduct from base item
      const { data: baseItem, error } = await supabase
        .from('items')
        .select('quantity_available')
        .eq('id', item.itemId)
        .single();
      if (error) throw error;
      const newQty = (baseItem?.quantity_available ?? 0) - item.quantity;
      if (newQty < 0) throw new Error('Not enough stock for item');
      const { error: updateError } = await supabase
        .from('items')
        .update({ quantity_available: newQty })
        .eq('id', item.itemId);
      if (updateError) throw updateError;
    }
  }

  // 3. Insert sales_order_items
  const orderItemsWithOrderId = orderItems.map(item => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase
    .from('sales_order_items')
    .insert(orderItemsWithOrderId);

  if (itemsError) throw itemsError;

  return { success: true, orderId: order.id };
}
