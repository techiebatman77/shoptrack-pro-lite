-- ============================================
-- SECURITY FIX: Implement Proper Role-Based Security
-- ============================================

-- 1. Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- 2. Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. DROP ALL POLICIES that depend on profiles.role column BEFORE dropping the column
-- Categories policies
DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON public.categories;

-- Products policies
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;

-- Orders policies
DROP POLICY IF EXISTS "Only admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Order items policies
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;

-- Inventory logs policies
DROP POLICY IF EXISTS "Only admins can insert inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Only admins can view inventory logs" ON public.inventory_logs;

-- 6. Now we can safely drop the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN role;

-- 7. Update handle_new_user trigger to create roles in user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile without role
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Insert default customer role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer');
  
  RETURN new;
END;
$$;

-- 8. Add INSERT policy to profiles table (trigger-only insertion)
CREATE POLICY "Profiles can only be created via trigger"
ON public.profiles
FOR INSERT
WITH CHECK (false);

-- 9. Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. RECREATE all policies using has_role() function
-- Categories policies
CREATE POLICY "Only admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Only admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Only admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Order items policies
CREATE POLICY "Users can view their order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ) 
  OR public.has_role(auth.uid(), 'admin')
);

-- Inventory logs policies
CREATE POLICY "Only admins can insert inventory logs"
ON public.inventory_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can view inventory logs"
ON public.inventory_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));