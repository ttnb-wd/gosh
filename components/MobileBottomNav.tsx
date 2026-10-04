"use client";

import { Home, ShoppingBag, Compass, Mail, Tag } from "lucide-react";
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
      href: "/promotions",
      label: "Promos",
      icon: Tag,
      isActive: pathname.startsWith("/promotions"),
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
      className="studio-bottom-nav fixed bottom-0 left-0 right-0 z-[999] md:hidden"
    >
      <div className="mx-auto max-w-md px-4 pb-4">
        <div className="overflow-hidden rounded-xl border border-line bg-surface/95 shadow-panel ">
          <div className="flex items-center justify-around px-1 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.isActive ? "page" : undefined}
                  className={`group flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-300 ${
                    item.isActive
                      ? "bg-brand-soft"
                      : "hover:bg-brand/5"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-all duration-300 ${
                      item.isActive
                        ? "scale-110 text-accent"
                        : "text-muted group-hover:scale-105 group-hover:text-accent"
                    }`}
                    strokeWidth={item.isActive ? 2.5 : 2}
                  />
                  <span
                    className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-normal transition-all duration-300 ${
                      item.isActive
                        ? "text-accent"
                        : "text-muted group-hover:text-accent"
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
