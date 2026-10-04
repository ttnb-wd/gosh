"use client";
import { useAuth } from "@/components/auth/AuthProvider";

export const useAdminAuth = () => {
  const { user, sessionUser, status } = useAuth();
  return { user, loading: status === "loading", isAdmin: status === "authenticated" && sessionUser?.role === "admin" };
};

// The protected layout authorizes on the server; client context is presentation only.
export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
