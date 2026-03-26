import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Package, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { Order, fetchOrders } from "../api";

const statusConfig = {
  pending: {
    label: "Chờ xử lý",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  processing: {
    label: "Đang xử lý",
    color: "bg-blue-100 text-blue-700",
    icon: Package,
  },
  shipping: {
    label: "Đang giao",
    color: "bg-purple-100 text-purple-700",
    icon: Package,
  },
  delivered: {
    label: "Đã giao",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    fetchOrders()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setOrders(data);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Khong the tai danh sach don hang.");
      })
      .finally(() => {
        if (!mounted) {
          return;
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedOrders = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        status_key: String(o.status || "PENDING").toLowerCase(),
      })),
    [orders]
  );

  const stats = {
    total: normalizedOrders.length,
    pending: normalizedOrders.filter((o) => o.status_key.includes("pending")).length,
    processing: normalizedOrders.filter((o) => o.status_key.includes("confirm") || o.status_key.includes("process")).length,
    shipping: normalizedOrders.filter((o) => o.status_key.includes("ship") || o.status_key.includes("reserve")).length,
    delivered: normalizedOrders.filter((o) => o.status_key.includes("release") || o.status_key.includes("complete")).length,
    cancelled: normalizedOrders.filter((o) => o.status_key.includes("fail") || o.status_key.includes("cancel")).length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">
          Quản lý Đơn hàng
        </h2>
        <p className="text-gray-600 mt-1">Orders Service - Port 8004</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600 mt-1">Tổng đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-yellow-600">
              {stats.pending}
            </p>
            <p className="text-sm text-gray-600 mt-1">Chờ xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-blue-600">
              {stats.processing}
            </p>
            <p className="text-sm text-gray-600 mt-1">Đang xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-purple-600">
              {stats.shipping}
            </p>
            <p className="text-sm text-gray-600 mt-1">Đang giao</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-green-600">
              {stats.delivered}
            </p>
            <p className="text-sm text-gray-600 mt-1">Đã giao</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-red-600">
              {stats.cancelled}
            </p>
            <p className="text-sm text-gray-600 mt-1">Đã hủy</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn hàng</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-gray-500 mb-4">Dang tai du lieu...</p>}
          {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="space-y-4">
            {normalizedOrders.map((order) => {
              const statusInfo =
                statusConfig[(order.status_key.includes("pending")
                  ? "pending"
                  : order.status_key.includes("confirm") || order.status_key.includes("process")
                  ? "processing"
                  : order.status_key.includes("ship") || order.status_key.includes("reserve")
                  ? "shipping"
                  : order.status_key.includes("release") || order.status_key.includes("complete")
                  ? "delivered"
                  : "cancelled") as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={String(order.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        ORD-{order.id}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Khách hàng ID: {order.customer_id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Saga: {order.saga_state || "N/A"}
                      </p>
                    </div>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Số sản phẩm</p>
                      <p className="font-medium text-gray-900">
                        {order.book_ids?.length || 0} sản phẩm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Trạng thái</p>
                      <p className="font-medium text-gray-900">{order.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Mã KH</p>
                      <p className="font-medium text-gray-900">
                        {order.customer_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Eye className="w-4 h-4" />
                      Chi tiết
                    </Button>
                    {String(order.status).toLowerCase().includes("pending") && (
                      <Button size="sm">Xác nhận đơn</Button>
                    )}
                    {(String(order.status).toLowerCase().includes("confirm") || String(order.status).toLowerCase().includes("process")) && (
                      <Button size="sm">Chuyển giao hàng</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
