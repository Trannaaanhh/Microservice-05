import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { fetchCarts, fetchCartItems } from "../api";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  cartCount: number;
  refreshCart: () => void;
  incrementCart: (by?: number) => void;
}

const CartContext = createContext<CartContextValue>({
  cartCount: 0,
  refreshCart: () => {},
  incrementCart: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!user?.customerId) { setCartCount(0); return; }
    try {
      const carts = await fetchCarts();
      const myCarts = carts.filter((c) => c.customer_id === user.customerId);
      let total = 0;
      for (const cart of myCarts) {
        const items = await fetchCartItems(cart.id);
        total += items.reduce((s, i) => s + i.quantity, 0);
      }
      setCartCount(total);
    } catch {
      // silent fail
    }
  }, [user]);

  const incrementCart = useCallback((by = 1) => {
    setCartCount((c) => c + by);
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart, incrementCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
