const SERVICE_BASE_URLS = {
  gateway: (import.meta as any).env?.VITE_GATEWAY_URL || "http://localhost:8000",
  books: (import.meta as any).env?.VITE_BOOKS_URL || "http://localhost:8002",
  carts: (import.meta as any).env?.VITE_CARTS_URL || "http://localhost:8003",
  orders: (import.meta as any).env?.VITE_ORDERS_URL || "http://localhost:8004",
  payments: (import.meta as any).env?.VITE_PAYMENTS_URL || "http://localhost:8005",
  shipments: (import.meta as any).env?.VITE_SHIPMENTS_URL || "http://localhost:8006",
  recommendations: (import.meta as any).env?.VITE_RECOMMENDER_URL || "http://localhost:8008",
  clothes: (import.meta as any).env?.VITE_CLOTHES_URL || "http://localhost:8009",
  customers: (import.meta as any).env?.VITE_CUSTOMERS_URL || "http://localhost:8001",
};

type FetchOptions = RequestInit & { skipJson?: boolean };

async function request<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }

  if (options?.skipJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type Book = {
  id: number;
  title: string;
  author: string;
  price: number | string;
  stock: number;
  image_url?: string;
};

export type Cloth = {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  size: string;
  color?: string;
  material?: string;
  price: number | string;
  stock: number;
  image_url?: string;
  description?: string;
  is_active?: boolean;
};

export type Customer = {
  id: number;
  name: string;
  email: string;
};

export type Order = {
  id: number;
  customer_id: number;
  status: string;
  saga_state?: string;
  fail_reason?: string;
  book_ids?: number[];
};

export type Payment = {
  id: number;
  order_id: number;
  status: string;
};

export type Shipment = {
  id: number;
  order_id: number;
  status: string;
};

export type Cart = {
  id: number;
  customer_id: number;
};

export type CartItem = {
  id: number;
  cart: number;
  book_id: number;
  quantity: number;
};

export type Recommendation = {
  id: number;
  title?: string;
  author?: string;
  stock?: number;
  avg_rating?: number;
  image_url?: string;
  price?: number | string;
};

export function toNumber(value: number | string | undefined | null): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getServiceBaseUrls() {
  return SERVICE_BASE_URLS;
}

export function fetchBooks() {
  return request<Book[]>(`${SERVICE_BASE_URLS.books}/books/`);
}

export function fetchClothes() {
  return request<Cloth[]>(`${SERVICE_BASE_URLS.clothes}/clothes/`);
}

export function fetchCustomers() {
  return request<Customer[]>(`${SERVICE_BASE_URLS.customers}/customers/`);
}

export function fetchOrders() {
  return request<Order[]>(`${SERVICE_BASE_URLS.orders}/orders/`);
}

export function fetchPayments() {
  return request<Payment[]>(`${SERVICE_BASE_URLS.payments}/payments/`);
}

export function fetchShipments() {
  return request<Shipment[]>(`${SERVICE_BASE_URLS.shipments}/shipments/`);
}

export function fetchCarts() {
  return request<Cart[]>(`${SERVICE_BASE_URLS.carts}/carts/`);
}

export function fetchCartItems(cartId: number) {
  return request<CartItem[]>(`${SERVICE_BASE_URLS.carts}/carts/${cartId}/items/`);
}

export function fetchRecommendations(customerId: number) {
  return request<Recommendation[]>(`${SERVICE_BASE_URLS.recommendations}/recommendations/${customerId}/`);
}

export async function probeService(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

// ---- Single-item fetches ----

export function fetchBook(id: number) {
  return request<Book>(`${SERVICE_BASE_URLS.books}/books/${id}/`);
}

export function fetchCloth(id: number) {
  return request<Cloth>(`${SERVICE_BASE_URLS.clothes}/clothes/${id}/`);
}

// ---- Ratings ----

export type Rating = {
  id: number;
  customer_id: number;
  book_id: number;
  rating: number;
  comment: string;
};

export function fetchRatings() {
  return request<Rating[]>(`http://localhost:8007/ratings/`);
}

export function createRating(data: { customer_id: number; book_id: number; rating: number; comment: string }) {
  return request<Rating>(`http://localhost:8007/ratings/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Book CRUD (staff) ----

export function createBook(data: Partial<Book>) {
  return request<Book>(`${SERVICE_BASE_URLS.books}/books/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBook(id: number, data: Partial<Book>) {
  return request<Book>(`${SERVICE_BASE_URLS.books}/books/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteBook(id: number) {
  return request<void>(`${SERVICE_BASE_URLS.books}/books/${id}/`, {
    method: "DELETE",
    skipJson: true,
  });
}

// ---- Cloth CRUD (staff) ----

export function createCloth(data: Partial<Cloth>) {
  return request<Cloth>(`${SERVICE_BASE_URLS.clothes}/clothes/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCloth(id: number, data: Partial<Cloth>) {
  return request<Cloth>(`${SERVICE_BASE_URLS.clothes}/clothes/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCloth(id: number) {
  return request<void>(`${SERVICE_BASE_URLS.clothes}/clothes/${id}/`, {
    method: "DELETE",
    skipJson: true,
  });
}

// ---- Cart actions (customer) ----

export function createCartItem(data: { cart: number; book_id: number; quantity: number }) {
  return request<CartItem>(`${SERVICE_BASE_URLS.carts}/cart-items/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function ensureCart(customerId: number) {
  return request<Cart>(`${SERVICE_BASE_URLS.carts}/carts/by-customer/${customerId}/`, {
    method: "POST",
  });
}

export function deleteCartItem(itemId: number) {
  return request<void>(`${SERVICE_BASE_URLS.carts}/cart-items/${itemId}/`, {
    method: "DELETE",
    skipJson: true,
  });
}

export function updateCartItem(itemId: number, quantity: number) {
  return request<CartItem>(`${SERVICE_BASE_URLS.carts}/cart-items/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function createOrder(data: { customer_id: number; book_ids: number[]; payment_status?: string; shipment_status?: string }) {
  return request<Order>(`${SERVICE_BASE_URLS.orders}/orders/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
