"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, Menu, X, MessageSquare, Tags, Star, Tag, Megaphone, ArrowUpRight } from "lucide-react";
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: ShoppingBag, label: "Orders", href: "/admin/orders" },
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: Tags, label: "Brands", href: "/admin/brands" },
  { icon: Tag, label: "Promotions", href: "/admin/promotions" },
  { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
  { icon: MessageSquare, label: "Messages", href: "/admin/messages" },
  { icon: Star, label: "Testimonials", href: "/admin/testimonials" },
  { icon: Users, label: "Customers", href: "/admin/customers" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];
export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) drawer.current?.showModal();
    else if (drawer.current?.open) { drawer.current.close(); toggle.current?.focus({ preventScroll: true }); }
  }, [open]);
  function navigation(mobile: boolean) {
    return <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="studio-admin-brand flex items-start justify-between gap-3">
        <Link href="/admin" onClick={() => setOpen(false)} aria-label="GOSH studio dashboard"><span className="studio-wordmark">GOSH<span>PERFUME STUDIO</span></span><p>Studio administration</p></Link>
        {mobile && <button type="button" className="studio-icon-button" onClick={() => setOpen(false)} aria-label="Close admin navigation"><X size={18} /></button>}
      </div>
      <p className="px-3 pb-3 text-[9px] uppercase tracking-[.18em] text-faint">Workspace</p>
      <nav aria-label={mobile ? "Mobile admin navigation" : "Admin navigation"} className="flex-1">
        {menuItems.map(({ icon: Icon, label, href }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={17} aria-hidden="true" />{label}</Link>)}
      </nav>
      <Link href="/" onClick={() => setOpen(false)} className="mt-6 flex items-center justify-between gap-3 border-t border-line-muted px-3 pt-5 text-xs text-muted">Visit storefront<ArrowUpRight size={15} /></Link>
    </div>;
  }
  return <>
    <button ref={toggle} type="button" onClick={() => setOpen(true)} aria-label="Open admin navigation" aria-expanded={open} aria-controls="studio-admin-drawer"
      className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink lg:hidden"><Menu size={19} /></button>
    <aside className="studio-admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{navigation(false)}</aside>
    <dialog ref={drawer} id="studio-admin-drawer" aria-label="Admin navigation" className="studio-admin-drawer studio-admin-sidebar"
      onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === drawer.current) setOpen(false); }}>{navigation(true)}</dialog>
  </>;
}
