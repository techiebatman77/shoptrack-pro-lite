import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, DollarSign, ShoppingCart, AlertCircle, Plus, Download, TrendingUp } from 'lucide-react';
import { formatINR } from '@/lib/formatINR';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  profiles: { email: string };
}

interface InventoryLog {
  id: string;
  product_id: string;
  change_type: string;
  quantity: number;
  date: string;
  products: { name: string };
}

// Zod schema for product validation
const productSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable(),
  price: z.number()
    .positive('Price must be greater than 0')
    .max(10000000, 'Price must be less than 10,000,000'),
  stock: z.number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .max(1000000, 'Stock must be less than 1,000,000'),
  category_id: z.string().uuid('Invalid category').nullable(),
  image_url: z.string()
    .url('Must be a valid URL')
    .max(500, 'URL must be less than 500 characters')
    .nullable(),
});

const Dashboard = () => {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && userRole !== 'admin') {
      navigate('/');
      toast.error('Access denied. Admin only.');
    }
  }, [userRole, authLoading, navigate]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchData();
    }
  }, [userRole]);

  const fetchData = async () => {
    const [productsRes, ordersRes, categoriesRes, logsRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('orders').select('id, total, status, created_at, user_id, profiles!orders_user_id_fkey(email)'),
      supabase.from('categories').select('*'),
      supabase.from('inventory_logs').select('*, products(name)').order('date', { ascending: false }).limit(10),
    ]);

    const productsData = productsRes.data || [];
    const ordersData = (ordersRes.data || []).map(order => ({
      ...order,
      profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
    })) as Order[];

    const logsData = (logsRes.data || []).map(log => ({
      ...log,
      products: Array.isArray(log.products) ? log.products[0] : log.products
    })) as InventoryLog[];

    setProducts(productsData);
    setOrders(ordersData);
    setCategories(categoriesRes.data || []);
    setInventoryLogs(logsData);
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Prepare raw data
    const rawData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      category_id: (formData.get('category_id') as string) || null,
      image_url: (formData.get('image_url') as string) || null,
    };

    // Validate with Zod schema
    try {
      const validatedData = productSchema.parse(rawData);

      // Type assertion to match Supabase expected type
      type ProductInsert = {
        name: string;
        description: string | null;
        price: number;
        stock: number;
        category_id: string | null;
        image_url: string | null;
      };

      const productData: ProductInsert = {
        name: validatedData.name,
        description: validatedData.description,
        price: validatedData.price,
        stock: validatedData.stock,
        category_id: validatedData.category_id,
        image_url: validatedData.image_url,
      };

      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id);

        if (error) {
          toast.error('Failed to update product: ' + error.message);
          return;
        }
        toast.success('Product updated!');
      } else {
        const { error } = await supabase.from('products').insert(productData);

        if (error) {
          toast.error('Failed to create product: ' + error.message);
          return;
        }
        toast.success('Product created!');
      }

      setDialogOpen(false);
      setEditProduct(null);
      fetchData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(`Validation error: ${firstError.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete product');
      return;
    }

    toast.success('Product deleted');
    fetchData();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order');
      return;
    }

    toast.success('Order status updated');
    fetchData();
  };

  const exportToCSV = () => {
    const csv = [
      ['Name', 'Description', 'Price (INR)', 'Stock', 'Category', 'Total Value (INR)'],
      ...products.map((p) => {
        const category = categories.find(c => c.id === p.category_id)?.name || '';
        const totalValue = p.price * p.stock;
        return [
          p.name,
          p.description || '',
          p.price.toString(),
          p.stock.toString(),
          category,
          totalValue.toString()
        ];
      }),
    ]
      .map((row) => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported to CSV');
  };

  // Calculate comprehensive stats
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
    lowStockItems: products.filter((p) => p.stock < 10).length,
    totalInventoryValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
    criticalStock: products.filter((p) => p.stock < 5).length,
  };

  if (authLoading || userRole !== 'admin') {
    return null;
  }

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock < 5) return <Badge variant="destructive">{stock}</Badge>;
    if (stock < 10) return <Badge className="bg-yellow-500">{stock}</Badge>;
    return <Badge variant="secondary">{stock}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Enhanced Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(stats.totalInventoryValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Current stock worth</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Needing Restock</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground mt-1">Stock below 10 units</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">All time orders</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">From all orders</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.criticalStock}</div>
              <p className="text-xs text-muted-foreground mt-1">Below 5 units - urgent!</p>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventory Management</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditProduct(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editProduct ? 'Edit Product' : 'Add Product'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editProduct?.name || ''}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        rows={4}
                        defaultValue={editProduct?.description || ''}
                        placeholder="Enter detailed product description..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price (INR)</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="1"
                          defaultValue={editProduct?.price || ''}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="stock">Stock</Label>
                        <Input
                          id="stock"
                          name="stock"
                          type="number"
                          defaultValue={editProduct?.stock || ''}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category_id">Category</Label>
                      <Select name="category_id" defaultValue={editProduct?.category_id || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="image_url">Image URL</Label>
                      <Input
                        id="image_url"
                        name="image_url"
                        type="url"
                        defaultValue={editProduct?.image_url || ''}
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editProduct ? 'Update Product' : 'Create Product'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const category = categories.find(c => c.id === product.category_id);
                    const totalValue = product.price * product.stock;
                    return (
                      <TableRow key={product.id} className={product.stock < 5 ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="max-w-xs truncate cursor-help">
                                  {product.description || 'No description'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>{product.description || 'No description'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{formatINR(product.price)}</TableCell>
                        <TableCell>{getStockBadge(product.stock)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatINR(totalValue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditProduct(product);
                                setDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Inventory Logs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Inventory Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Change Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.products?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={log.change_type === 'sale' ? 'default' : 'secondary'}>
                        {log.change_type}
                      </Badge>
                    </TableCell>
                    <TableCell className={log.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                      {log.quantity > 0 ? '+' : ''}{log.quantity}
                    </TableCell>
                    <TableCell>
                      {new Date(log.date).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 10).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.profiles.email}</TableCell>
                    <TableCell className="font-semibold">{formatINR(Number(order.total))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'completed'
                            ? 'default'
                            : order.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleUpdateOrderStatus(order.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
