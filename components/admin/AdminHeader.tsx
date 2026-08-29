"use client";

import { Bell, User, LogOut, ShoppingBag, XCircle, MessageSquare, Moon, Sun } from "lucide-react";
import { useAdminAuth } from "./AdminAuthProvider";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { signOutUser } from "@/lib/firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

interface AdminNotification {
  id: string;
  source: "order" | "contact";
  order_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const notiRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const toNotification = (raw: Record<string, unknown>, source: "order" | "contact", type: string, title: string, message: string, isRead: boolean): AdminNotification => {
    const created = raw.created_at;
    let createdStr = "";
    if (typeof created === "string") createdStr = created;
    else if (created instanceof Date) createdStr = created.toISOString();
    else if (typeof created === "object" && created && "toDate" in created && typeof (created as { toDate: () => Date }).toDate === "function") createdStr = (created as { toDate: () => Date }).toDate().toISOString();

    return {
      id: typeof raw.id === "string" ? raw.id : String(source),
      source,
      order_id: source === "order" && typeof raw.id === "string" ? raw.id : null,
      type,
      title,
      message,
      is_read: isRead,
      created_at: createdStr,
    };
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const [ordersSnap, messagesSnap] = await Promise.all([
        getDocs(query(collection(db, "orders"), orderBy("created_at", "desc"), limit(10))),
        getDocs(query(collection(db, "messages"), orderBy("created_at", "desc"), limit(10))),
      ]);

      const orderNots: AdminNotification[] = ordersSnap.docs.map((d) => {
        const data = d.data();
        return toNotification(
          { ...data, id: d.id },
          "order",
          "new_order",
          "New Order",
          `${typeof data.customer_name === "string" ? data.customer_name : "Customer"} placed order ${typeof data.order_number === "string" ? data.order_number : d.id}`,
          false
        );
      });

      const msgNots: AdminNotification[] = messagesSnap.docs.map((d) => {
        const data = d.data();
        return toNotification(
          { ...data, id: d.id },
          "contact",
          "contact_message",
          "New Contact Message",
          `${typeof data.full_name === "string" ? data.full_name : ""}: ${typeof data.subject === "string" ? data.subject : ""}`,
          (data.status as string) !== "unread"
        );
      });

      const all = [...orderNots, ...msgNots].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(all.slice(0, 12));
    } catch (error) {
      console.error("Notification fetch error:", error);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;

    fetchNotifications();
  }, [user, authLoading, isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setNotiOpen(false);
      }
    };

    if (notiOpen) {
      // Refresh notifications when dropdown opens
      fetchNotifications();
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notiOpen]);

  const markNotificationRead = async (notification: AdminNotification) => {
    if (!user) return;

    try {
      if (notification.source === "contact") {
        await updateDoc(doc(db, "messages", notification.id), { status: "read" });
      }
      // Orders do not have an is_read field in Firestore; keep local state only.

      setNotifications((prev) =>
        prev.map((item) =>
          item.source === notification.source && item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (error) {
      console.error("Mark read error:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;

    try {
      const batch = writeBatch(db);

      notifications.forEach((item) => {
        if (item.source === "contact" && !item.is_read) {
          batch.update(doc(db, "messages", item.id), { status: "read" });
        }
      });

      await batch.commit();

      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (error) {
      console.error("Mark all read error:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "contact_message":
        return <MessageSquare className="h-4 w-4" />;
      case "new_order":
        return <ShoppingBag className="h-4 w-4" />;
      case "order_cancelled":
        return <XCircle className="h-4 w-4" />;
      case "payment_uploaded":
      case "payment_verifying":
      case "order_status_changed":
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Sign out of Firebase client-side auth.
      await signOutUser();

      // Clear the server-side Firebase session cookie.
      try {
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "include",
        });
      } catch (sessionError) {
        console.error("Session cookie cleanup error:", sessionError);
      }

      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header role="banner" className="sticky top-0 z-30 border-b border-[#d4af37]/20 bg-white/90 backdrop-blur">
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1 pl-14 lg:pl-0">
          <h1 className="break-words text-2xl font-black leading-[0.98] text-[#1f1a14] sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-xs font-medium leading-5 text-[#7a6a55] sm:mt-2 sm:text-base sm:leading-6">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37]/25 bg-white/80 text-[#8a6a18] shadow-sm transition-all duration-200 hover:border-[#d4af37]/50 hover:bg-[#fff8df] dark:border-[#d4af37]/25 dark:bg-[#0d0b07] dark:text-[#d4af37] dark:hover:bg-[#151207] sm:h-10 sm:w-10"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notiRef}>
            <button
              type="button"
              onClick={() => setNotiOpen((prev) => !prev)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37]/25 bg-white text-[#1f1a14] shadow-sm transition duration-300 hover:scale-105 hover:bg-[#fff7e6] sm:h-11 sm:w-11"
              aria-label="Admin notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-[#d4af37] px-1 text-[10px] font-black text-[#1f1a14] shadow">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="fixed left-3 right-3 top-20 z-[9999] max-h-[calc(100vh-96px)] origin-top overflow-hidden rounded-[24px] border border-[#d4af37]/25 bg-[#fffaf0]/95 shadow-[0_24px_70px_rgba(31,26,20,0.16),0_0_30px_rgba(212,175,55,0.12)] backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[92vw] sm:max-w-[380px] sm:origin-top-right"
                >
                  <div className="flex items-center justify-between border-b border-[#d4af37]/20 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6f1d1b]">
                        Notifications
                      </p>
                      <h3 className="text-base font-black text-[#1f1a14]">Admin Alerts</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-black text-[#6f1d1b] hover:text-[#1f1a14]"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-2 sm:max-h-[360px]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm font-bold text-[#7a6a55]">No notifications yet.</p>
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <motion.button
                          key={`${notification.source}-${notification.id}`}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: index * 0.035,
                            ease: "easeOut",
                          }}
                          type="button"
                          onClick={async () => {
                            await markNotificationRead(notification);
                            setNotiOpen(false);
                            
                            if (notification.source === "contact") {
                              router.push("/admin/messages");
                            } else if (notification.order_id) {
                              router.push(`/admin/orders?orderId=${notification.order_id}`);
                            } else {
                              router.push("/admin/orders");
                            }
                          }}
                          className={`mb-2 w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                            notification.is_read
                              ? "border-[#d4af37]/15 bg-white"
                              : "border-[#6f1d1b]/20 bg-[#f8eeee]"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7e6] text-[#d4af37]">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-[#1f1a14]">{notification.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs font-medium text-[#7a6a55]">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-[11px] font-bold text-[#7a6a55]/70">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-[#d4af37]/20 bg-white p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/admin/orders");
                          setNotiOpen(false);
                        }}
                        className="rounded-full bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-4 py-3 text-sm font-black text-[#1f1a14] transition hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)]"
                      >
                        Orders
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/admin/messages");
                          setNotiOpen(false);
                        }}
                        className="rounded-full border border-[#d4af37]/25 bg-white px-4 py-3 text-sm font-black text-[#1f1a14] transition hover:bg-[#fff7e6]"
                      >
                        Messages
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-white px-2.5 py-2 text-sm font-medium text-[#7a6a55] transition hover:border-[#d4af37] hover:bg-[#fff7e6] hover:text-[#1f1a14] sm:px-3"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.email?.split("@")[0] || "Admin"}</span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#d4af37]/20 bg-white shadow-xl">
                  <div className="border-b border-[#d4af37]/15 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7a6a55]">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#1f1a14]">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
