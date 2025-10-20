-- ============================================================================
-- COMPREHENSIVE SQL CONCEPTS DEMONSTRATION
-- Covers: DDL, DML, Nested Queries, ORDER BY, GROUP BY, Views, Assertions, Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DDL (Data Definition Language) - CREATE, ALTER, DROP
-- ----------------------------------------------------------------------------

-- Create a new table for supplier performance tracking
CREATE TABLE IF NOT EXISTS public.supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ALTER example: Add discount column to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- ALTER example: Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON public.orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category_stock 
ON public.products(category_id, stock);

-- ----------------------------------------------------------------------------
-- 2. VIEWS - Complex analytical views
-- ----------------------------------------------------------------------------

-- View 1: Product Sales Summary (with aggregations)
CREATE OR REPLACE VIEW public.vw_product_sales_summary AS
SELECT 
  p.id,
  p.name,
  p.category_id,
  c.name as category_name,
  p.price,
  p.stock,
  COUNT(DISTINCT oi.order_id) as total_orders,
  COALESCE(SUM(oi.quantity), 0) as total_units_sold,
  COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name, p.category_id, c.name, p.price, p.stock;

-- View 2: Customer Order History (with nested aggregation)
CREATE OR REPLACE VIEW public.vw_customer_orders AS
SELECT 
  o.user_id,
  pr.email,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total) as total_spent,
  AVG(o.total) as avg_order_value,
  MAX(o.created_at) as last_order_date,
  MIN(o.created_at) as first_order_date
FROM public.orders o
JOIN public.profiles pr ON o.user_id = pr.id
GROUP BY o.user_id, pr.email;

-- View 3: Low Stock Alert (with conditions)
CREATE OR REPLACE VIEW public.vw_low_stock_alert AS
SELECT 
  p.id,
  p.name,
  p.stock,
  p.reorder_point,
  p.supplier_name,
  p.supplier_contact,
  c.name as category,
  (p.reorder_point - p.stock) as units_to_reorder
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
WHERE p.stock <= p.reorder_point;

-- View 4: Monthly Sales Report
CREATE OR REPLACE VIEW public.vw_monthly_sales AS
SELECT 
  DATE_TRUNC('month', o.created_at) as month,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total) as total_revenue,
  AVG(o.total) as avg_order_value,
  COUNT(DISTINCT o.user_id) as unique_customers
FROM public.orders o
WHERE o.status != 'cancelled'
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- View 5: Payment Mode Analysis
CREATE OR REPLACE VIEW public.vw_payment_analysis AS
SELECT 
  o.payment_mode,
  COUNT(*) as transaction_count,
  SUM(o.total) as total_amount,
  AVG(o.total) as avg_transaction_value,
  MIN(o.total) as min_transaction,
  MAX(o.total) as max_transaction
FROM public.orders o
WHERE o.payment_mode IS NOT NULL
GROUP BY o.payment_mode;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS - Automated database actions
-- ----------------------------------------------------------------------------

-- Trigger 1: Auto-update product stock on order placement
CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reduce stock when order item is inserted
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Log inventory change
  INSERT INTO public.inventory_logs (product_id, quantity, change_type)
  VALUES (NEW.product_id, -NEW.quantity, 'sale');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock_on_order ON public.order_items;
CREATE TRIGGER trg_update_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_order();

-- Trigger 2: Auto-restock on return approval
CREATE OR REPLACE FUNCTION public.restock_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restock if status changed to 'restocked'
  IF NEW.status = 'restocked' AND OLD.status != 'restocked' THEN
    UPDATE public.products
    SET stock = stock + NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Log inventory change
    INSERT INTO public.inventory_logs (product_id, quantity, change_type)
    VALUES (NEW.product_id, NEW.quantity, 'return');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restock_on_return ON public.returns;
CREATE TRIGGER trg_restock_on_return
AFTER UPDATE ON public.returns
FOR EACH ROW
WHEN (NEW.status = 'restocked')
EXECUTE FUNCTION public.restock_on_return();

-- Trigger 3: Audit log trigger for product updates
CREATE OR REPLACE FUNCTION public.audit_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id::text,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_product_changes ON public.products;
CREATE TRIGGER trg_audit_product_changes
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.audit_product_changes();

