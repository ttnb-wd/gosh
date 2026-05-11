"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, Menu, X, MessageSquare, Tags, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: ShoppingBag, label: "Orders", href: "/admin/orders" },
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: Tags, label: "Brands", href: "/admin/brands" },
  { icon: MessageSquare, label: "Messages", href: "/admin/messages" },
  { icon: Star, label: "Testimonials", href: "/admin/testimonials" },
  { icon: Users, label: "Customers", href: "/admin/customers" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 320);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`fixed left-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/45 bg-[#fffaf0] text-[#6f1d1b] shadow-[0_16px_38px_rgba(212,175,55,0.22)] transition-all duration-300 hover:bg-[#fff7e6] active:scale-95 lg:hidden ${
          isScrolling && !isMobileMenuOpen
            ? "pointer-events-none -translate-y-2 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Admin sidebar navigation"
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#d4af37]/20 bg-white/95 shadow-[18px_0_60px_rgba(31,26,20,0.10)] backdrop-blur transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0 lg:opacity-100 lg:shadow-none ${
          isMobileMenuOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-95"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
          {/* Logo */}
          <Link href="/admin" className="mb-8 pl-16 pr-3 lg:px-3" onClick={() => setIsMobileMenuOpen(false)}>
            <h1 className="text-[1.7rem] font-black leading-none text-[#1f1a14]">
              GOSH <span className="text-[#b88705]">ADMIN</span>
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6a55]">Perfume Dashboard</p>
          </Link>

          {/* Navigation */}
          <nav role="navigation" aria-label="Admin menu" className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-[linear-gradient(135deg,#d4af37,#f7d774)] text-[#1f1a14] shadow-[0_10px_24px_rgba(212,175,55,0.24)]"
                      : "text-[#7a6a55] hover:bg-[#fff7e6] hover:text-[#6f1d1b]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto border-t border-[#d4af37]/20 pt-4">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-[#7a6a55] transition hover:bg-[#fff7e6] hover:text-[#1f1a14]"
            >
              <span>← Back to Website</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
