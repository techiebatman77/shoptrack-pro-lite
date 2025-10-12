-- Add SKU, variants, supplier info, and GST fields to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS supplier_contact TEXT,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 18;

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  rating NUMERIC DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Suppliers policies (admin only)
CREATE POLICY "Only admins can view suppliers" ON public.suppliers
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update suppliers" ON public.suppliers
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete suppliers" ON public.suppliers
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add supplier_id foreign key to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Create index on SKU for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- Seed some sample suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, rating) VALUES
  ('Flipkart Wholesale', 'Raj Kumar', 'raj@flipkart.com', '+91-9876543210', 4.5),
  ('Amazon Business', 'Priya Sharma', 'priya@amazon.in', '+91-9876543211', 4.8),
  ('IndiaMART Suppliers', 'Amit Patel', 'amit@indiamart.com', '+91-9876543212', 4.2),
  ('Metro Cash & Carry', 'Sanjay Singh', 'sanjay@metro.in', '+91-9876543213', 4.6),
  ('Udaan Wholesale', 'Neha Gupta', 'neha@udaan.com', '+91-9876543214', 4.3)
ON CONFLICT DO NOTHING;