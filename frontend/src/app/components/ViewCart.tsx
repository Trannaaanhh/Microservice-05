import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import {
  CartItem, Book, Cart,
  fetchCarts, fetchCartItems, fetchBooks,
  updateCartItem, deleteCartItem, createOrder, toNumber,
} from "../api";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";

type CartItemEnriched = CartItem & {
  bookTitle: string;
  bookImage?: string;
  bookPrice: number;
};

export function ViewCart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshCart } = useCart();

  const [cartId, setCartId] = useState<number | null>(null);
  const [items, setItems] = useState<CartItemEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState("");

  useEffect(() => {
    if (!user?.customerId) { setLoading(false); return; }

    let mounted = true;
    async function load() {
      try {
        const [allCarts, books] = await Promise.all([fetchCarts(), fetchBooks()]);
        const bookMap = new Map(books.map((b) => [b.id, b]));

        // Find this customer's cart
        const myCarts = allCarts.filter((c: Cart) => c.customer_id === user!.customerId);
        if (myCarts.length === 0) {
          if (mounted) { setItems([]); setLoading(false); }
          return;
        }

        const myCart = myCarts[0];
        if (mounted) setCartId(myCart.id);

        const rawItems = await fetchCartItems(myCart.id);
        const enriched: CartItemEnriched[] = rawItems.map((item) => {
          const book = bookMap.get(item.book_id);
          return {
            ...item,
            bookTitle: book?.title ?? `Sách #${item.book_id}`,
            bookImage: book?.image_url,
            bookPrice: toNumber(book?.price),
          };
        });
        if (mounted) setItems(enriched);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Không thể tải giỏ hàng.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  const handleQuantity = async (itemId: number, current: number, delta: number) => {
    const next = Math.max(1, current + delta);
    try {
      const updated = await updateCartItem(itemId, next);
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: updated.quantity } : i));
      refreshCart();
    } catch {}
  };

  const handleDelete = async (itemId: number) => {
    try {
      await deleteCartItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      refreshCart();
    } catch {}
  };

  const handleCheckout = async () => {
    if (!user?.customerId || !cartId || items.length === 0) return;
    setCheckingOut(true);
    setCheckoutMsg("");
    try {
      await createOrder({
        customer_id: user.customerId,
        book_ids: items.map((i) => i.book_id),
      });
      for (const item of items) {
        await deleteCartItem(item.id).catch(() => {});
      }
      setItems([]);
      refreshCart();
      navigate("/orders");
    } catch (e: unknown) {
      setCheckoutMsg(e instanceof Error ? e.message : "Đặt hàng thất bại.");
    } finally {
      setCheckingOut(false);
    }
  };

  const total = items.reduce((s, i) => s + i.bookPrice * i.quantity, 0);

  if (loading) return <div className="p-8 text-gray-500">Đang tải giỏ hàng...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Giỏ hàng của tôi</h2>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} sản phẩm</p>
        </div>
        <button
          onClick={() => navigate("/books")}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" /> Tiếp tục mua sắm
        </button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-gray-400">
            <ShoppingBag className="w-14 h-14 mb-3 opacity-20" />
            <p className="text-base font-medium">Giỏ hàng trống</p>
            <p className="text-sm mt-1">Hãy thêm sách vào giỏ hàng để mua nhé!</p>
            <Button className="mt-4" onClick={() => navigate("/books")}>Xem sách</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-0 divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  {/* Book image */}
                  <div className="w-14 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
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
                    <p
                      className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer truncate"
                      onClick={() => navigate(`/books/${item.book_id}`)}
                    >
                      {item.bookTitle}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.bookPrice > 0
                        ? `${item.bookPrice.toLocaleString("vi-VN")} ₫`
                        : "—"}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuantity(item.id, item.quantity, -1)}
                      disabled={item.quantity <= 1}
                      className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 text-sm"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-semibold text-gray-900 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantity(item.id, item.quantity, +1)}
                      className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line total */}
                  <span className="w-20 text-right font-semibold text-gray-900 text-sm flex-shrink-0">
                    {(item.bookPrice * item.quantity).toLocaleString("vi-VN")} ₫
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)</span>
                <span>{total.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-3">
                <span>Tổng cộng</span>
                <span className="text-blue-600">{total.toLocaleString("vi-VN")} ₫</span>
              </div>
              {checkoutMsg && <p className="text-sm text-red-600">{checkoutMsg}</p>}
              <Button
                className="w-full gap-2 h-11 text-base"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? "Đang đặt hàng..." : (
                  <><ArrowRight className="w-4 h-4" /> Đặt hàng ngay</>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
