import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search, Mail, Phone, MapPin, ShoppingBag } from "lucide-react";
import { Customer, fetchCustomers } from "../api";

export function Customers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    fetchCustomers()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setCustomers(data);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Khong the tai danh sach khach hang.");
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

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(customer.id).toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [customers, searchTerm]
  );

  const stats = {
    total: customers.length,
    active: customers.length,
    vip: 0,
    totalRevenue: 0,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">
          Quản lý Khách hàng
        </h2>
        <p className="text-gray-600 mt-1">Customer Service - Port 8001</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Tổng khách hàng</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Đang hoạt động</p>
            <p className="text-3xl font-semibold text-green-600 mt-1">
              {stats.active}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Khách hàng VIP</p>
            <p className="text-3xl font-semibold text-purple-600 mt-1">
              {stats.vip}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Tổng doanh thu</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">
              {stats.totalRevenue.toLocaleString("vi-VN")} ₫
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên, email hoặc mã khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {loading && <p className="text-sm text-gray-500 mb-4">Dang tai du lieu...</p>}
      {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-1 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-semibold text-blue-600">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {customer.name}
                      </h3>
                      <Badge variant="secondary">Hoạt động</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Ma KH: {customer.id}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}`)}>
                  Xem chi tiết
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{customer.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Điện thoại</p>
                    <p className="text-sm text-gray-900">N/A</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Địa chỉ</p>
                    <p className="text-sm text-gray-900">N/A</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Đơn hàng</p>
                    <p className="text-sm text-gray-900">N/A</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng chi tiêu</p>
                    <p className="text-lg font-semibold text-blue-600">N/A</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Tham gia từ</p>
                    <p className="text-sm text-gray-900">N/A</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
