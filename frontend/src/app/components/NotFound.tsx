import { Link } from "react-router";
import { Button } from "./ui/button";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-semibold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">
          Trang bạn tìm kiếm không tồn tại
        </p>
        <Link to="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Về trang chủ
          </Button>
        </Link>
      </div>
    </div>
  );
}
