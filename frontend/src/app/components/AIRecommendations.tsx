import { useEffect, useMemo, useState } from "react";
import { Package, Sparkles, TrendingUp, Users } from "lucide-react";

import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Customer, Recommendation, fetchCustomers, fetchRecommendations, toNumber } from "../api";

type CustomerRecommendation = {
  customer: Customer;
  recommendations: Recommendation[];
};

export function AIRecommendations() {
  const [rows, setRows] = useState<CustomerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const customers = await fetchCustomers();
        const sampleCustomers = customers.slice(0, 6);

        const recommendationRows = await Promise.all(
          sampleCustomers.map(async (customer) => {
            try {
              const recommendations = await fetchRecommendations(customer.id);
              return { customer, recommendations };
            } catch {
              return { customer, recommendations: [] };
            }
          })
        );

        if (!mounted) {
          return;
        }

        setRows(recommendationRows.filter((row) => row.recommendations.length > 0));
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Khong the tai goi y AI.");
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

  const recommendationCount = useMemo(
    () => rows.reduce((sum, row) => sum + row.recommendations.length, 0),
    [rows]
  );

  const customerCount = rows.length;

  const avgPrice = useMemo(() => {
    const prices = rows.flatMap((row) => row.recommendations.map((r) => toNumber(r.price)).filter((p) => p > 0));
    if (prices.length === 0) {
      return 0;
    }
    return Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  }, [rows]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">Goi y AI</h2>
        <p className="text-gray-600 mt-1">AI Recommendations Service - Port 8008</p>
      </div>

      {loading && <p className="text-sm text-gray-500 mb-4">Dang tai du lieu goi y...</p>}
      {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tong goi y</p>
                <p className="text-2xl font-semibold text-gray-900">{recommendationCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Khach hang co goi y</p>
                <p className="text-2xl font-semibold text-gray-900">{customerCount}</p>
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
                <p className="text-sm text-gray-600">Muc gia trung binh</p>
                <p className="text-2xl font-semibold text-gray-900">{avgPrice.toLocaleString("vi-VN")} ₫</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Books duoc de xuat</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {rows.flatMap((row) => row.recommendations).filter((r) => Boolean(r.title)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goi y ca nhan hoa theo khach hang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {rows.length === 0 && !loading && (
              <div className="text-sm text-gray-600">Chua co du lieu goi y AI de hien thi.</div>
            )}

            {rows.map((row) => (
              <div key={row.customer.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-purple-600">{row.customer.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{row.customer.name}</h4>
                    <p className="text-sm text-gray-600">Customer ID: {row.customer.id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {row.recommendations.map((product) => (
                    <div
                      key={`${row.customer.id}-${product.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{product.title || `Book #${product.id}`}</h5>
                          <Badge variant="outline">Sach</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{product.author || "Unknown author"}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Stock: {product.stock ?? "N/A"}</span>
                          <span>Rating: {product.avg_rating ?? "N/A"}</span>
                          <span>Price: {toNumber(product.price).toLocaleString("vi-VN")} ₫</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
