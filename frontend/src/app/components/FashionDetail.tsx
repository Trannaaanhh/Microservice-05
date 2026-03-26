import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Cloth, fetchCloth, updateCloth, deleteCloth, toNumber } from "../api";
import { useAuth } from "./AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ArrowLeft, Edit, Save, Trash2, X } from "lucide-react";

export function FashionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const clothId = Number(id);

  const [cloth, setCloth] = useState<Cloth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Cloth>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchCloth(clothId)
      .then((c) => { if (mounted) { setCloth(c); setEditForm(c); } })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [clothId]);

  const handleSave = async () => {
    if (!cloth) return;
    setSaving(true);
    try {
      const updated = await updateCloth(cloth.id, editForm);
      setCloth(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cloth || !window.confirm(`Xóa "${cloth.name}"?`)) return;
    await deleteCloth(cloth.id);
    navigate("/fashion");
  };

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>;
  if (error && !cloth) return <div className="p-8 text-red-600">{error}</div>;
  if (!cloth) return <div className="p-8 text-gray-400">Không tìm thấy sản phẩm.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/fashion")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl overflow-hidden shadow-md">
          {cloth.image_url ? (
            <img
              src={cloth.image_url}
              alt={cloth.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "http://localhost:8000/image/product-placeholder.svg"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">👕</div>
          )}
        </div>

        {/* Info / Edit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>{editing ? "Chỉnh sửa sản phẩm" : cloth.name}</CardTitle>
            {isStaff && !editing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit className="w-4 h-4 mr-1" /> Sửa
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                {(["name","brand","category","size","color","material","image_url","description"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-xs text-gray-500 uppercase font-semibold">{field}</label>
                    <Input
                      value={String(editForm[field] ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-semibold">Giá</label>
                    <Input type="number" value={editForm.price ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-semibold">Tồn kho</label>
                    <Input type="number" value={editForm.stock ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, stock: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1"><Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu"}</Button>
                  <Button variant="outline" onClick={() => { setEditing(false); setEditForm(cloth!); }} className="flex-1 gap-1"><X className="w-4 h-4" /> Hủy</Button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <div><dt className="text-xs text-gray-500 uppercase font-semibold">Thương hiệu</dt><dd>{cloth.brand}</dd></div>
                <div><dt className="text-xs text-gray-500 uppercase font-semibold">Danh mục</dt><dd><Badge variant="secondary">{cloth.category}</Badge></dd></div>
                <div className="flex gap-4">
                  <div><dt className="text-xs text-gray-500 uppercase font-semibold">Màu sắc</dt><dd><Badge variant="outline">{cloth.color}</Badge></dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase font-semibold">Kích cỡ</dt><dd><Badge variant="outline">{cloth.size}</Badge></dd></div>
                </div>
                <div><dt className="text-xs text-gray-500 uppercase font-semibold">Chất liệu</dt><dd className="text-gray-700">{cloth.material}</dd></div>
                <div><dt className="text-xs text-gray-500 uppercase font-semibold">Giá</dt><dd className="text-lg font-semibold text-blue-600">{toNumber(cloth.price).toLocaleString("vi-VN")} ₫</dd></div>
                <div><dt className="text-xs text-gray-500 uppercase font-semibold">Tồn kho</dt><dd><Badge variant={cloth.stock > 20 ? "default" : "destructive"}>{cloth.stock} sản phẩm</Badge></dd></div>
                {cloth.description && <div><dt className="text-xs text-gray-500 uppercase font-semibold">Mô tả</dt><dd className="text-sm text-gray-600">{cloth.description}</dd></div>}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
