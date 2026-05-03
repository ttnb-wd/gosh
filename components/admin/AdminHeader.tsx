"use client";

import { Bell, User, LogOut, ShoppingBag, XCircle, MessageSquare } from "lucide-react";
import { useAdminAuth } from "./AdminAuthProvider";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";

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

interface ContactMessageNotification {
  id: string;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { user } = useAdminAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const notiRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const toContactNotification = (message: ContactMessageNotification): AdminNotification => ({
    id: message.id,
    source: "contact",
    order_id: null,
    type: "contact_message",
    title: "New Contact Message",
    message: `${message.full_name}: ${message.subject}`,
    is_read: message.status !== "unread",
    created_at: message.created_at,
  });

  const fetchNotifications = async () => {
    try {
      const supabase = createSupabaseClient();
      const [orderNotifications, contactMessages] = await Promise.all([
        supabase
          .from("admin_notifications")
          .select("*")
          .in("type", ["new_order", "order_cancelled", "payment_uploaded", "payment_verifying", "order_status_changed"])
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("contact_messages")
          .select("id, full_name, email, subject, message, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (orderNotifications.error) {
        console.error("Notification fetch error:", orderNotifications.error);
      }

      if (contactMessages.error) {
        console.error("Contact notification fetch error:", contactMessages.error);
      }

      const mappedOrderNotifications = (orderNotifications.data || []).map((item) => ({
        ...item,
        source: "order" as const,
        order_id: item.order_id || null,
      }));
      const mappedContactMessages = ((contactMessages.data || []) as ContactMessageNotification[]).map(toContactNotification);

      const uniqueNotifications = Array.from(
        new Map(
          [...mappedOrderNotifications, ...mappedContactMessages]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((item) => [`${item.source}-${item.id}`, item])
        ).values()
      ).slice(0, 12);

      setNotifications(uniqueNotifications);
    } catch (error) {
      console.error("Notification fetch error:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          console.log("Realtime notification received:", payload.new);
          
          // Prevent duplicate notifications
          setNotifications((prev) => {
            const next = {
              ...(payload.new as Omit<AdminNotification, "source">),
              source: "order" as const,
              order_id: (payload.new as { order_id?: string | null }).order_id || null,
            };
            
            // Check if notification already exists
            if (prev.some((item) => item.source === next.source && item.id === next.id)) {
              console.log("Duplicate notification prevented:", next.id);
              return prev;
            }
            
            return [next, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contact_messages",
        },
        (payload) => {
          console.log("Realtime contact notification received:", payload.new);

          setNotifications((prev) => {
            const next = toContactNotification(payload.new as ContactMessageNotification);

            if (prev.some((item) => item.source === next.source && item.id === next.id)) {
              return prev;
            }

            return [next, ...prev];
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    try {
      const supabase = createSupabaseClient();

      if (notification.source === "contact") {
        await supabase.from("contact_messages").update({ status: "read" }).eq("id", notification.id);
      } else {
        await supabase.from("admin_notifications").update({ is_read: true }).eq("id", notification.id);
      }

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
    try {
      const supabase = createSupabaseClient();
      await Promise.all([
        supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false),
        supabase.from("contact_messages").update({ status: "read" }).eq("status", "unread"),
      ]);

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
      const supabase = createSupabaseClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="min-w-0 pl-14 lg:pl-0">
          <h1 className="break-words text-[2rem] font-black leading-[0.98] text-black sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 sm:text-base">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {/* Notifications */}
          <div className="relative" ref={notiRef}>
            <button
              type="button"
              onClick={() => setNotiOpen((prev) => !prev)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-yellow-200 bg-white text-black shadow-sm transition duration-300 hover:scale-105 hover:bg-yellow-50"
              aria-label="Admin notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-black text-black shadow">
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
                  className="fixed left-3 right-3 top-20 z-[9999] max-h-[calc(100vh-96px)] origin-top overflow-hidden rounded-[24px] border border-yellow-200 bg-[#fffdf6]/95 shadow-[0_24px_70px_rgba(0,0,0,0.18),0_0_30px_rgba(234,179,8,0.12)] backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[92vw] sm:max-w-[380px] sm:origin-top-right"
                >
                  <div className="flex items-center justify-between border-b border-yellow-100 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
                        Notifications
                      </p>
                      <h3 className="text-base font-black text-black">Admin Alerts</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-black text-yellow-700 hover:text-yellow-900"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-2 sm:max-h-[360px]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm font-bold text-zinc-500">No notifications yet.</p>
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
                              ? "border-zinc-100 bg-white"
                              : "border-yellow-200 bg-yellow-50"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-black">{notification.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs font-medium text-zinc-600">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-[11px] font-bold text-zinc-400">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-yellow-100 bg-white p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/admin/orders");
                          setNotiOpen(false);
                        }}
                        className="rounded-full bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                      >
                        Orders
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/admin/messages");
                          setNotiOpen(false);
                        }}
                        className="rounded-full border border-yellow-200 bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-50"
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
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-yellow-400 hover:bg-yellow-50"
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
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                  <div className="border-b border-zinc-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-black">
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
