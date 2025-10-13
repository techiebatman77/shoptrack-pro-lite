-- Add payment_mode and customer_notes to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_mode TEXT DEFAULT 'UPI' CHECK (payment_mode IN ('UPI', 'Card', 'COD')),
ADD COLUMN customer_notes TEXT;

-- Create returns table
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'restocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for returns
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Users can create returns for their own orders
CREATE POLICY "Users can create returns for their orders" 
ON public.returns 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = returns.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Users can view their own returns
CREATE POLICY "Users can view their own returns" 
ON public.returns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = returns.order_id 
    AND orders.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin')
);

-- Only admins can update returns
CREATE POLICY "Only admins can update returns" 
ON public.returns 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  mode TEXT NOT NULL CHECK (mode IN ('UPI', 'Card', 'COD')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payments.order_id 
    AND orders.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin')
);

-- Only admins can insert payments
CREATE POLICY "Only admins can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update payments
CREATE POLICY "Only admins can update payments" 
ON public.payments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Create audit logs table for security
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Seed sample returns
INSERT INTO public.returns (order_id, product_id, quantity, reason, status)
SELECT 
  o.id,
  oi.product_id,
  1,
  'Product defective',
  'restocked'
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
LIMIT 2;

-- Seed sample payments
INSERT INTO public.payments (order_id, amount, mode, status)
SELECT 
  id,
  total,
  CASE 
    WHEN random() < 0.6 THEN 'UPI'
    WHEN random() < 0.9 THEN 'Card'
    ELSE 'COD'
  END,
  'paid'
FROM public.orders
LIMIT 10;