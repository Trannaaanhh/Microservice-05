import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Book, fetchBook, fetchRatings, Rating,
  createRating, updateBook, deleteBook, toNumber,
  ensureCart, createCartItem,
} from "../api";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { useToast } from "./ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  ArrowLeft, Star, Trash2, ShoppingCart, Edit, Save, X, Minus, Plus,
} from "lucide-react";

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStaff, isCustomer } = useAuth();
  const { incrementCart } = useCart();
  const { showToast } = useToast();

  const bookId = Number(id);

  // data
  const [book, setBook] = useState<Book | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // edit state (staff)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Book>>({});
  const [saving, setSaving] = useState(false);

  // comment state (customer)
  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // cart state (customer)
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([fetchBook(bookId), fetchRatings()])
      .then(([b, r]) => {
        if (!mounted) return;
        setBook(b);
        setRatings(r.filter((x) => x.book_id === bookId));
        setEditForm(b);
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [bookId]);

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : "—";

  // ---- Staff: Save edit ----
  const handleSave = async () => {
    if (!book) return;
    setSaving(true);
    try {
      const updated = await updateBook(book.id, editForm);
      setBook(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Staff: Delete ----
  const handleDelete = async () => {
    if (!book || !window.confirm(`Xóa sách "${book.title}"?`)) return;
    await deleteBook(book.id);
    navigate("/books");
  };

  // ---- Customer: Add to cart ----
  const handleAddToCart = async () => {
    if (!user?.customerId) { setCartMsg("Không tìm thấy thông tin khách hàng."); return; }
    setAddingToCart(true);
    try {
      const cart = await ensureCart(user.customerId);
      await createCartItem({ cart: cart.id, book_id: bookId, quantity: qty });
      incrementCart(qty);
      showToast(`Đã thêm ${qty > 1 ? qty + " cuốn " : ""}"${book?.title ?? 'sách'}" vào giỏ hàng! 🛒`);
      setCartMsg("");
      setQty(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Thêm giỏ hàng thất bại.";
      setCartMsg(msg);
      showToast(msg, "error");
    } finally {
      setAddingToCart(false);
    }
  };

  // ---- Customer: Submit rating ----
  const handleRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.customerId) return;
    if (!comment.trim()) { setError("Vui lòng nhập nhận xét."); return; }
    setSubmitting(true);
    try {
      const newRating = await createRating({
        customer_id: user.customerId,
        book_id: bookId,
        rating: ratingValue,
        comment: comment.trim(),
      });
      setRatings((prev) => [newRating, ...prev]);
      setComment("");
      setRatingValue(5);
      setSuccessMsg("Cảm ơn nhận xét của bạn! ⭐");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gửi thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>;
  if (error && !book) return <div className="p-8 text-red-600">{error}</div>;
  if (!book) return <div className="p-8 text-gray-400">Không tìm thấy sách.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/books")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Cover */}
        <div className="md:col-span-1">
          <div className="aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden shadow-md">
            {book.image_url ? (
              <img
                src={book.image_url}
                alt={book.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "http://localhost:8000/image/product-placeholder.svg"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">📚</div>
            )}
          </div>
        </div>

        {/* Info / Edit form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xl">{editing ? "Chỉnh sửa sách" : book.title}</CardTitle>
              {isStaff && !editing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit className="w-4 h-4 mr-1" /> Sửa
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-3">
                  {(["title","author","image_url"] as const).map((field) => (
                    <div key={field}>
                      <label className="text-xs text-gray-500 uppercase font-semibold">{field === "image_url" ? "URL ảnh" : field === "title" ? "Tên sách" : "Tác giả"}</label>
                      <Input
                        value={String(editForm[field] ?? "")}
                        onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-semibold">Giá</label>
                      <Input
                        type="number"
                        value={editForm.price ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-semibold">Tồn kho</label>
                      <Input
                        type="number"
                        value={editForm.stock ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
                      <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu"}
                    </Button>
                    <Button variant="outline" onClick={() => { setEditing(false); setEditForm(book); }} className="flex-1 gap-1">
                      <X className="w-4 h-4" /> Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  <div><dt className="text-xs text-gray-500 uppercase font-semibold">Tác giả</dt><dd className="text-gray-900">{book.author}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase font-semibold">Giá</dt><dd className="text-lg font-semibold text-blue-600">{toNumber(book.price).toLocaleString("vi-VN")} ₫</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase font-semibold">Tồn kho</dt>
                    <dd><Badge variant={book.stock > 10 ? "default" : "destructive"}>{book.stock} cuốn</Badge></dd>
                  </div>
                  <div><dt className="text-xs text-gray-500 uppercase font-semibold">Đánh giá trung bình</dt>
                    <dd className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="font-semibold">{avgRating}</span><span className="text-gray-500 text-sm">({ratings.length} đánh giá)</span></dd>
                  </div>
                </dl>
              )}

              {isCustomer && !editing && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {cartMsg && <p className="text-sm text-red-600">{cartMsg}</p>}
                  {/* Quantity selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Số lượng:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-900 text-base">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(book.stock, q + 1))}
                        disabled={qty >= book.stock}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">(tối đa {book.stock} cuốn)</span>
                  </div>
                  <Button onClick={handleAddToCart} disabled={addingToCart} className="w-full gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    {addingToCart ? "Đang thêm..." : `Thêm ${qty > 1 ? qty + " cuốn " : ""}vào giỏ hàng`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Đánh giá & Bình luận ({ratings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Customer: Submit form */}
          {isCustomer && (
            <form onSubmit={handleRating} className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-gray-900 mb-3">Viết đánh giá của bạn</h4>
              {successMsg && <p className="text-sm text-green-600 mb-2">{successMsg}</p>}
              {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
              {/* Star picker */}
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} type="button" onClick={() => setRatingValue(s)}>
                    <Star className={`w-6 h-6 transition-colors ${s <= ratingValue ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600 self-center">{ratingValue}/5</span>
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
                placeholder="Nhận xét của bạn về cuốn sách..."
                value={comment}
                onChange={(e) => { setComment(e.target.value); setError(""); }}
              />
              <Button type="submit" disabled={submitting} className="mt-2 gap-1">
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            </form>
          )}

          {/* Existing reviews */}
          <div className="space-y-4">
            {ratings.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Chưa có đánh giá nào.</p>
            ) : (
              ratings.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {r.customer_id}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Khách hàng #{r.customer_id}</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
