import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, Search, Trash2 } from "lucide-react";
import { Book, fetchBooks, createBook, deleteBook, toNumber } from "../api";
import { useAuth } from "./AuthContext";

export function Books() {
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add new book modal (staff)
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", author: "", price: "", stock: "10", image_url: "" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchBooks()
      .then((data) => { if (mounted) setBooks(data); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : "Không thể tải danh sách sách."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filteredBooks = useMemo(
    () =>
      books.filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [books, searchTerm]
  );

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title || !addForm.author || !addForm.price) { setAddError("Vui lòng điền đầy đủ thông tin."); return; }
    setAdding(true);
    try {
      const newBook = await createBook({
        title: addForm.title,
        author: addForm.author,
        price: Number(addForm.price),
        stock: Number(addForm.stock),
        image_url: addForm.image_url || undefined,
      });
      setBooks((prev) => [...prev, newBook]);
      setShowAdd(false);
      setAddForm({ title: "", author: "", price: "", stock: "10", image_url: "" });
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Thêm sách thất bại.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa sách "${book.title}"?`)) return;
    await deleteBook(book.id);
    setBooks((prev) => prev.filter((b) => b.id !== book.id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Quản lý Sách</h2>
          <p className="text-gray-600 mt-1">Book Service - Port 8002</p>
        </div>
        {isStaff && (
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Thêm sách mới
          </Button>
        )}
      </div>

      {/* Add Book Modal (staff) */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle>Thêm sách mới</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBook} className="space-y-3">
                {(["Tên sách|title", "Tác giả|author", "URL ảnh|image_url"] as const).map((item) => {
                  const [label, field] = item.split("|") as [string, keyof typeof addForm];
                  return (
                    <div key={field}>
                      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
                      <Input value={addForm[field]} onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))} />
                    </div>
                  );
                })}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Giá</label>
                    <Input type="number" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Tồn kho</label>
                    <Input type="number" value={addForm.stock} onChange={(e) => setAddForm((f) => ({ ...f, stock: e.target.value }))} />
                  </div>
                </div>
                {addError && <p className="text-sm text-red-600">{addError}</p>}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={adding} className="flex-1">{adding ? "Đang thêm..." : "Thêm sách"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setAddError(""); }} className="flex-1">Hủy</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên sách hoặc tác giả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sách ({filteredBooks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-gray-500 mb-4">Đang tải dữ liệu...</p>}
          {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 w-16">Ảnh</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tên sách</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tác giả</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Giá</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tồn kho</th>
                  {isStaff && <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/books/${book.id}`)}
                  >
                    <td className="py-2 px-4">
                      {book.image_url ? (
                        <img
                          src={book.image_url}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).src = "http://localhost:8000/image/product-placeholder.svg"; }}
                        />
                      ) : (
                        <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center text-lg">📚</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">#{book.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{book.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{book.author}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{toNumber(book.price).toLocaleString("vi-VN")} ₫</td>
                    <td className="py-3 px-4 text-sm">
                      <Badge variant={book.stock > 15 ? "default" : "destructive"}>{book.stock} cuốn</Badge>
                    </td>
                    {isStaff && (
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={(e) => handleDelete(e, book)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
