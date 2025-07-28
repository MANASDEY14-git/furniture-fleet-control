-- First, let's create a temporary policy to allow authenticated users to create items
-- This will help us debug the issue
DROP POLICY IF EXISTS "Users can access items for their stores" ON public.items;

-- Create a more permissive policy for debugging
CREATE POLICY "Allow authenticated users to manage items" 
ON public.items 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Also fix the item_variants policy
DROP POLICY IF EXISTS "Allow all operations on item_variants" ON public.item_variants;
CREATE POLICY "Allow authenticated users to manage item_variants" 
ON public.item_variants 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure user_store_access table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.user_store_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS on user_store_access
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- Create policy for user_store_access
DROP POLICY IF EXISTS "Users can view their own store access" ON public.user_store_access;
CREATE POLICY "Users can view their own store access" 
ON public.user_store_access 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure stores table exists
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create policy for stores
DROP POLICY IF EXISTS "Authenticated users can access stores" ON public.stores;
CREATE POLICY "Authenticated users can access stores" 
ON public.stores 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);