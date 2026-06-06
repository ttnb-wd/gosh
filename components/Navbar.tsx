"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, LogIn, CircleUserRound, LogOut, LayoutDashboard, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  onCartOpen: () => void;
  cartCount: number;
  enableDropAnimation?: boolean;
}

export default function Navbar({ onCartOpen, cartCount }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [profileName, setProfileName] = useState("");
  const { theme, toggleTheme } = useTheme();

  const loadUserProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfileName("");
      setIsAdmin(false);
      return;
    }

    let profile: { full_name?: string | null; email?: string | null; role?: string | null } | null = null;

    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", currentUser.id)
        .maybeSingle();

      profile = data;
    } catch {
      profile = null;
    }

    setIsAdmin(profile?.role === "admin");

    const displayName =
      profile?.full_name ||
      currentUser.user_metadata?.full_name ||
      profile?.email?.split("@")[0] ||
      currentUser.email?.split("@")[0] ||
      "Account";

    setProfileName(displayName);
  };

  useEffect(() => {
    const supabase = createSupabaseClient();
    
    // Get initial user
    getSupabaseUser(supabase)
      .then(({ data, error }) => {
        const currentUser = error ? null : data.user;
        setUser(currentUser);
        loadUserProfile(currentUser);
      })
      .catch(() => {
        setUser(null);
        loadUserProfile(null);
      });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      loadUserProfile(currentUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showAccountMenu && !target.closest('[data-account-menu]')) {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccountMenu]);

  const handleLogout = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setProfileName("");
    setShowAccountMenu(false);
  };
  
  return (
    <>
    <header role="banner" className="fixed inset-x-0 top-0 z-[1000] bg-white/90 backdrop-blur-xl dark:border-b dark:border-[#d4af37]/20 dark:bg-[#0f0b07]/95">
      <style jsx>{`
        @keyframes navbar-drop {
          0% {
            opacity: 0;
            transform: translateY(-40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gosh-logo-drop-bounce {
          0% {
            opacity: 0;
            transform: translateY(-120px) scale(0.92);
          }
          18% {
            opacity: 1;
            transform: translateY(8px) scale(1.04, 0.96);
          }
          30% {
            transform: translateY(-44px) scale(0.98, 1.03);
          }
          43% {
            transform: translateY(5px) scale(1.025, 0.98);
          }
          54% {
            transform: translateY(-22px) scale(0.99, 1.015);
          }
          66% {
            transform: translateY(3px) scale(1.012, 0.99);
          }
          76% {
            transform: translateY(-9px) scale(0.996, 1.006);
          }
          86% {
            transform: translateY(1px) scale(1.004, 0.996);
          }
          94% {
            transform: translateY(-3px) scale(1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .gosh-logo-drop-bounce {
          animation: gosh-logo-drop-bounce 5s cubic-bezier(0.24, 0.72, 0.24, 1) both;
          transform-origin: center bottom;
          will-change: transform, opacity;
        }

        .gosh-logo-3d {
          filter: drop-shadow(0 8px 10px rgba(92, 54, 5, 0.22)) drop-shadow(0 1px 0 rgba(255, 255, 255, 0.65));
          transform: rotateX(8deg) translateZ(0);
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

      `}</style>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="group flex min-w-0 flex-1 flex-col leading-none transition hover:opacity-80 sm:flex-none">
          <span className="text-base font-black tracking-[0.12em] text-black dark:text-[#fff7e6] sm:text-lg md:text-2xl">
            GOSH PERFUME
          </span>
          <span className="mt-1 text-base font-black tracking-[0.38em] text-yellow-600 dark:text-[#d4af37] sm:text-lg md:text-2xl">
            STUDIO
          </span>
        </Link>

        <nav role="navigation" aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-700 transition hover:!text-[#b88700] dark:text-[#fff7e6]/75 dark:hover:!text-[#d4af37]"
          >
            Home
          </Link>
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 transition hover:!text-[#b88700] dark:text-[#fff7e6]/75 dark:hover:!text-[#d4af37]"
          >
            Products
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-zinc-700 transition hover:!text-[#b88700] dark:text-[#fff7e6]/75 dark:hover:!text-[#d4af37]"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-zinc-700 transition hover:!text-[#b88700] dark:text-[#fff7e6]/75 dark:hover:!text-[#d4af37]"
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition-all duration-300 hover:scale-110 hover:border-yellow-400/50 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-400/20 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37] dark:hover:bg-[#231b12]"
          >
            <div className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition-all duration-300 group-hover:bg-yellow-400/5" />
            {theme === "dark" ? (
              <Sun className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110" />
            ) : (
              <Moon className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110" />
            )}
            <div className="absolute -inset-1 rounded-2xl bg-yellow-400/20 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-100" />
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              aria-label="Admin Dashboard"
              title="Admin Dashboard"
              className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition-all duration-300 hover:scale-110 hover:border-yellow-400/50 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-400/20 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37] dark:hover:bg-[#231b12]"
            >
              <div className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition-all duration-300 group-hover:bg-yellow-400/5" />
              <LayoutDashboard className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-yellow-600" />
              <div className="absolute -inset-1 rounded-2xl bg-yellow-400/20 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-100" />
            </Link>
          )}

          {/* Premium Auth Button */}
          {!user ? (
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-[0_16px_35px_rgba(234,179,8,0.26)] dark:border-[#d4af37]/40 dark:bg-[#1c160f]/90 dark:text-[#fff7e6] dark:hover:bg-[#231b12] dark:hover:text-[#d4af37]"
            >
              <LogIn className="h-4 w-4 text-yellow-600 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Login / Sign Up</span>
              <span className="sm:hidden">Login</span>
            </Link>
          ) : (
            <div className="relative" data-account-menu>
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                aria-label="Open account menu"
                aria-expanded={showAccountMenu}
                aria-haspopup="true"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 dark:border-[#d4af37]/40 dark:bg-[#1c160f]/90 dark:text-[#fff7e6] dark:hover:bg-[#231b12] dark:hover:text-[#d4af37]"
              >
                <CircleUserRound className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {profileName || "Account"}
                </span>
              </button>
              
              {showAccountMenu && (
                <div 
                  className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 overflow-hidden rounded-2xl border border-yellow-200 bg-white/95 p-3 shadow-[0_20px_55px_rgba(0,0,0,0.18),0_0_30px_rgba(234,179,8,0.18)] backdrop-blur dark:border-[#d4af37]/30 dark:bg-[#1c160f]/95"
                  role="menu"
                  aria-label="Account menu"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-[#fff7e6]">
                      {profileName || "Account"}
                    </p>
                    <p className="truncate text-xs font-semibold text-neutral-500 dark:text-[#fff7e6]/60">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/orders"
                    onClick={() => setShowAccountMenu(false)}
                    role="menuitem"
                    className="block rounded-xl px-3 py-2 text-sm font-bold text-neutral-800 transition hover:bg-yellow-50 hover:text-yellow-700 dark:text-[#fff7e6]/80 dark:hover:bg-[#231b12] dark:hover:text-[#d4af37]"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    aria-label="Logout from account"
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Premium Animated Shopping Bag Icon with Badge */}
          <button
            type="button"
            onClick={onCartOpen}
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition-all duration-300 hover:scale-110 hover:border-yellow-400/50 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-400/20 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37] dark:hover:bg-[#231b12]"
            aria-label="Open shopping bag"
            title="Open shopping bag"
          >
            <div className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition-all duration-300 group-hover:bg-yellow-400/5" />
            <ShoppingBag className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-yellow-600" />
            <div className="absolute -inset-1 rounded-2xl bg-yellow-400/20 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-100" />
            
            {/* Cart Item Count Badge */}
            {cartCount > 0 && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black shadow-sm">
                {cartCount}
              </div>
            )}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/40 bg-white text-yellow-600 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37]"
          >
            <span className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition group-hover:bg-yellow-400/5" />
            {theme === "dark" ? (
              <Sun className="relative h-[18px] w-[18px]" />
            ) : (
              <Moon className="relative h-[18px] w-[18px]" />
            )}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              aria-label="Admin Dashboard"
              title="Admin Dashboard"
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/40 bg-white text-yellow-600 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37]"
            >
              <span className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition group-hover:bg-yellow-400/5" />
              <LayoutDashboard className="relative h-[18px] w-[18px]" />
            </Link>
          )}

          {!user ? (
            <Link
              href="/login"
              className="group relative inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-yellow-400/40 bg-white px-3 text-xs font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#fff7e6]"
            >
              <LogIn className="h-[16px] w-[16px] text-yellow-600" aria-hidden="true" />
              Login
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/40 bg-white text-yellow-600 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37]"
              aria-label="Logout from account"
              title="Logout"
            >
              <span className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition group-hover:bg-yellow-400/5" />
              <LogOut className="relative h-[18px] w-[18px]" />
            </button>
          )}

          <button
            type="button"
            onClick={onCartOpen}
            className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/40 bg-white text-yellow-600 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95 dark:border-[#d4af37]/40 dark:bg-[#1c160f] dark:text-[#d4af37]"
            aria-label="Open shopping bag"
            title="Open shopping bag"
          >
            <span className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition group-hover:bg-yellow-400/5" />
            <ShoppingBag className="relative h-[18px] w-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-black text-black shadow-sm">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </header>
    <div aria-hidden="true" className="h-[89px] bg-[#fef5e7] dark:bg-[#0f0b07] sm:h-[113px]" />
    </>
  );
}
