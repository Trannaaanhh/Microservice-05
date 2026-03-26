import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Customer, fetchCustomers, fetchOrders, Order } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Mail, Package } from "lucide-react";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchCustomers(), fetchOrders()])
      .then(([customers, allOrders]) => {
        if (!mounted) return;
        const found = customers.find((c) => c.id === customerId) ?? null;
        setCustomer(found);
        setOrders(allOrders.filter((o) => o.customer_id === customerId));
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [customerId]);

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!customer) return <div className="p-8 text-gray-400">Không tìm thấy khách hàng.</div>;

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/customers")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Profile */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{customer.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{customer.email}</span>
              </div>
              <Badge variant="secondary" className="mt-2">Mã KH: #{customer.id}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Lịch sử đơn hàng ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Khách hàng chưa có đơn hàng nào.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const colorClass = statusColor[order.status.toUpperCase()] ?? "bg-gray-100 text-gray-700";
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-900">Đơn hàng #ORD-{order.id}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{order.book_ids?.length ?? 0} sản phẩm</p>
                    </div>
                    <Badge className={colorClass}>{order.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
