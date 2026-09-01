"use client";
import devLog from "@/lib/dev-log";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getUserProfile } from "@/lib/firebase/users";

interface AdminAuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AdminAuthContext =
  createContext<AdminAuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
  });

export const useAdminAuth = () =>
  useContext(AdminAuthContext);

export default function AdminAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!mounted) return;

        if (!currentUser) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        try {
          const profile = await getUserProfile(
            currentUser.uid
          );

          if (!mounted) return;

          const admin =
            profile?.role === "admin";

          setIsAdmin(admin);

          if (!admin) {
            devLog.warn(
              "Authenticated Firebase user is not an admin."
            );
          }
        } catch (error) {
          devLog.error(
            "Failed to load Firebase admin profile:",
            error
          );

          if (!mounted) return;

          setIsAdmin(false);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}