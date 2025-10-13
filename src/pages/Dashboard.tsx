import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Package, DollarSign, ShoppingCart, AlertCircle, Plus, Download, 
  TrendingUp, BarChart3, Users, PackageCheck, Search, QrCode 
} from 'lucide-react';
import { formatINR } from '@/lib/formatINR';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
  sku: string | null;
  variants: any;
  supplier_id: string | null;
  supplier_name: string | null;
  lead_time_days: number;
  reorder_point: number;
  gst_rate: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  rating: number;
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
  payment_mode?: string;
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

interface Return {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
  products: { name: string };
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  mode: string;
  status: string;
  created_at: string;
}

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(2000).nullable(),
  price: z.number().positive('Price must be greater than 0').max(10000000),
  stock: z.number().int().min(0).max(1000000),
  category_id: z.string().uuid().nullable(),
  image_url: z.string().url().max(500).nullable(),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters').max(50).nullable(),
  supplier_id: z.string().uuid().nullable(),
  lead_time_days: z.number().int().min(1).max(365),
  reorder_point: z.number().int().min(0).max(10000),
  gst_rate: z.number().min(0).max(100),
});

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  contact_person: z.string().trim().max(200).nullable(),
  email: z.string().email('Invalid email').nullable(),
  phone: z.string().trim().max(20).nullable(),
  rating: z.number().min(1).max(5),
});

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedSKU, setScannedSKU] = useState('');

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
    const [productsRes, suppliersRes, ordersRes, categoriesRes, logsRes, returnsRes, paymentsRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('orders').select('id, total, status, created_at, user_id, payment_mode, profiles!orders_user_id_fkey(email)'),
      supabase.from('categories').select('*'),
      supabase.from('inventory_logs').select('*, products(name)').order('date', { ascending: false }).limit(50),
      supabase.from('returns').select('*, products(name)').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
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

    const returnsData = (returnsRes.data || []).map(ret => ({
      ...ret,
      products: Array.isArray(ret.products) ? ret.products[0] : ret.products
    })) as Return[];

    setProducts(productsData);
    setSuppliers(suppliersRes.data || []);
    setOrders(ordersData);
    setCategories(categoriesRes.data || []);
    setInventoryLogs(logsData);
    setReturns(returnsData);
    setPayments(paymentsRes.data || []);
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      category_id: (formData.get('category_id') as string) || null,
      image_url: (formData.get('image_url') as string) || null,
      sku: (formData.get('sku') as string) || null,
      supplier_id: (formData.get('supplier_id') as string) || null,
      lead_time_days: Number(formData.get('lead_time_days')) || 7,
      reorder_point: Number(formData.get('reorder_point')) || 10,
      gst_rate: Number(formData.get('gst_rate')) || 18,
    };

    try {
      const validatedData = productSchema.parse(rawData);

      const productData = {
        name: validatedData.name,
        description: validatedData.description,
        price: validatedData.price,
        stock: validatedData.stock,
        category_id: validatedData.category_id,
        image_url: validatedData.image_url,
        sku: validatedData.sku,
        supplier_id: validatedData.supplier_id,
        lead_time_days: validatedData.lead_time_days,
        reorder_point: validatedData.reorder_point,
        gst_rate: validatedData.gst_rate,
      };

      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id);

        if (error) throw error;
        toast.success('Product updated!');
      } else {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
        toast.success('Product created!');
      }

      setProductDialogOpen(false);
      setEditProduct(null);
      fetchData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(`Validation error: ${error.errors[0].message}`);
      } else {
        toast.error('Failed to save product');
      }
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get('name') as string,
      contact_person: (formData.get('contact_person') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      rating: Number(formData.get('rating')) || 3,
    };

    try {
      const validatedData = supplierSchema.parse(rawData);

      const supplierData = {
        name: validatedData.name,
        contact_person: validatedData.contact_person,
        email: validatedData.email,
        phone: validatedData.phone,
        rating: validatedData.rating,
      };

      if (editSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editSupplier.id);
        if (error) throw error;
        toast.success('Supplier updated!');
      } else {
        const { error } = await supabase.from('suppliers').insert([supplierData]);
        if (error) throw error;
        toast.success('Supplier created!');
      }

      setSupplierDialogOpen(false);
      setEditSupplier(null);
      fetchData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(`Validation error: ${error.errors[0].message}`);
      } else {
        toast.error('Failed to save supplier');
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

  const exportToCSV = () => {
    const csv = [
      ['SKU', 'Name', 'Price (INR)', 'Stock', 'GST Rate (%)', 'Price with GST', 'Total Value', 'Supplier', 'Reorder Point'],
      ...filteredProducts.map((p) => {
        const supplier = suppliers.find(s => s.id === p.supplier_id)?.name || '-';
        const priceWithGST = p.price * (1 + p.gst_rate / 100);
        const totalValue = priceWithGST * p.stock;
        return [
          p.sku || '-',
          p.name,
          p.price.toString(),
          p.stock.toString(),
          p.gst_rate.toString(),
          priceWithGST.toFixed(2),
          totalValue.toFixed(2),
          supplier,
          p.reorder_point.toString()
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

  const handleSKUScan = () => {
    if (!scannedSKU.trim()) {
      toast.error('Please enter a SKU');
      return;
    }
    
    const product = products.find(p => p.sku?.toLowerCase() === scannedSKU.toLowerCase());
    if (product) {
      setEditProduct(product);
      setProductDialogOpen(true);
      setScannerOpen(false);
      setScannedSKU('');
      toast.success(`Found: ${product.name}`);
    } else {
      toast.error('Product not found');
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    categories.find(c => c.id === p.category_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
    lowStockItems: products.filter((p) => p.stock < 10).length,
    totalInventoryValue: products.reduce((sum, p) => sum + (p.price * (1 + p.gst_rate / 100) * p.stock), 0),
    criticalStock: products.filter((p) => p.stock < 5).length,
    needsReorder: products.filter((p) => p.stock <= p.reorder_point).length,
  };

  // Chart data
  const categoryData = categories.map(cat => ({
    name: cat.name,
    value: products.filter(p => p.category_id === cat.id).length,
    stock: products.filter(p => p.category_id === cat.id).reduce((sum, p) => sum + p.stock, 0),
  })).filter(d => d.value > 0);

  const stockDistribution = [
    { name: 'Critical (<5)', value: stats.criticalStock, color: '#ef4444' },
    { name: 'Low (5-10)', value: stats.lowStockItems - stats.criticalStock, color: '#f59e0b' },
    { name: 'Good (>10)', value: products.length - stats.lowStockItems, color: '#10b981' },
  ];

  // ABC Analysis (products by value)
  const productsByValue = [...products]
    .map(p => ({
      name: p.name,
      value: p.price * (1 + p.gst_rate / 100) * p.stock
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const getStockBadge = (stock: number, reorderPoint: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock < 5) return <Badge variant="destructive">{stock}</Badge>;
    if (stock <= reorderPoint) return <Badge className="bg-yellow-500">{stock}</Badge>;
    return <Badge variant="secondary">{stock}</Badge>;
  };

  if (authLoading || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">Inventory Management</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setScannerOpen(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              Scan SKU
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value (with GST)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(stats.totalInventoryValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Needs Reorder</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.needsReorder}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
              <PackageCheck className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.criticalStock}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Inventory</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products, SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={exportToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setEditProduct(null)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Product Name *</Label>
                            <Input id="name" name="name" defaultValue={editProduct?.name || ''} required />
                          </div>
                          <div>
                            <Label htmlFor="sku">SKU</Label>
                            <Input id="sku" name="sku" defaultValue={editProduct?.sku || ''} placeholder="PROD-001" />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" rows={3} defaultValue={editProduct?.description || ''} />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="price">Price (INR) *</Label>
                            <Input id="price" name="price" type="number" step="1" defaultValue={editProduct?.price || ''} required />
                          </div>
                          <div>
                            <Label htmlFor="gst_rate">GST Rate (%) *</Label>
                            <Input id="gst_rate" name="gst_rate" type="number" step="0.01" defaultValue={editProduct?.gst_rate || 18} required />
                          </div>
                          <div>
                            <Label htmlFor="stock">Current Stock *</Label>
                            <Input id="stock" name="stock" type="number" defaultValue={editProduct?.stock || ''} required />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="reorder_point">Reorder Point</Label>
                            <Input id="reorder_point" name="reorder_point" type="number" defaultValue={editProduct?.reorder_point || 10} />
                          </div>
                          <div>
                            <Label htmlFor="lead_time_days">Lead Time (days)</Label>
                            <Input id="lead_time_days" name="lead_time_days" type="number" defaultValue={editProduct?.lead_time_days || 7} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category_id">Category</Label>
                            <Select name="category_id" defaultValue={editProduct?.category_id || ''}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="supplier_id">Supplier</Label>
                            <Select name="supplier_id" defaultValue={editProduct?.supplier_id || ''}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map((sup) => (
                                  <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="image_url">Image URL</Label>
                          <Input id="image_url" name="image_url" type="url" defaultValue={editProduct?.image_url || ''} placeholder="https://..." />
                        </div>

                        <Button type="submit" className="w-full">{editProduct ? 'Update Product' : 'Create Product'}</Button>
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
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Price (incl. GST)</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const category = categories.find(c => c.id === product.category_id);
                        const supplier = suppliers.find(s => s.id === product.supplier_id);
                        const priceWithGST = product.price * (1 + product.gst_rate / 100);
                        const totalValue = priceWithGST * product.stock;

                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-mono text-xs">{product.sku || '-'}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{category?.name || '-'}</TableCell>
                            <TableCell className="text-sm">{supplier?.name || '-'}</TableCell>
                            <TableCell>{formatINR(product.price)}</TableCell>
                            <TableCell>{product.gst_rate}%</TableCell>
                            <TableCell className="font-semibold">{formatINR(priceWithGST)}</TableCell>
                            <TableCell>{getStockBadge(product.stock, product.reorder_point)}</TableCell>
                            <TableCell className="font-bold">{formatINR(totalValue)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setEditProduct(product); setProductDialogOpen(true); }}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)}>Delete</Button>
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
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stockDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {stockDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Products by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top 10 Products by Value (ABC Analysis)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productsByValue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <RechartsTooltip formatter={(value) => formatINR(Number(value))} />
                      <Bar dataKey="value" fill="#10b981" name="Total Value" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Modes Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'UPI', value: orders.filter(o => o.payment_mode === 'UPI').length, color: '#3b82f6' },
                          { name: 'Card', value: orders.filter(o => o.payment_mode === 'Card').length, color: '#10b981' },
                          { name: 'COD', value: orders.filter(o => o.payment_mode === 'COD').length, color: '#f59e0b' },
                        ]} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        label
                      >
                        {[
                          { name: 'UPI', value: orders.filter(o => o.payment_mode === 'UPI').length, color: '#3b82f6' },
                          { name: 'Card', value: orders.filter(o => o.payment_mode === 'Card').length, color: '#10b981' },
                          { name: 'COD', value: orders.filter(o => o.payment_mode === 'COD').length, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Customers by Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const customerTotals = orders.reduce((acc, order) => {
                      const email = order.profiles?.email || 'Unknown';
                      acc[email] = (acc[email] || 0) + Number(order.total);
                      return acc;
                    }, {} as Record<string, number>);

                    const topCustomers = Object.entries(customerTotals)
                      .map(([email, total]) => ({ email, total }))
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5);

                    return (
                      <div className="space-y-3">
                        {topCustomers.map((customer, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm">{customer.email}</span>
                            <Badge variant="secondary">{formatINR(customer.total)}</Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forecasting Tab */}
          <TabsContent value="forecasting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demand Forecasting & Reorder Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Calculate monthly sales for each product from last 6 months
                  const sixMonthsAgo = new Date();
                  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                  const productSales = inventoryLogs
                    .filter(log => log.change_type === 'sale' && new Date(log.date) >= sixMonthsAgo)
                    .reduce((acc, log) => {
                      acc[log.product_id] = (acc[log.product_id] || 0) + Math.abs(log.quantity);
                      return acc;
                    }, {} as Record<string, number>);

                  const forecasts = products
                    .filter(p => productSales[p.id])
                    .map(p => {
                      const totalSold = productSales[p.id] || 0;
                      const avgMonthlySales = totalSold / 6;
                      const predictedDemand = Math.ceil(avgMonthlySales * 1.5); // 1.5x safety factor
                      const daysUntilStockout = p.stock > 0 ? Math.floor(p.stock / (avgMonthlySales / 30)) : 0;
                      const suggestedReorder = Math.max(predictedDemand, p.reorder_point);

                      return {
                        ...p,
                        avgMonthlySales,
                        predictedDemand,
                        daysUntilStockout,
                        suggestedReorder,
                        urgency: daysUntilStockout < p.lead_time_days ? 'critical' : daysUntilStockout < 30 ? 'high' : 'normal'
                      };
                    })
                    .sort((a, b) => {
                      if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
                      if (a.urgency !== 'critical' && b.urgency === 'critical') return 1;
                      return a.daysUntilStockout - b.daysUntilStockout;
                    })
                    .slice(0, 20);

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Avg Monthly Sales</TableHead>
                          <TableHead>Days Until Stockout</TableHead>
                          <TableHead>Predicted Demand (Next Month)</TableHead>
                          <TableHead>Suggested Reorder Qty</TableHead>
                          <TableHead>Lead Time</TableHead>
                          <TableHead>Urgency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forecasts.map((forecast) => (
                          <TableRow key={forecast.id}>
                            <TableCell className="font-medium">{forecast.name}</TableCell>
                            <TableCell>{getStockBadge(forecast.stock, forecast.reorder_point)}</TableCell>
                            <TableCell>{forecast.avgMonthlySales.toFixed(1)}</TableCell>
                            <TableCell>
                              <Badge variant={forecast.daysUntilStockout < forecast.lead_time_days ? 'destructive' : 'secondary'}>
                                {forecast.daysUntilStockout} days
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{forecast.predictedDemand} units</TableCell>
                            <TableCell className="text-primary font-bold">{forecast.suggestedReorder} units</TableCell>
                            <TableCell>{forecast.lead_time_days} days</TableCell>
                            <TableCell>
                              <Badge variant={
                                forecast.urgency === 'critical' ? 'destructive' : 
                                forecast.urgency === 'high' ? 'default' : 'secondary'
                              }>
                                {forecast.urgency.toUpperCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Returns Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="font-mono text-xs">{ret.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">{ret.products?.name}</TableCell>
                        <TableCell>{ret.quantity}</TableCell>
                        <TableCell className="text-sm">{ret.reason}</TableCell>
                        <TableCell>
                          <Badge variant={
                            ret.status === 'approved' || ret.status === 'restocked' ? 'default' :
                            ret.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {ret.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(ret.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {ret.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleReturnAction(ret.id, ret.product_id, ret.quantity, 'approved')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleReturnAction(ret.id, ret.product_id, ret.quantity, 'restocked')}>
                                Restock
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReturnAction(ret.id, ret.product_id, ret.quantity, 'rejected')}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Supplier Management</CardTitle>
                <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setEditSupplier(null)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveSupplier} className="space-y-4">
                      <div>
                        <Label htmlFor="supplier_name">Supplier Name *</Label>
                        <Input id="supplier_name" name="name" defaultValue={editSupplier?.name || ''} required />
                      </div>
                      <div>
                        <Label htmlFor="contact_person">Contact Person</Label>
                        <Input id="contact_person" name="contact_person" defaultValue={editSupplier?.contact_person || ''} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="supplier_email">Email</Label>
                          <Input id="supplier_email" name="email" type="email" defaultValue={editSupplier?.email || ''} />
                        </div>
                        <div>
                          <Label htmlFor="supplier_phone">Phone</Label>
                          <Input id="supplier_phone" name="phone" defaultValue={editSupplier?.phone || ''} placeholder="+91-" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="rating">Rating (1-5)</Label>
                        <Input id="rating" name="rating" type="number" min="1" max="5" step="0.1" defaultValue={editSupplier?.rating || 3} />
                      </div>
                      <Button type="submit" className="w-full">{editSupplier ? 'Update Supplier' : 'Create Supplier'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => {
                      const productCount = products.filter(p => p.supplier_id === supplier.id).length;
                      return (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>{supplier.contact_person || '-'}</TableCell>
                          <TableCell>{supplier.email || '-'}</TableCell>
                          <TableCell>{supplier.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{supplier.rating.toFixed(1)} ⭐</Badge>
                          </TableCell>
                          <TableCell>{productCount}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => { setEditSupplier(supplier); setSupplierDialogOpen(true); }}>Edit</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 20).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.profiles?.email}</TableCell>
                        <TableCell className="font-semibold">{formatINR(order.total)}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select defaultValue={order.status} onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* SKU Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan or Enter SKU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sku_scan">Enter SKU</Label>
              <Input
                id="sku_scan"
                value={scannedSKU}
                onChange={(e) => setScannedSKU(e.target.value)}
                placeholder="PROD-001"
                onKeyDown={(e) => e.key === 'Enter' && handleSKUScan()}
              />
            </div>
            <Button onClick={handleSKUScan} className="w-full">Search Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function handleUpdateOrderStatus(orderId: string, status: string) {
    supabase.from('orders').update({ status }).eq('id', orderId).then(() => {
      toast.success('Order status updated');
      fetchData();
    });
  }

  async function handleReturnAction(returnId: string, productId: string, quantity: number, action: string) {
    try {
      // Update return status
      await supabase.from('returns').update({ status: action }).eq('id', returnId);

      // If restocking, add back to inventory
      if (action === 'restocked') {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock + quantity })
            .eq('id', productId);

          await supabase.from('inventory_logs').insert({
            product_id: productId,
            change_type: 'return',
            quantity: quantity,
          });
        }
      }

      toast.success(`Return ${action}!`);
      fetchData();
    } catch (error) {
      console.error('Error handling return:', error);
      toast.error('Failed to process return');
    }
  }
};

export default Dashboard;
