import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "staff" | "customer" | null;

// Preset accounts - simple credentials
export const PRESET_ACCOUNTS = [
  { username: "admin",  password: "123", role: "staff" as const },
  { username: "staff1", password: "123", role: "staff" as const },
  { username: "user",   password: "123", role: "customer" as const, customerId: 1 },
  { username: "khach1", password: "123", role: "customer" as const, customerId: 2 },
];

interface AuthUser {
  username: string;
  role: UserRole;
  customerId?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => string | null;
  logout: () => void;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((username: string, password: string): string | null => {
    const account = PRESET_ACCOUNTS.find(
      (a) => a.username === username.trim() && a.password === password
    );
    if (!account) {
      return "Sai tên đăng nhập hoặc mật khẩu.";
    }
    const authUser: AuthUser = {
      username: account.username,
      role: account.role,
      customerId: (account as { customerId?: number }).customerId,
    };
    setUser(authUser);
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    return null;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("auth_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isStaff: user?.role === "staff",
        isCustomer: user?.role === "customer",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
