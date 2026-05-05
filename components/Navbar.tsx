"use client";

import { useState, useEffect } from "react";
import { Menu, X, ShoppingBag, LogIn, CircleUserRound, LogOut } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  onCartOpen: () => void;
  cartCount: number;
  enableDropAnimation?: boolean;
}

export default function Navbar({ onCartOpen, cartCount, enableDropAnimation = false }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [profileName, setProfileName] = useState("");

  const loadUserProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfileName("");
      return;
    }

    let profile: { full_name?: string | null; email?: string | null } | null = null;

    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", currentUser.id)
        .maybeSingle();

      profile = data;
    } catch {
      profile = null;
    }

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
    setProfileName("");
    setShowAccountMenu(false);
  };
  
  return (
    <>
    <header role="banner" className="fixed inset-x-0 top-0 z-[1000] border-b border-zinc-200 bg-white/90 backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/90">
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
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-3">
          <div className="gosh-logo-drop-bounce group/logo relative flex h-16 w-16 shrink-0 items-center justify-center overflow-visible rounded-full transition-all duration-500 hover:-translate-y-0.5 hover:scale-105 sm:h-20 sm:w-20" style={{ perspective: "900px" }}>
            <img
              src="/images/gosh-circle-logo.png"
              alt="GOSH Perfume Studio"
              className="gosh-logo-3d relative h-full w-full object-contain object-center transition-transform duration-700"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-black tracking-wide text-black dark:text-white sm:text-lg">
              GOSH PERFUME
            </h1>
            <p className="truncate text-[9px] uppercase tracking-[0.2em] text-yellow-500 dark:text-yellow-400 sm:text-[11px] sm:tracking-[0.3em]">
              Luxury Perfume
            </p>
          </div>
        </Link>

        <nav role="navigation" aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
          >
            Home
          </Link>
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
          >
            Products
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Premium Auth Button */}
          {!user ? (
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-[0_16px_35px_rgba(234,179,8,0.26)] dark:border-yellow-500/40 dark:bg-zinc-800/90 dark:text-yellow-400 dark:shadow-[0_10px_28px_rgba(234,179,8,0.2)] dark:hover:bg-zinc-700/90 dark:hover:text-yellow-300"
            >
              <LogIn className="h-4 w-4 text-yellow-600 transition-transform duration-300 group-hover:scale-110 dark:text-yellow-400" />
              <span className="hidden sm:inline">Login / Sign Up</span>
              <span className="sm:hidden">Login</span>
            </Link>
          ) : (
            <div className="relative" data-account-menu>
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 dark:border-yellow-500/40 dark:bg-zinc-800/90 dark:text-yellow-400 dark:shadow-[0_10px_28px_rgba(234,179,8,0.2)] dark:hover:bg-zinc-700/90 dark:hover:text-yellow-300"
              >
                <CircleUserRound className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {profileName || "Account"}
                </span>
              </button>
              
              {showAccountMenu && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 overflow-hidden rounded-2xl border border-yellow-200 bg-white/95 p-3 shadow-[0_20px_55px_rgba(0,0,0,0.18),0_0_30px_rgba(234,179,8,0.18)] backdrop-blur dark:border-yellow-500/30 dark:bg-zinc-800/95 dark:shadow-[0_20px_55px_rgba(0,0,0,0.4),0_0_30px_rgba(234,179,8,0.25)]">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                      {profileName || "Account"}
                    </p>
                    <p className="truncate text-xs font-semibold text-neutral-500 dark:text-zinc-400">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/orders"
                    onClick={() => setShowAccountMenu(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-bold text-neutral-800 transition hover:bg-yellow-50 hover:text-yellow-700 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-yellow-400"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <LogOut className="h-4 w-4" />
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
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition-all duration-300 hover:scale-110 hover:border-yellow-400/50 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-400/20 dark:border-yellow-500/30 dark:bg-zinc-800 dark:text-yellow-400 dark:hover:bg-zinc-700/80 dark:hover:shadow-yellow-400/30"
            aria-label="Open shopping bag"
            title="Open shopping bag"
          >
            <div className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition-all duration-300 group-hover:bg-yellow-400/5 dark:group-hover:bg-yellow-400/10" />
            <ShoppingBag className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-yellow-600 dark:group-hover:text-yellow-300" />
            <div className="absolute -inset-1 rounded-2xl bg-yellow-400/20 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-100" />
            
            {/* Cart Item Count Badge */}
            {cartCount > 0 && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black shadow-sm dark:bg-yellow-500 dark:text-black">
                {cartCount}
              </div>
            )}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <ThemeToggle />
          
          <button
            type="button"
            onClick={onCartOpen}
            className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/40 bg-white text-yellow-600 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95 dark:border-yellow-500/40 dark:bg-zinc-800 dark:text-yellow-400 dark:shadow-[0_10px_28px_rgba(234,179,8,0.2)]"
            aria-label="Open shopping bag"
            title="Open shopping bag"
          >
            <span className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition group-hover:bg-yellow-400/5 dark:group-hover:bg-yellow-400/10" />
            <ShoppingBag className="relative h-[18px] w-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-black text-black shadow-sm dark:bg-yellow-500">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition active:scale-95 dark:border-yellow-500/30 dark:bg-zinc-800 dark:text-yellow-400"
            aria-label="Open navigation menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 md:hidden dark:border-zinc-700 dark:bg-zinc-900">
          <nav role="navigation" aria-label="Mobile navigation" className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/products"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
              onClick={() => setOpen(false)}
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
              onClick={() => setOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-400"
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>

            {/* Mobile Auth Section */}
            <div className="mt-2 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {!user ? (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="group flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-3 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:bg-yellow-50 hover:text-yellow-700 dark:border-yellow-500/40 dark:bg-zinc-800/90 dark:text-yellow-400 dark:shadow-[0_10px_28px_rgba(234,179,8,0.2)] dark:hover:bg-zinc-700/90 dark:hover:text-yellow-300"
                >
                  <LogIn className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  Login / Sign Up
                </Link>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-yellow-200 bg-white/95 p-3 dark:border-yellow-500/30 dark:bg-zinc-800/95">
                    <div className="px-2 py-1">
                      <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                        {profileName || "Account"}
                      </p>
                      <p className="truncate text-xs font-semibold text-neutral-500 dark:text-zinc-400">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/orders"
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-2 py-2 text-sm font-bold text-neutral-800 transition hover:bg-yellow-50 hover:text-yellow-700 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-yellow-400"
                    >
                      My Orders
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Shopping Bag Button */}
            <button 
              type="button"
              onClick={() => {
                onCartOpen();
                setOpen(false);
              }}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-600 transition-all duration-300 hover:bg-yellow-100 hover:shadow-sm dark:border-yellow-500/30 dark:bg-zinc-800 dark:text-yellow-400 dark:hover:bg-zinc-700"
              aria-label="Open shopping bag"
              title="Open shopping bag"
            >
              <ShoppingBag className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              Shopping Bag
              
              {/* Mobile Cart Item Count Badge */}
              {cartCount > 0 && (
                <div className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black dark:bg-yellow-500">
                  {cartCount}
                </div>
              )}
            </button>
          </nav>
        </div>
      )}
    </header>
    <div aria-hidden="true" className="h-[89px] sm:h-[113px]" />
    </>
  );
}
