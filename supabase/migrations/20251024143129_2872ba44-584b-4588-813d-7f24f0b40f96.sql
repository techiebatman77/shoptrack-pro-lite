-- Create cart_items table to track items in user carts
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own cart items
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own cart items
CREATE POLICY "Users can insert their own cart items"
ON public.cart_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
CREATE POLICY "Users can update their own cart items"
ON public.cart_items
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own cart items
CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger function to update product stock when cart item is added/modified
CREATE OR REPLACE FUNCTION public.update_stock_on_cart_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Reserve stock when adding to cart
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Log inventory change
    INSERT INTO public.inventory_logs (product_id, quantity, change_type)
    VALUES (NEW.product_id, -NEW.quantity, 'cart_reserved');
    
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Adjust stock based on quantity difference
    UPDATE public.products
    SET stock = stock - (NEW.quantity - OLD.quantity)
    WHERE id = NEW.product_id;
    
    -- Log inventory change
    IF NEW.quantity > OLD.quantity THEN
      INSERT INTO public.inventory_logs (product_id, quantity, change_type)
      VALUES (NEW.product_id, -(NEW.quantity - OLD.quantity), 'cart_reserved');
    ELSIF NEW.quantity < OLD.quantity THEN
      INSERT INTO public.inventory_logs (product_id, quantity, change_type)
      VALUES (NEW.product_id, (OLD.quantity - NEW.quantity), 'cart_released');
    END IF;
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- Release reserved stock when removing from cart
    UPDATE public.products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
    
    -- Log inventory change
    INSERT INTO public.inventory_logs (product_id, quantity, change_type)
    VALUES (OLD.product_id, OLD.quantity, 'cart_released');
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on cart_items
CREATE TRIGGER cart_stock_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_cart_change();