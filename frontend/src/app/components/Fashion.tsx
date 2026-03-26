import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, Search } from "lucide-react";
import { Cloth, fetchClothes, createCloth, toNumber } from "../api";
import { useAuth } from "./AuthContext";

export function Fashion() {
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add modal (staff)
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", brand: "", category: "", size: "M", color: "",
    material: "", price: "", stock: "10", image_url: "", description: "",
  });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchClothes()
      .then((data) => { if (mounted) setItems(data); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : "Không thể tải danh sách thời trang."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.brand || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [items, searchTerm]
  );

  const handleAddCloth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.price) { setAddError("Vui lòng điền tên và giá."); return; }
    setAdding(true);
    try {
      const newCloth = await createCloth({
        name: addForm.name,
        brand: addForm.brand,
        category: addForm.category,
        size: addForm.size,
        color: addForm.color,
        material: addForm.material,
        price: Number(addForm.price),
        stock: Number(addForm.stock),
        image_url: addForm.image_url || undefined,
        description: addForm.description,
        is_active: true,
      });
      setItems((prev) => [...prev, newCloth]);
      setShowAdd(false);
      setAddForm({ name: "", brand: "", category: "", size: "M", color: "", material: "", price: "", stock: "10", image_url: "", description: "" });
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Thêm thất bại.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Quản lý Thời trang</h2>
          <p className="text-gray-600 mt-1">Clothes Service - Port 8009</p>
        </div>
        {isStaff && (
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Thêm sản phẩm mới
          </Button>
        )}
      </div>

      {/* Add Cloth Modal (staff) */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-auto py-8">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Thêm sản phẩm mới</h3>
              <form onSubmit={handleAddCloth} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {([["Tên sản phẩm","name"],["Thương hiệu","brand"],["Danh mục","category"],["Size","size"],["Màu sắc","color"],["Chất liệu","material"],["URL ảnh","image_url"],["Mô tả","description"]] as [string, keyof typeof addForm][]).map(([label, field]) => (
                    <div key={field} className={field === "description" || field === "image_url" || field === "name" ? "col-span-2" : ""}>
                      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
                      <Input value={addForm[field]} onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))} />
                    </div>
                  ))}
                </div>
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
                  <Button type="submit" disabled={adding} className="flex-1">{adding ? "Đang thêm..." : "Thêm"}</Button>
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
              placeholder="Tìm kiếm theo tên sản phẩm hoặc thương hiệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-gray-500 mb-4">Đang tải dữ liệu...</p>}
      {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Fashion Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/fashion/${item.id}`)}
          >
            <div className="h-48 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "http://localhost:8000/image/product-placeholder.svg"; }}
                />
              ) : (
                <span className="text-4xl">👕</span>
              )}
            </div>
            <CardContent className="p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.brand}</p>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">{item.category}</Badge>
                <Badge variant="outline">{item.color}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  {toNumber(item.price).toLocaleString("vi-VN")} ₫
                </span>
                <Badge variant={item.stock > 20 ? "default" : "destructive"}>{item.stock} sp</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
