import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { formatINR } from '@/lib/formatINR';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'COD'>('UPI');
  const [customerNotes, setCustomerNotes] = useState('');

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (items.length === 0 && !orderComplete) {
    navigate('/cart');
    return null;
  }

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // Create order with payment mode and notes
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total,
          status: 'pending',
          payment_mode: paymentMode,
          customer_notes: customerNotes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items and update stock
      for (const item of items) {
        // Insert order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
          });

        if (itemError) throw itemError;

        // Get current stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (productError) throw productError;

        // Update stock
        const newStock = product.stock - item.quantity;
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Log inventory change
        await supabase.from('inventory_logs').insert({
          product_id: item.id,
          change_type: 'sale',
          quantity: -item.quantity,
        });
      }

      // Create payment record
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: total,
        mode: paymentMode,
        status: paymentMode === 'COD' ? 'pending' : 'paid',
      });

      clearCart();
      setOrderComplete(true);
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="p-8 space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
                <p className="text-muted-foreground">
                  Thank you for your purchase. Your order has been successfully placed.
                </p>
              </div>
              <Button onClick={() => navigate('/')} className="w-full">
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Order Items</h2>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {item.name} x {item.quantity}
                        </span>
                        <span className="font-semibold">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Payment Method</h2>
                <RadioGroup value={paymentMode} onValueChange={(val) => setPaymentMode(val as 'UPI' | 'Card' | 'COD')}>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setPaymentMode('UPI')}>
                    <RadioGroupItem value="UPI" id="upi" />
                    <Label htmlFor="upi" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">UPI</div>
                        <div className="text-sm text-muted-foreground">GPay, PhonePe, Paytm</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setPaymentMode('Card')}>
                    <RadioGroupItem value="Card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Credit/Debit Card</div>
                        <div className="text-sm text-muted-foreground">Visa, Mastercard, RuPay</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setPaymentMode('COD')}>
                    <RadioGroupItem value="COD" id="cod" />
                    <Label htmlFor="cod" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Banknote className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Cash on Delivery</div>
                        <div className="text-sm text-muted-foreground">Pay when you receive</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="pt-4">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Special instructions for your order..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-bold">Order Total</h2>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatINR(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">Free</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatINR(total)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
