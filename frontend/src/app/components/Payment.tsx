import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CreditCard, Smartphone, Wallet, TrendingUp } from "lucide-react";
import { Payment as PaymentModel, fetchPayments } from "../api";

const methodConfig = {
  credit_card: { label: "Thẻ tín dụng", icon: CreditCard, color: "bg-blue-100 text-blue-700" },
  momo: { label: "Ví MoMo", icon: Smartphone, color: "bg-pink-100 text-pink-700" },
  bank_transfer: { label: "Chuyển khoản", icon: Wallet, color: "bg-purple-100 text-purple-700" },
  cod: { label: "COD", icon: Wallet, color: "bg-gray-100 text-gray-700" },
};

const statusConfig = {
  completed: { label: "Thành công", color: "bg-green-100 text-green-700" },
  pending: { label: "Đang chờ", color: "bg-yellow-100 text-yellow-700" },
  processing: { label: "Đang xử lý", color: "bg-blue-100 text-blue-700" },
  failed: { label: "Thất bại", color: "bg-red-100 text-red-700" },
  refunded: { label: "Đã hoàn tiền", color: "bg-orange-100 text-orange-700" },
};

export function Payment() {
  const [payments, setPayments] = useState<PaymentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    fetchPayments()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setPayments(data);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Khong the tai danh sach thanh toan.");
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

  const totalAmount = 0;
  const completedAmount = 0;
  const completedCount = useMemo(
    () => payments.filter((p) => String(p.status).toLowerCase().includes("paid") || String(p.status).toLowerCase().includes("release")).length,
    [payments]
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">
          Quản lý Thanh toán
        </h2>
        <p className="text-gray-600 mt-1">Payment Service - Port 8005</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng giao dịch</p>
                <p className="text-xl font-semibold text-gray-900">
                  {payments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Thành công</p>
                <p className="text-xl font-semibold text-green-600">
                  {completedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-600">Tổng doanh thu</p>
              <p className="text-xl font-semibold text-gray-900">
                {totalAmount.toLocaleString("vi-VN")} ₫
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-600">Đã thanh toán</p>
              <p className="text-xl font-semibold text-green-600">
                {completedAmount.toLocaleString("vi-VN")} ₫
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-gray-500 mb-4">Dang tai du lieu...</p>}
          {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Mã thanh toán
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Đơn hàng
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Khách hàng
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Phương thức
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Số tiền
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Trạng thái
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Thời gian
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Mã giao dịch
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const statusKey = String(payment.status || "").toLowerCase();
                  const methodInfo = methodConfig.cod;
                  const statusInfo =
                    statusKey.includes("paid") || statusKey.includes("release")
                      ? statusConfig.completed
                      : statusKey.includes("pending")
                      ? statusConfig.pending
                      : statusKey.includes("process") || statusKey.includes("reserve")
                      ? statusConfig.processing
                      : statusKey.includes("fail")
                      ? statusConfig.failed
                      : statusConfig.refunded;
                  const MethodIcon = methodInfo.icon;

                  return (
                    <tr key={String(payment.id)} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        PAY-{payment.id}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        ORD-{payment.order_id}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        N/A
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Badge className={methodInfo.color}>
                          <MethodIcon className="w-3 h-3 mr-1" />
                          {methodInfo.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        N/A
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        N/A
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        N/A
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
