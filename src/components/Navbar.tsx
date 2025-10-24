import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LayoutDashboard, LogOut, Store, Database } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

export const Navbar = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b bg-card backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <Store className="h-5 w-5" />
            <span className="text-foreground">ShopTrack Pro</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/products">Products</Link>
            </Button>

            <Button variant="ghost" size="sm" className="relative" asChild>
              <Link to="/cart">
                <ShoppingCart className="h-4 w-4" />
                {items.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 text-[10px] rounded-full p-0 flex items-center justify-center">
                    {items.length}
                  </Badge>
                )}
              </Link>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {profile?.email}
                    {userRole === 'admin' && (
                      <Badge className="ml-2" variant="secondary">Admin</Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userRole === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
