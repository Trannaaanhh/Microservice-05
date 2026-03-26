import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import {
  Cart as CartModel, CartItem, Book,
  fetchCarts, fetchCartItems, fetchBooks,
  updateCartItem, deleteCartItem, createOrder,
  toNumber,
} from "../api";
import { useAuth } from "./AuthContext";

type CartItemEnriched = CartItem & {
  bookTitle: string;
  bookImage?: string;
  bookPrice: number;
};
type CartWithItems = CartModel & { items: CartItemEnriched[] };

export function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [carts, setCarts] = useState<CartWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState<number | null>(null); // cartId being checked out
  const [checkoutMsg, setCheckoutMsg] = useState<Record<number, string>>({}); // cartId → message

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cartList, books] = await Promise.all([fetchCarts(), fetchBooks()]);
      const bookMap = new Map(books.map((b) => [b.id, b]));

      const withItems = await Promise.all(
        cartList.map(async (cart) => {
          const rawItems = await fetchCartItems(cart.id);
          const items: CartItemEnriched[] = rawItems.map((item) => {
            const book = bookMap.get(item.book_id);
            return {
              ...item,
              bookTitle: book?.title ?? `Sách #${item.book_id}`,
              bookImage: book?.image_url,
              bookPrice: toNumber(book?.price),
            };
          });
          return { ...cart, items };
        })
      );
      setCarts(withItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Quantity update ----
  const handleQuantity = async (cartId: number, itemId: number, current: number, delta: number) => {
    const next = Math.max(1, current + delta);
    try {
      const updated = await updateCartItem(itemId, next);
      setCarts((prev) =>
        prev.map((c) =>
          c.id !== cartId
            ? c
            : { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, quantity: updated.quantity } : i) }
        )
      );
    } catch (e) {
      console.error("Update qty failed", e);
    }
  };

  // ---- Delete item ----
  const handleDeleteItem = async (cartId: number, itemId: number) => {
    try {
      await deleteCartItem(itemId);
      setCarts((prev) =>
        prev.map((c) =>
          c.id !== cartId ? c : { ...c, items: c.items.filter((i) => i.id !== itemId) }
        )
      );
    } catch (e) {
      console.error("Delete item failed", e);
    }
  };

  // ---- Checkout: create order then redirect ----
  const handleCheckout = async (cart: CartWithItems) => {
    if (cart.items.length === 0) {
      setCheckoutMsg((m) => ({ ...m, [cart.id]: "Giỏ hàng trống." }));
      return;
    }

    setCheckingOut(cart.id);
    setCheckoutMsg((m) => ({ ...m, [cart.id]: "" }));

    try {
      await createOrder({
        customer_id: cart.customer_id,
        book_ids: cart.items.map((i) => i.book_id),
        payment_status: "PAID",
        shipment_status: "SHIPPED",
      });

      // Clear items optimistically
      for (const item of cart.items) {
        await deleteCartItem(item.id).catch(() => {});
      }

      navigate("/orders");
    } catch (e: unknown) {
      setCheckoutMsg((m) => ({
        ...m,
        [cart.id]: e instanceof Error ? e.message : "Tạo đơn hàng thất bại.",
      }));
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Đang tải giỏ hàng...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  const totalCarts = carts.length;
  const nonEmptyCarts = carts.filter((c) => c.items.length > 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Quản lý Giỏ hàng</h2>
          <p className="text-gray-600 mt-1">Cart Service - Port 8003</p>
        </div>
        <Badge className="text-sm px-3 py-1">
          {totalCarts} giỏ hàng · {nonEmptyCarts.length} có sản phẩm
        </Badge>
      </div>

      <div className="space-y-6">
        {carts.map((cart) => {
          const cartTotal = cart.items.reduce(
            (sum, item) => sum + item.bookPrice * item.quantity, 0
          );
          const isCheckingOut = checkingOut === cart.id;

          return (
            <Card key={cart.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Giỏ hàng #{cart.id}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Khách hàng ID: {cart.customer_id}</p>
                  </div>
                  <div className="text-right">
                    {checkoutMsg[cart.id] && (
                      <p className="text-sm text-red-600 mb-2">{checkoutMsg[cart.id]}</p>
                    )}
                    <Button
                      onClick={() => handleCheckout(cart)}
                      disabled={isCheckingOut || cart.items.length === 0}
                      className="gap-2"
                    >
                      {isCheckingOut ? "Đang tạo đơn..." : (
                        <>Chuyển sang đơn hàng <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cart.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Giỏ hàng trống</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          {/* Image */}
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                            {item.bookImage ? (
                              <img
                                src={item.bookImage}
                                alt={item.bookTitle}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "http://localhost:8000/image/product-placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.bookTitle}</h4>
                            <p className="text-sm text-gray-500">
                              {item.bookPrice > 0
                                ? `${item.bookPrice.toLocaleString("vi-VN")} ₫ / cuốn`
                                : "Không có giá"}
                            </p>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => handleQuantity(cart.id, item.id, item.quantity, -1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => handleQuantity(cart.id, item.id, item.quantity, +1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Line total */}
                          <div className="text-right w-24 flex-shrink-0">
                            <p className="font-semibold text-gray-900">
                              {(item.bookPrice * item.quantity).toLocaleString("vi-VN")} ₫
                            </p>
                          </div>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                            onClick={() => handleDeleteItem(cart.id, item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Cart total */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">Tổng cộng:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {cartTotal > 0
                          ? `${cartTotal.toLocaleString("vi-VN")} ₫`
                          : `${cart.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm`}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
