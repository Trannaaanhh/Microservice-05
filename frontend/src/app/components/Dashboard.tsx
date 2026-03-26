import { useEffect, useMemo, useState } from "react";
import { BookOpen, Database, Package, Server, ShoppingBag, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  fetchBooks,
  fetchCarts,
  fetchClothes,
  fetchCustomers,
  fetchOrders,
  fetchPayments,
  fetchShipments,
  getServiceBaseUrls,
  probeService,
} from "../api";

type ServiceStatus = {
  name: string;
  port: number;
  endpoint: string;
  healthy: boolean;
  icon: typeof BookOpen;
  color: string;
};

export function Dashboard() {
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [counts, setCounts] = useState({
    orders: 0,
    payments: 0,
    customers: 0,
    products: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [books, clothes, carts, orders, payments, shipments, customers] = await Promise.all([
          fetchBooks().catch(() => []),
          fetchClothes().catch(() => []),
          fetchCarts().catch(() => []),
          fetchOrders().catch(() => []),
          fetchPayments().catch(() => []),
          fetchShipments().catch(() => []),
          fetchCustomers().catch(() => []),
        ]);

        if (!mounted) {
          return;
        }

        setCounts({
          orders: orders.length,
          payments: payments.length,
          customers: customers.length,
          products: books.length + clothes.length,
        });

        const urls = getServiceBaseUrls();
        const serviceConfig = [
          { name: "Book Service", port: 8002, endpoint: `${urls.books}/books/`, icon: BookOpen, color: "bg-blue-500" },
          { name: "Cart Service", port: 8003, endpoint: `${urls.carts}/carts/`, icon: ShoppingCart, color: "bg-green-500" },
          { name: "Order Service", port: 8004, endpoint: `${urls.orders}/orders/`, icon: Package, color: "bg-purple-500" },
          { name: "Payment Service", port: 8005, endpoint: `${urls.payments}/payments/`, icon: TrendingUp, color: "bg-yellow-500" },
          { name: "Shipping Service", port: 8006, endpoint: `${urls.shipments}/shipments/`, icon: Server, color: "bg-orange-500" },
          { name: "Customer Service", port: 8001, endpoint: `${urls.customers}/customers/`, icon: Users, color: "bg-pink-500" },
          { name: "Clothes Service", port: 8009, endpoint: `${urls.clothes}/clothes/`, icon: ShoppingBag, color: "bg-indigo-500" },
          { name: "AI Service", port: 8008, endpoint: `${urls.recommendations}/recommendations/1/`, icon: Server, color: "bg-teal-500" },
        ];

        const probes = await Promise.all(serviceConfig.map((svc) => probeService(svc.endpoint)));

        if (!mounted) {
          return;
        }

        setServiceStatuses(
          serviceConfig.map((svc, index) => ({
            ...svc,
            healthy: probes[index],
          }))
        );

        void carts;
        void shipments;
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { name: "Tong don hang", value: counts.orders, icon: Package },
      { name: "Tong thanh toan", value: counts.payments, icon: TrendingUp },
      { name: "Khach hang", value: counts.customers, icon: Users },
      { name: "Tong san pham", value: counts.products, icon: Database },
    ],
    [counts]
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Tong quan he thong microservices</p>
      </div>

      {loading && <p className="text-sm text-gray-500 mb-4">Dang dong bo du lieu...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trang thai Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {serviceStatuses.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${service.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${service.healthy ? "bg-green-500" : "bg-red-500"}`}></div>
                      <span className="text-xs text-gray-600">{service.healthy ? "Running" : "Down"}</span>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{service.name}</h4>
                  <p className="text-sm text-gray-500">Port: {service.port}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
