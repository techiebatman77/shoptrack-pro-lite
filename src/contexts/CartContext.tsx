import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from database when user logs in
  useEffect(() => {
    if (user) {
      loadCart();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('cart-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadCart();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setItems([]);
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        product_id,
        products (
          id,
          name,
          price,
          image_url
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading cart:', error);
      return;
    }

    const cartItems: CartItem[] = (data || []).map((item: any) => ({
      id: item.product_id,
      name: item.products.name,
      price: item.products.price,
      quantity: item.quantity,
      image_url: item.products.image_url,
    }));

    setItems(cartItems);
  };

  const addToCart = async (product: Omit<CartItem, 'quantity'>) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    const existing = items.find((item) => item.id === product.id);
    
    if (existing) {
      // Update quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('user_id', user.id)
        .eq('product_id', product.id);

      if (error) {
        toast.error('Failed to update cart');
        console.error('Error updating cart:', error);
        return;
      }
      toast.success('Updated cart quantity');
    } else {
      // Insert new item
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1
        });

      if (error) {
        toast.error('Failed to add to cart');
        console.error('Error adding to cart:', error);
        return;
      }
      toast.success('Added to cart!');
    }
  };

  const removeFromCart = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', id);

    if (error) {
      toast.error('Failed to remove from cart');
      console.error('Error removing from cart:', error);
      return;
    }
    toast.success('Removed from cart');
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (!user) return;

    if (quantity < 1) {
      removeFromCart(id);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('product_id', id);

    if (error) {
      toast.error('Failed to update quantity');
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
