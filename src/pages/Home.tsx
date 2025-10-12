import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { Navbar } from '@/components/Navbar';
import { ArrowRight, TrendingUp, Package, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
}

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(6)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-card py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold text-foreground mb-6 tracking-tight">
              Welcome to ShopTrack Pro
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Your complete e-commerce and inventory management solution. Browse products, manage orders, and track inventory all in one place.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/products')}
                className="gap-2 h-12 px-8"
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/products')}
                className="h-12 px-8"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border rounded-lg p-8 hover:shadow-lg transition-all">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-3 text-foreground">Real-time Analytics</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Track sales and inventory with live dashboard updates and comprehensive reporting.
              </p>
            </div>
            <div className="bg-card border rounded-lg p-8 hover:shadow-lg transition-all">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-3 text-foreground">Inventory Management</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Easy stock management with low-stock alerts and automated reordering.
              </p>
            </div>
            <div className="bg-card border rounded-lg p-8 hover:shadow-lg transition-all">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-3 text-foreground">Secure Checkout</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Safe and reliable order processing with industry-standard security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Featured Products</h2>
              <p className="text-muted-foreground">Discover our latest arrivals and best sellers</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/products')} className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
