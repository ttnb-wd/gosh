"use client";

import { Home, ShoppingBag, Compass, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      href: "/products",
      label: "Products",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/products"),
    },
    {
      href: "/about",
      label: "About",
      icon: Compass,
      isActive: pathname.startsWith("/about"),
    },
    {
      href: "/contact",
      label: "Contact",
      icon: Mail,
      isActive: pathname.startsWith("/contact"),
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-[999] md:hidden"
    >
      <div className="mx-auto max-w-md px-4 pb-4">
        <div className="overflow-hidden rounded-3xl border border-[#d4af37]/30 bg-[#fffef9]/95 shadow-[0_-8px_32px_rgba(212,175,55,0.15)] backdrop-blur-xl">
          <div className="flex items-center justify-around px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2 transition-all duration-300 ${
                    item.isActive
                      ? "bg-[#d4af37]/10"
                      : "hover:bg-[#d4af37]/5"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-all duration-300 ${
                      item.isActive
                        ? "scale-110 text-[#b88700]"
                        : "text-[#7a6a55] group-hover:scale-105 group-hover:text-[#b88700]"
                    }`}
                    strokeWidth={item.isActive ? 2.5 : 2}
                  />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                      item.isActive
                        ? "text-[#b88700]"
                        : "text-[#7a6a55] group-hover:text-[#b88700]"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
