import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./components/Dashboard";
import { Books } from "./components/Books";
import { BookDetail } from "./components/BookDetail";
import { Fashion } from "./components/Fashion";
import { FashionDetail } from "./components/FashionDetail";
import { Cart } from "./components/Cart";
import { Orders } from "./components/Orders";
import { Payment } from "./components/Payment";
import { Shipping } from "./components/Shipping";
import { Customers } from "./components/Customers";
import { CustomerDetail } from "./components/CustomerDetail";
import { AIRecommendations } from "./components/AIRecommendations";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "books", Component: Books },
      { path: "books/:id", Component: BookDetail },
      { path: "fashion", Component: Fashion },
      { path: "fashion/:id", Component: FashionDetail },
      { path: "cart", Component: Cart },
      { path: "orders", Component: Orders },
      { path: "payment", Component: Payment },
      { path: "shipping", Component: Shipping },
      { path: "customers", Component: Customers },
      { path: "customers/:id", Component: CustomerDetail },
      { path: "ai-recommendations", Component: AIRecommendations },
      { path: "*", Component: NotFound },
    ],
  },
]);
