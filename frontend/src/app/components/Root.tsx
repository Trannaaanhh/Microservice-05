import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  ShoppingCart,
  Package,
  CreditCard,
  Truck,
  Users,
  Sparkles,
  LogOut,
  User,
  Briefcase,
} from "lucide-react";
import { cn } from "./ui/utils";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { Login } from "./Login";

const allNavigation = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["staff", "customer"] },
  { name: "Sách", path: "/books", icon: BookOpen, roles: ["staff", "customer"] },
  { name: "Thời trang", path: "/fashion", icon: ShoppingBag, roles: ["staff", "customer"] },
  { name: "Giỏ hàng", path: "/cart", icon: ShoppingCart, roles: ["customer"], showBadge: true },
  { name: "Đơn hàng", path: "/orders", icon: Package, roles: ["staff", "customer"] },
  { name: "Thanh toán", path: "/payment", icon: CreditCard, roles: ["staff"] },
  { name: "Vận chuyển", path: "/shipping", icon: Truck, roles: ["staff"] },
  { name: "Khách hàng", path: "/customers", icon: Users, roles: ["staff"] },
  { name: "Gợi ý AI", path: "/ai-recommendations", icon: Sparkles, roles: ["staff", "customer"] },
];

export function Root() {
  const location = useLocation();
  const { user, logout, isStaff } = useAuth();
  const { cartCount } = useCart();

  if (!user) {
    return <Login />;
  }

  const navigation = allNavigation.filter((item) =>
    item.roles.includes(user.role ?? "")
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="font-semibold text-xl text-gray-900">
            Microservices Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">API Gateway: :8000</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              const showBadge = (item as { showBadge?: boolean }).showBadge && cartCount > 0;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {showBadge && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
              isStaff ? "bg-purple-500" : "bg-blue-500"
            )}>
              {isStaff ? <Briefcase className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
              <p className="text-xs text-gray-500">{user.role === "staff" ? "Nhân viên" : "Khách hàng"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
