"use client";
import devLog from "@/lib/dev-log";

import { Bell, User, LogOut, ShoppingBag, XCircle, MessageSquare, Moon, Sun } from "lucide-react";
import { useAdminAuth } from "./AdminAuthProvider";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  limit,
  onSnapshot,
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
  const [orderNots, setOrderNots] = useState<AdminNotification[]>([]);
  const [msgNots, setMsgNots] = useState<AdminNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const notiRef = useRef<HTMLDivElement>(null);
  const notificationDialogRef = useRef<HTMLDialogElement>(null);
  const markingRef = useRef<Set<string>>(new Set());

  const notifications = useMemo<AdminNotification[]>(() => {
    const all = [...orderNots, ...msgNots].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return all.slice(0, 12);
  }, [orderNots, msgNots]);

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

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;

    let disposed = false;
    let pendingSubscriptions = 2;
    const ordersQ = query(
      collection(db, "orders"),
      orderBy("created_at", "desc"),
      limit(10)
    );
    const messagesQ = query(
      collection(db, "messages"),
      orderBy("created_at", "desc"),
      limit(10)
    );

    // Called once per subscription's first emission/error so the loading flag
    // clears only after both listeners have reported in.
    const markSubscribed = () => {
      pendingSubscriptions -= 1;
      if (pendingSubscriptions <= 0) setLoadingNotifications(false);
    };

    const unsubscribeOrders = onSnapshot(
      ordersQ,
      (snap) => {
        if (disposed) return;
        const next: AdminNotification[] = snap.docs.map((d) => {
          const data = d.data();
          return toNotification(
            { ...data, id: d.id },
            "order",
            "new_order",
            "New Order",
            `${typeof data.customer_name === "string" ? data.customer_name : "Customer"} placed order ${typeof data.order_number === "string" ? data.order_number : d.id}`,
            data.is_read === true
          );
        });
        setOrderNots(next);
        markSubscribed();
      },
      (error) => {
        if (disposed) return;
        devLog.error("Order notification listen error:", error);
        markSubscribed();
      }
    );

    const unsubscribeMessages = onSnapshot(
      messagesQ,
      (snap) => {
        if (disposed) return;
        const next: AdminNotification[] = snap.docs.map((d) => {
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
        setMsgNots(next);
        markSubscribed();
      },
      (error) => {
        if (disposed) return;
        devLog.error("Message notification listen error:", error);
        markSubscribed();
      }
    );

    return () => {
      disposed = true;
      unsubscribeOrders();
      unsubscribeMessages();
    };
  }, [user, authLoading, isAdmin]);

  useEffect(() => {
    const dialog = notificationDialogRef.current;
    const trigger = notiRef.current?.querySelector("button");
    if (!notiOpen || !dialog) return;

    const positionDialog = () => {
      const bounds = trigger?.getBoundingClientRect();
      if (!bounds) return;
      dialog.style.setProperty("--notification-top", `${Math.max(12, Math.min(bounds.bottom + 12, window.innerHeight - 96))}px`);
      dialog.style.setProperty("--notification-right", `${Math.max(12, window.innerWidth - bounds.right)}px`);
    };
    positionDialog();
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("resize", positionDialog);

    return () => {
      window.removeEventListener("resize", positionDialog);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [notiOpen]);

  const markNotificationRead = async (notification: AdminNotification) => {
    if (!user || !isAdmin) return;
    if (notification.is_read) return;

    const key = `${notification.source}-${notification.id}`;
    if (markingRef.current.has(key)) return;
    markingRef.current.add(key);

    try {
      if (notification.source === "contact") {
        await updateDoc(doc(db, "messages", notification.id), { status: "read" });
      } else {
        await updateDoc(doc(db, "orders", notification.id), { is_read: true });
      }

      // Optimistically reflect the read state locally; the realtime listener
      // also confirms the change from Firestore.
      if (notification.source === "contact") {
        setMsgNots((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      } else {
        setOrderNots((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      }
    } catch (error) {
      devLog.error("Mark read error:", error);
    } finally {
      markingRef.current.delete(key);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user || !isAdmin) return;

    const unreadItems = notifications.filter((item) => !item.is_read);
    if (unreadItems.length === 0) return;

    try {
      const batch = writeBatch(db);

      unreadItems.forEach((item) => {
        if (item.source === "contact") {
          batch.update(doc(db, "messages", item.id), { status: "read" });
        } else {
          batch.update(doc(db, "orders", item.id), { is_read: true });
        }
      });

      await batch.commit();

      setOrderNots((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setMsgNots((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (error) {
      devLog.error("Mark all read error:", error);
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

      router.push("/admin/login");
      router.refresh();
    } catch {
      devLog.warn("Could not finish signing out.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header role="banner" className="studio-admin-header sticky top-0 z-30 border-b border-line bg-surface/90 ">
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1 pl-14 lg:pl-0">
          <h1 className="break-words text-2xl font-semibold leading-[0.98] text-ink sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-xs font-medium leading-5 text-muted sm:mt-2 sm:text-base sm:leading-6">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-studio-tooltip={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80 text-accent shadow-soft transition-all duration-200 hover:border-line hover:bg-surface     sm:h-10 sm:w-10"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notiRef} onKeyDown={event => { if (event.key === "Escape") { setNotiOpen(false); notiRef.current?.querySelector('button')?.focus(); } }}>
            <button
              type="button"
              onClick={() => setNotiOpen((prev) => !prev)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-soft transition duration-300 hover:scale-105 hover:bg-surface sm:h-11 sm:w-11"
              aria-label="Admin notifications"
              aria-haspopup="dialog"
              aria-expanded={notiOpen}
              aria-controls="studio-admin-notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-on-brand shadow">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notiOpen && (
                <dialog
                  ref={notificationDialogRef}
                  id="studio-admin-notifications"
                  aria-label="Admin notifications"
                  onCancel={event => { event.preventDefault(); setNotiOpen(false); }}
                  onClose={() => setNotiOpen(false)}
                  onClick={event => {
                    if (event.target !== event.currentTarget) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
                      setNotiOpen(false);
                    }
                  }}
                  className="studio-admin-notifications origin-top overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-panel sm:origin-top-right"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                        Notifications
                      </p>
                      <h3 className="text-base font-semibold text-ink">Admin Alerts</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-semibold text-brand hover:text-ink"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="min-h-0 max-h-[calc(100dvh-250px)] overflow-y-auto overscroll-contain p-2 sm:max-h-[360px]">
                    {loadingNotifications ? <div role="status" className="flex items-center gap-3 p-6 text-sm text-muted"><span className="studio-spinner" aria-hidden="true" />Loading notifications…</div> : notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm font-bold text-muted">No notifications yet.</p>
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
                          className={`mb-2 w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
                            notification.is_read
                              ? "border-line bg-surface"
                              : "border-brand/20 bg-brand-soft"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-ink">{notification.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs font-medium text-muted">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-[11px] font-bold text-muted/70">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>

                  <div className="shrink-0 border-t border-line bg-surface p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/admin/orders");
                          setNotiOpen(false);
                        }}
                        className="rounded-full bg-brand px-4 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand"
                      >
                        Orders
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/admin/messages");
                          setNotiOpen(false);
                        }}
                        className="rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
                      >
                        Messages
                      </button>
                    </div>
                  </div>
                </dialog>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile */}
          <div className="relative" onKeyDown={event => { if (event.key === "Escape") { setShowUserMenu(false); event.currentTarget.querySelector('button')?.focus(); } }}>
            <button
              type="button"
              aria-label="Admin account menu"
              aria-expanded={showUserMenu}
              aria-controls="studio-admin-account"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-2 text-sm font-medium text-muted transition hover:border-line hover:bg-surface hover:text-ink sm:px-3"
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
                <div id="studio-admin-account" className="studio-dropdown absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden">
                  <div className="border-b border-line p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive transition hover:bg-destructive-soft disabled:cursor-not-allowed disabled:opacity-50"
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
