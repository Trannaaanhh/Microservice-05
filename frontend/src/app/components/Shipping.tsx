import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Truck, MapPin, Clock, CheckCircle } from "lucide-react";
import { Shipment, fetchShipments } from "../api";

const statusConfig = {
  preparing: {
    label: "Đang chuẩn bị",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  in_transit: {
    label: "Đang vận chuyển",
    color: "bg-purple-100 text-purple-700",
    icon: Truck,
  },
  out_for_delivery: {
    label: "Đang giao hàng",
    color: "bg-yellow-100 text-yellow-700",
    icon: MapPin,
  },
  delivered: {
    label: "Đã giao hàng",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
};

export function Shipping() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    fetchShipments()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setShipments(data);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Khong the tai danh sach van chuyen.");
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

  const normalizedShipments = useMemo(
    () =>
      shipments.map((s) => {
        const key = String(s.status || "").toLowerCase();
        if (key.includes("ship")) {
          return { ...s, mappedStatus: "in_transit", progress: 60 };
        }
        if (key.includes("process") || key.includes("pending")) {
          return { ...s, mappedStatus: "preparing", progress: 20 };
        }
        if (key.includes("release")) {
          return { ...s, mappedStatus: "delivered", progress: 100 };
        }
        return { ...s, mappedStatus: "out_for_delivery", progress: 90 };
      }),
    [shipments]
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">
          Quản lý Vận chuyển
        </h2>
        <p className="text-gray-600 mt-1">Shipping Service - Port 8006</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Đang chuẩn bị</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    normalizedShipments.filter((s) => s.mappedStatus === "preparing")
                      .length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Đang vận chuyển</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    normalizedShipments.filter((s) => s.mappedStatus === "in_transit")
                      .length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Đang giao hàng</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    normalizedShipments.filter((s) => s.mappedStatus === "out_for_delivery").length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Đã giao</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    normalizedShipments.filter((s) => s.mappedStatus === "delivered")
                      .length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments List */}
      {loading && <p className="text-sm text-gray-500 mb-4">Dang tai du lieu...</p>}
      {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {normalizedShipments.map((shipment) => {
          const statusInfo = statusConfig[shipment.mappedStatus as keyof typeof statusConfig];
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={String(shipment.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Vận đơn SHIP-{shipment.id}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Đơn hàng: ORD-{shipment.order_id}
                    </p>
                  </div>
                  <Badge className={statusInfo.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Địa chỉ giao hàng</p>
                        <p className="font-medium text-gray-900">
                          N/A
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">
                          Đơn vị vận chuyển
                        </p>
                        <p className="font-medium text-gray-900">
                          N/A
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Mã vận đơn: N/A
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    {shipment.mappedStatus !== "delivered" && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">
                          Vị trí hiện tại
                        </p>
                        <p className="font-medium text-gray-900">
                          N/A
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {shipment.mappedStatus === "delivered"
                          ? "Đã giao lúc"
                          : "Dự kiến giao"}
                      </p>
                      <p className="font-medium text-gray-900">
                        N/A
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Tiến độ</span>
                    <span className="text-sm font-medium text-gray-900">
                      {shipment.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${shipment.progress}%` }}
                    ></div>
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  Xem chi tiết tracking
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