-- ----------------------------------------------------------------------------
-- 4. ASSERTIONS (CHECK Constraints)
-- ----------------------------------------------------------------------------

-- Ensure order total is positive
ALTER TABLE public.orders
ADD CONSTRAINT chk_order_total_positive 
CHECK (total > 0);

-- Ensure return quantity doesn't exceed ordered quantity
ALTER TABLE public.returns
ADD CONSTRAINT chk_return_quantity_positive 
CHECK (quantity > 0);

-- Ensure payment amount matches order total (will be enforced in app logic)
ALTER TABLE public.payments
ADD CONSTRAINT chk_payment_amount_positive 
CHECK (amount > 0);

-- Ensure product price is reasonable
ALTER TABLE public.products
ADD CONSTRAINT chk_product_price_reasonable 
CHECK (price >= 0 AND price <= 10000000);

-- ----------------------------------------------------------------------------
-- 5. DML (Data Manipulation Language) - Sample queries with concepts
-- ----------------------------------------------------------------------------

-- Insert sample supplier performance data
INSERT INTO public.supplier_performance (supplier_id, month, total_orders, on_time_deliveries, quality_score)
SELECT 
  s.id,
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as month,
  5 + (random() * 10)::int as total_orders,
  4 + (random() * 6)::int as on_time_deliveries,
  3.5 + (random() * 1.5) as quality_score
FROM public.suppliers s
LIMIT 3;

-- ----------------------------------------------------------------------------
-- 6. COMPLEX QUERIES DEMONSTRATION
-- ----------------------------------------------------------------------------

-- Nested Query Example 1: Products with above-average sales
-- SELECT p.name, p.price, 
--   (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as times_ordered
-- FROM products p
-- WHERE (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) > 
--   (SELECT AVG(order_count) FROM 
--     (SELECT COUNT(*) as order_count FROM order_items GROUP BY product_id) as counts);

-- Nested Query Example 2: Customers who spent more than average
-- SELECT pr.email, co.total_spent
-- FROM vw_customer_orders co
-- JOIN profiles pr ON co.user_id = pr.id
-- WHERE co.total_spent > (SELECT AVG(total_spent) FROM vw_customer_orders);

-- GROUP BY with HAVING Example: Categories with significant sales
-- SELECT c.name, COUNT(oi.id) as items_sold, SUM(oi.quantity * oi.price) as revenue
-- FROM categories c
-- JOIN products p ON c.id = p.category_id
-- JOIN order_items oi ON p.id = oi.product_id
-- GROUP BY c.name
-- HAVING SUM(oi.quantity * oi.price) > 1000
-- ORDER BY revenue DESC;

-- ORDER BY Example: Recent high-value orders
-- SELECT o.id, pr.email, o.total, o.created_at
-- FROM orders o
-- JOIN profiles pr ON o.user_id = pr.id
-- WHERE o.total > 500
-- ORDER BY o.created_at DESC, o.total DESC
-- LIMIT 10;

-- ----------------------------------------------------------------------------
-- 7. NORMALIZATION - Database is already in 3NF
-- ----------------------------------------------------------------------------
-- 1NF: All tables have atomic values, no repeating groups
-- 2NF: All non-key attributes fully dependent on primary key
-- 3NF: No transitive dependencies
-- Examples:
--   - user_roles separate table (not in profiles)
--   - order_items separate from orders
--   - categories separate from products

-- ----------------------------------------------------------------------------
-- 8. EXTRA CONCEPTS (>5%)
-- ----------------------------------------------------------------------------

-- Foreign Keys (referential integrity)
ALTER TABLE public.supplier_performance
ADD CONSTRAINT fk_supplier_performance_supplier 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON public.inventory_logs(product_id, date DESC);

-- RLS Policies for supplier_performance
ALTER TABLE public.supplier_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view supplier performance"
ON public.supplier_performance FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert supplier performance"
ON public.supplier_performance FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Materialized View (advanced concept)
-- CREATE MATERIALIZED VIEW public.mv_sales_dashboard AS
-- SELECT * FROM vw_monthly_sales;

-- Stored Procedure for bulk operations
CREATE OR REPLACE FUNCTION public.bulk_update_discount(
  p_category_id UUID,
  p_discount NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.products
  SET discount_percentage = p_discount
  WHERE category_id = p_category_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.bulk_update_discount TO authenticated;