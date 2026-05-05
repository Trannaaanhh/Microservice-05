import { useEffect, useMemo, useState } from "react";
import { Package, Sparkles, TrendingUp, Users } from "lucide-react";

import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Customer,
  Recommendation,
  RecommendationResponse,
  fetchCustomers,
  fetchRecommendations,
  rebuildRecommendationModel,
  toNumber,
} from "../api";

type CustomerRecommendation = {
  customer: Customer;
  recommendations: Recommendation[];
};

function normalizeRecommendations(payload: RecommendationResponse): Recommendation[] {
  if (payload.recommended_book_details.length > 0) {
    return payload.recommended_book_details;
  }

  return payload.recommended_books.map((bookId) => ({ id: bookId }));
}

function formatPrice(value: number | string | undefined | null) {
  return `${toNumber(value).toLocaleString("vi-VN")} ₫`;
}

function getCustomerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "#";
}

function getPredictedScoreStyles(score?: number) {
  if (typeof score !== "number") {
    return "bg-gray-100 text-gray-600";
  }

  if (score >= 0.8) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (score >= 0.6) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

export function AIRecommendations() {
  const [rows, setRows] = useState<CustomerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rebuilding, setRebuilding] = useState(false);
  const [modelMessage, setModelMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const recommendationRows = await loadRecommendationRows();
        if (mounted) {
          setRows(recommendationRows);
        }
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
    const prices = rows.flatMap((row) => row.recommendations.map((product) => toNumber(product.price)).filter((price) => price > 0));
    if (prices.length === 0) {
      return 0;
    }
    return Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  }, [rows]);

  const totalBooks = useMemo(
    () => rows.flatMap((row) => row.recommendations).filter((product) => Boolean(product.title)).length,
    [rows]
  );

  const averagePredictedScore = useMemo(() => {
    const scores = rows.flatMap((row) =>
      row.recommendations.map((product) => product.predicted_score).filter((score): score is number => typeof score === "number")
    );

    if (scores.length === 0) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [rows]);

  async function loadRecommendationRows() {
    const customers = await fetchCustomers();
    const sampleCustomers = customers.slice(0, 6);

    const recommendationRows = await Promise.all(
      sampleCustomers.map(async (customer) => {
        try {
          const response = await fetchRecommendations(customer.id);
          return { customer, recommendations: normalizeRecommendations(response) };
        } catch {
          return null;
        }
      })
    );

    return recommendationRows.filter(
      (row): row is CustomerRecommendation => Boolean(row) && row.recommendations.length > 0
    );
  }

  async function refreshRecommendations() {
    setLoading(true);
    setError("");

    try {
      const recommendationRows = await loadRecommendationRows();
      setRows(recommendationRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the tai goi y AI.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRebuildModel() {
    setRebuilding(true);
    setModelMessage("");

    try {
      const response = await rebuildRecommendationModel();
      setModelMessage(response.message);
      await refreshRecommendations();
    } catch (err) {
      setModelMessage(err instanceof Error ? err.message : "Khong the train lai model.");
    } finally {
      setRebuilding(false);
    }
  }

  const stats = [
    {
      label: "Tong goi y",
      value: recommendationCount,
      icon: Sparkles,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Khach hang co goi y",
      value: customerCount,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Muc gia trung binh",
      value: formatPrice(avgPrice),
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Books duoc de xuat",
      value: totalBooks,
      icon: Package,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Diem du doan TB",
      value: averagePredictedScore.toFixed(3),
      icon: TrendingUp,
      color: "bg-slate-100 text-slate-700",
    },
  ] as const;

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Goi y AI</h2>
          <p className="text-gray-600 mt-1">Hien thi danh sach goi y theo tung khach hang tu recommender service.</p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
            AI Recommendations Service - Port 8008
          </div>
          <button
            type="button"
            onClick={handleRebuildModel}
            disabled={rebuilding || loading}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rebuilding ? "Dang train lai..." : "Train / Rebuild model"}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 mb-4">Dang tai du lieu goi y...</p>}
      {!loading && error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!loading && modelMessage && <p className="text-sm text-slate-600 mb-4">{modelMessage}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                    <span className="text-lg font-semibold text-purple-600">{getCustomerInitial(row.customer.name)}</span>
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
                          <span>Price: {formatPrice(product.price)}</span>
                        </div>
                        <div className="mt-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPredictedScoreStyles(
                              product.predicted_score
                            )}`}
                          >
                            Predicted score: {typeof product.predicted_score === "number" ? product.predicted_score.toFixed(4) : "N/A"}
                          </span>
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
