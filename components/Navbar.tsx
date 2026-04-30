"use client";

import { useState, useEffect } from "react";
import { Menu, X, ShoppingBag, LogIn, CircleUserRound, LogOut } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavbarProps {
  onCartOpen: () => void;
  cartCount: number;
}

export default function Navbar({ onCartOpen, cartCount }: NavbarProps) {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-3">
          <div className="group/logo relative flex h-16 w-16 shrink-0 items-center justify-center overflow-visible rounded-full shadow-[0_14px_34px_rgba(234,179,8,0.20)] transition-all duration-500 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_20px_48px_rgba(234,179,8,0.30)] sm:h-20 sm:w-20">
            <img
              src="/images/gosh-circle-logo.png"
              alt="GOSH Perfume Studio"
              className="relative h-full w-full object-contain object-center drop-shadow-[0_6px_14px_rgba(92,54,5,0.35)] transition-all duration-500 group-hover/logo:drop-shadow-[0_9px_20px_rgba(161,98,7,0.45)]"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-black tracking-wide text-black sm:text-lg">
              GOSH PERFUME
            </h1>
            <p className="truncate text-[9px] uppercase tracking-[0.2em] text-yellow-500 sm:text-[11px] sm:tracking-[0.3em]">
              Luxury Perfume
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
          >
            Home
          </Link>
          <Link
            href="/products"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
          >
            Products
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* Premium Auth Button */}
          {!user ? (
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-[0_16px_35px_rgba(234,179,8,0.26)]"
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
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
              >
                <CircleUserRound className="h-4 w-4 text-yellow-600" />
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {profileName || "Account"}
                </span>
              </button>
              
              {showAccountMenu && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 overflow-hidden rounded-2xl border border-yellow-200 bg-white/95 p-3 shadow-[0_20px_55px_rgba(0,0,0,0.18),0_0_30px_rgba(234,179,8,0.18)] backdrop-blur">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-bold text-neutral-900">
                      {profileName || "Account"}
                    </p>
                    <p className="truncate text-xs font-semibold text-neutral-500">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/orders"
                    onClick={() => setShowAccountMenu(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-bold text-neutral-800 transition hover:bg-yellow-50 hover:text-yellow-700"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
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
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition-all duration-300 hover:scale-110 hover:border-yellow-400/50 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-400/20"
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
            onClick={onCartOpen}
            className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/40 bg-white text-yellow-600 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 active:scale-95"
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

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition active:scale-95"
            aria-label="Open navigation menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/products"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
              onClick={() => setOpen(false)}
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
              onClick={() => setOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-zinc-700 transition hover:text-yellow-500"
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>

            {/* Mobile Auth Section */}
            <div className="mt-2 space-y-2 border-t border-zinc-200 pt-4">
              {!user ? (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="group flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-3 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:bg-yellow-50 hover:text-yellow-700"
                >
                  <LogIn className="h-4 w-4 text-yellow-600" />
                  Login / Sign Up
                </Link>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-yellow-200 bg-white/95 p-3">
                    <div className="px-2 py-1">
                      <p className="truncate text-sm font-bold text-neutral-900">
                        {profileName || "Account"}
                      </p>
                      <p className="truncate text-xs font-semibold text-neutral-500">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/orders"
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-2 py-2 text-sm font-bold text-neutral-800 transition hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      My Orders
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
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
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-600 transition-all duration-300 hover:bg-yellow-100 hover:shadow-sm"
              aria-label="Open shopping bag"
              title="Open shopping bag"
            >
              <ShoppingBag className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              Shopping Bag
              
              {/* Mobile Cart Item Count Badge */}
              {cartCount > 0 && (
                <div className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black">
                  {cartCount}
                </div>
              )}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
