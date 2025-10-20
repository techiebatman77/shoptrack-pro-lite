import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Database, Code, Table, Filter, BarChart3, Shield, Zap, FileCode } from "lucide-react";

const SQLConcepts = () => {
  const [activeTab, setActiveTab] = useState("ddl");

  const concepts = {
    ddl: {
      title: "DDL (Data Definition Language)",
      icon: <Database className="h-5 w-5" />,
      description: "CREATE, ALTER, DROP - Database structure operations",
      examples: [
        {
          name: "CREATE TABLE",
          code: `CREATE TABLE public.supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  month DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,
          explanation: "Creates new table for tracking supplier performance metrics"
        },
        {
          name: "ALTER TABLE",
          code: `ALTER TABLE public.products 
ADD COLUMN discount_percentage NUMERIC(5,2) DEFAULT 0 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);`,
          explanation: "Adds discount column to existing products table with constraints"
        },
        {
          name: "CREATE INDEX",
          code: `CREATE INDEX idx_orders_user_created 
ON public.orders(user_id, created_at DESC);`,
          explanation: "Creates composite index for faster query performance"
        }
      ]
    },
    dml: {
      title: "DML (Data Manipulation Language)",
      icon: <Code className="h-5 w-5" />,
      description: "INSERT, UPDATE, DELETE, SELECT - Data operations",
      examples: [
        {
          name: "INSERT",
          code: `INSERT INTO public.supplier_performance 
  (supplier_id, month, total_orders, on_time_deliveries, quality_score)
SELECT 
  s.id,
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'),
  5 + (random() * 10)::int,
  4 + (random() * 6)::int,
  3.5 + (random() * 1.5)
FROM public.suppliers s;`,
          explanation: "Bulk insert with calculated values from another table"
        },
        {
          name: "UPDATE",
          code: `UPDATE public.products
SET discount_percentage = 15.00
WHERE category_id = (SELECT id FROM categories WHERE name = 'Electronics');`,
          explanation: "Update with nested query condition"
        },
        {
          name: "DELETE",
          code: `DELETE FROM public.returns
WHERE status = 'rejected' 
  AND created_at < CURRENT_DATE - INTERVAL '90 days';`,
          explanation: "Delete old rejected returns with date condition"
        }
      ]
    },
    nested: {
      title: "Nested Queries (Subqueries)",
      icon: <Filter className="h-5 w-5" />,
      description: "Queries within queries for complex filtering",
      examples: [
        {
          name: "IN Subquery",
          code: `SELECT p.name, p.price 
FROM products p
WHERE p.id IN (
  SELECT oi.product_id 
  FROM order_items oi 
  GROUP BY oi.product_id 
  HAVING SUM(oi.quantity) > 10
);`,
          explanation: "Find products sold more than 10 times"
        },
        {
          name: "Correlated Subquery",
          code: `SELECT p.name, 
  (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as times_ordered
FROM products p
WHERE (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) > 5;`,
          explanation: "Products with order count in SELECT and WHERE"
        },
        {
          name: "EXISTS",
          code: `SELECT pr.email
FROM profiles pr
WHERE EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.user_id = pr.id 
    AND o.total > 5000
);`,
          explanation: "Find customers who have placed high-value orders"
        }
      ]
    },
    orderby: {
      title: "ORDER BY & Sorting",
      icon: <BarChart3 className="h-5 w-5" />,
      description: "Sort results in ascending or descending order",
      examples: [
        {
          name: "Single Column",
          code: `SELECT name, price, stock 
FROM products 
ORDER BY price DESC;`,
          explanation: "Sort products by price (highest first)"
        },
        {
          name: "Multiple Columns",
          code: `SELECT o.id, pr.email, o.total, o.created_at
FROM orders o
JOIN profiles pr ON o.user_id = pr.id
WHERE o.total > 500
ORDER BY o.created_at DESC, o.total DESC;`,
          explanation: "Sort by date (newest), then by amount (highest)"
        },
        {
          name: "With LIMIT",
          code: `SELECT p.name, COUNT(oi.id) as sales_count
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.name
ORDER BY sales_count DESC
LIMIT 5;`,
          explanation: "Top 5 best-selling products"
        }
      ]
    },
    groupby: {
      title: "GROUP BY with HAVING",
      icon: <Table className="h-5 w-5" />,
      description: "Aggregate data with filtering on groups",
      examples: [
        {
          name: "Basic GROUP BY",
          code: `SELECT payment_mode, COUNT(*) as count, SUM(total) as revenue
FROM orders
GROUP BY payment_mode;`,
          explanation: "Count and revenue by payment mode"
        },
        {
          name: "GROUP BY with HAVING",
          code: `SELECT c.name, 
  COUNT(oi.id) as items_sold, 
  SUM(oi.quantity * oi.price) as revenue
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY c.name
HAVING SUM(oi.quantity * oi.price) > 1000
ORDER BY revenue DESC;`,
          explanation: "Categories with revenue > ₹1000, sorted by revenue"
        },
        {
          name: "Advanced Aggregation",
          code: `SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_orders,
  AVG(total) as avg_order_value,
  MAX(total) as highest_order
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
HAVING COUNT(*) >= 5
ORDER BY month DESC;`,
          explanation: "Monthly stats for months with 5+ orders"
        }
      ]
    },
    views: {
      title: "Views",
      icon: <FileCode className="h-5 w-5" />,
      description: "Virtual tables storing complex queries",
      examples: [
        {
          name: "Product Sales Summary",
          code: `CREATE VIEW vw_product_sales_summary AS
SELECT 
  p.id, p.name, p.price, p.stock,
  COUNT(DISTINCT oi.order_id) as total_orders,
  COALESCE(SUM(oi.quantity), 0) as total_units_sold,
  COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name, p.price, p.stock;`,
          explanation: "Reusable view for product performance analysis"
        },
        {
          name: "Low Stock Alert",
          code: `CREATE VIEW vw_low_stock_alert AS
SELECT 
  p.id, p.name, p.stock, p.reorder_point,
  p.supplier_name, p.supplier_contact,
  c.name as category,
  (p.reorder_point - p.stock) as units_to_reorder
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock <= p.reorder_point;`,
          explanation: "Automatically shows products needing reorder"
        },
        {
          name: "Using Views",
          code: `-- Query the view like a regular table
SELECT * FROM vw_low_stock_alert
WHERE category = 'Electronics'
ORDER BY units_to_reorder DESC;`,
          explanation: "Views simplify complex queries and improve maintainability"
        }
      ]
    },
    assertions: {
      title: "Assertions (CHECK Constraints)",
      icon: <Shield className="h-5 w-5" />,
      description: "Data integrity rules and validation",
      examples: [
        {
          name: "Range Constraint",
          code: `ALTER TABLE products
ADD CONSTRAINT chk_product_price_reasonable 
CHECK (price >= 0 AND price <= 10000000);`,
          explanation: "Ensures product prices are within reasonable range"
        },
        {
          name: "Positive Values",
          code: `ALTER TABLE orders
ADD CONSTRAINT chk_order_total_positive 
CHECK (total > 0);`,
          explanation: "Prevents negative or zero order totals"
        },
        {
          name: "Percentage Constraint",
          code: `ALTER TABLE products
ADD CONSTRAINT chk_discount_valid
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);`,
          explanation: "Validates discount percentage range"
        }
      ]
    },
    triggers: {
      title: "Triggers",
      icon: <Zap className="h-5 w-5" />,
      description: "Automated actions on database events",
      examples: [
        {
          name: "Auto Stock Update",
          code: `CREATE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  INSERT INTO inventory_logs 
    (product_id, quantity, change_type)
  VALUES (NEW.product_id, -NEW.quantity, 'sale');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock_on_order
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_order();`,
          explanation: "Automatically reduces stock when order placed"
        },
        {
          name: "Return Restock",
          code: `CREATE FUNCTION restock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'restocked' THEN
    UPDATE products
    SET stock = stock + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restock_on_return
AFTER UPDATE ON returns
FOR EACH ROW
EXECUTE FUNCTION restock_on_return();`,
          explanation: "Auto-restocks product when return approved"
        },
        {
          name: "Audit Logging",
          code: `CREATE FUNCTION audit_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs 
    (user_id, action, table_name, record_id, old_values, new_values)
  VALUES 
    (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
          explanation: "Tracks all changes to products for compliance"
        }
      ]
    },
    normalization: {
      title: "Normalization (1NF, 2NF, 3NF)",
      icon: <Database className="h-5 w-5" />,
      description: "Database design for data integrity",
      examples: [
        {
          name: "1NF (First Normal Form)",
          code: `-- ❌ BAD: Repeating groups
orders: id, product1, qty1, product2, qty2

-- ✅ GOOD: Atomic values, separate rows
orders: id, total
order_items: id, order_id, product_id, quantity`,
          explanation: "Each cell contains single value, no repeating columns"
        },
        {
          name: "2NF (Second Normal Form)",
          code: `-- ❌ BAD: Partial dependency
order_items: order_id, product_id, product_name, quantity

-- ✅ GOOD: Non-key depends on full key
order_items: order_id, product_id, quantity
products: id, name, price`,
          explanation: "Non-key attributes fully depend on primary key"
        },
        {
          name: "3NF (Third Normal Form)",
          code: `-- ❌ BAD: Transitive dependency
profiles: id, email, role, role_description

-- ✅ GOOD: No transitive dependencies
profiles: id, email
user_roles: id, user_id, role
roles: role, description`,
          explanation: "No non-key attribute depends on another non-key attribute"
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">SQL Concepts Demonstration</h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive coverage: DDL, DML, Nested Queries, ORDER BY, GROUP BY, Views, Assertions, Triggers & Normalization
          </p>
          <Badge variant="outline" className="mt-2">ShopTrack Pro Database</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto">
            {Object.entries(concepts).map(([key, concept]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="flex items-center gap-2 px-3 py-2"
              >
                {concept.icon}
                <span className="hidden sm:inline">{concept.title.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(concepts).map(([key, concept]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {concept.icon}
                    <div>
                      <CardTitle className="text-2xl">{concept.title}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {concept.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {concept.examples.map((example, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{example.name}</h3>
                          <Badge variant="secondary">Example {idx + 1}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{example.explanation}</p>
                        <ScrollArea className="h-auto max-h-96 w-full rounded-md border bg-muted/50">
                          <pre className="p-4 text-sm">
                            <code>{example.code}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <CardTitle>Extra Concepts (&gt;5% Additional)</CardTitle>
            <CardDescription>Advanced database features implemented</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🔗 Foreign Keys</h4>
                <p className="text-sm text-muted-foreground">
                  Referential integrity with CASCADE delete/update
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">⚡ Indexes</h4>
                <p className="text-sm text-muted-foreground">
                  B-tree & composite indexes for query optimization
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🔒 RLS Policies</h4>
                <p className="text-sm text-muted-foreground">
                  Row-Level Security for data access control
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📊 Stored Procedures</h4>
                <p className="text-sm text-muted-foreground">
                  Reusable functions with SECURITY DEFINER
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🔄 Transactions</h4>
                <p className="text-sm text-muted-foreground">
                  ACID compliance for data consistency
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📝 Audit Trail</h4>
                <p className="text-sm text-muted-foreground">
                  Complete change tracking with JSON storage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SQLConcepts;