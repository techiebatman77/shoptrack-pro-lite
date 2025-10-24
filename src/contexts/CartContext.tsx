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

  // Fetch cart items from database
  useEffect(() => {
    const fetchCartItems = async () => {
      if (!user) {
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
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
        console.error('Error fetching cart:', error);
        return;
      }

      const cartItems = data?.map((item: any) => ({
        id: item.products.id,
        name: item.products.name,
        price: item.products.price,
        quantity: item.quantity,
        image_url: item.products.image_url,
      })) || [];

      setItems(cartItems);
    };

    fetchCartItems();
  }, [user]);

  const addToCart = async (product: Omit<CartItem, 'quantity'>) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    const existing = items.find((item) => item.id === product.id);
    
    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('user_id', user.id)
        .eq('product_id', product.id);

      if (error) {
        toast.error('Failed to update cart');
        console.error(error);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
      toast.success('Updated cart quantity');
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
        });

      if (error) {
        toast.error('Failed to add to cart');
        console.error(error);
        return;
      }

      setItems((prev) => [...prev, { ...product, quantity: 1 }]);
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
      console.error(error);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
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
      console.error(error);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing cart:', error);
      return;
    }

    setItems([]);
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
