"use client";

import { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  LogIn,
  CircleUserRound,
  LogOut,
  LayoutDashboard,
  Moon,
  Sun,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MarqueeBanner from "./MarqueeBanner";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { signOutUser } from "@/lib/firebase/auth";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  onCartOpen: () => void;
  cartCount: number;
  enableDropAnimation?: boolean;
}

export default function Navbar({ onCartOpen, cartCount }: NavbarProps) {
  const { status, sessionUser } = useAuth();
  const user = status === "authenticated" ? sessionUser : null;
  const isAdmin = user?.role === "admin";
  const profileName = user?.full_name || user?.email?.split("@")[0] || "Account";
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const links = [{ href: "/", label: "Home" }, { href: "/products", label: "Products" }, { href: "/promotions", label: "Promotions" }, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }];
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 48);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const el = dialog.current;
    el?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { el?.close(); document.body.style.overflow = overflow; menuTrigger.current?.focus(); };
  }, [mobileOpen]);

  // ------------------------------------------------------------
  // Firebase Auth + Firestore Profile
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Close account menu when clicking outside
  // ------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        showAccountMenu &&
        !target.closest("[data-account-menu]")
      ) {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAccountMenu]);

  // ------------------------------------------------------------
  // Firebase Logout
  // ------------------------------------------------------------
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError("");
    try {
      await signOutUser();
      setShowAccountMenu(false);
      window.location.assign("/login");
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error));
    } finally { setLoggingOut(false); }
  };

  return <>
    <div className="site-header-frame">
    <header role="banner" className={`studio-navbar ${scrolled ? "studio-navbar--scrolled" : ""}`}>
      <MarqueeBanner />
      {logoutError && <p role="alert" className="px-4 py-2 text-center text-sm text-destructive">{logoutError}</p>}
      <div className="studio-nav-inner">
        <Link href="/" className="studio-wordmark" aria-label="GOSH Perfume Studio home">GOSH<span>PERFUME STUDIO</span></Link>
        <nav role="navigation" aria-label="Main navigation" className="studio-nav-links">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={pathname === link.href ? "is-active" : ""}>{link.label}</Link>)}</nav>
        <div className="studio-nav-tools">
          <button type="button" onClick={toggleTheme} className="studio-icon-button studio-theme-toggle" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          {isAdmin && <Link href="/admin" className="studio-icon-button studio-desktop-tool" aria-label="Admin Dashboard"><LayoutDashboard size={18} /></Link>}
          <div className="studio-desktop-account">
            {status === "loading" ? <span role="status" className="text-xs">Loading...</span> : !user ? <Link href="/login" className="studio-account-link"><CircleUserRound size={18} /><span>Sign in</span></Link> : <div className="relative" data-account-menu onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setShowAccountMenu(false); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setShowAccountMenu(false); accountTrigger.current?.focus(); } }}>
              <button ref={accountTrigger} type="button" onClick={() => setShowAccountMenu(prev => !prev)} aria-label="Open account menu" aria-expanded={showAccountMenu} aria-controls={showAccountMenu ? "studio-account-menu" : undefined} aria-haspopup="true" className="studio-account-link"><CircleUserRound size={18} /><span className="max-w-24 truncate">{profileName}</span></button>
              {showAccountMenu && <div id="studio-account-menu" className="studio-account-menu" aria-label="Account menu"><p>{profileName}<small>{user.email}</small></p><Link href="/account" onClick={() => setShowAccountMenu(false)}>Your account</Link><Link href="/orders" onClick={() => setShowAccountMenu(false)}>My Orders</Link><button type="button" onClick={handleLogout} disabled={loggingOut}><LogOut size={16} />{loggingOut ? "Logging out..." : "Logout"}</button></div>}
            </div>}
          </div>
          <button type="button" onClick={onCartOpen} className="studio-icon-button studio-bag-button" aria-label="Open shopping bag"><ShoppingBag size={19} />{cartCount > 0 && <span className="studio-bag-count">{cartCount}</span>}</button>
          <button type="button" ref={menuTrigger} onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="studio-mobile-menu" aria-label="Open navigation menu" className="studio-icon-button studio-menu-toggle"><Menu size={21} /></button>
        </div>
      </div>
    </header>
    </div>
    <div className="studio-nav-space" aria-hidden="true" />
    <dialog ref={dialog} id="studio-mobile-menu" className="studio-mobile-menu" aria-label="Main navigation" onCancel={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)}>
      <div className="site-safe-area" aria-hidden="true" />
      <div className="studio-mobile-top"><Link href="/" onClick={() => setMobileOpen(false)} className="studio-wordmark">GOSH<span>PERFUME STUDIO</span></Link><button type="button" className="studio-icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X size={24} /></button></div>
      <p className="studio-eyebrow">THE WORLD OF GOSH</p>
      <nav role="navigation" aria-label="Mobile main navigation">{links.map((link, index) => <Link style={{ animationDelay: `${index * 65}ms` }} href={link.href} key={link.href} onClick={() => setMobileOpen(false)} aria-current={pathname === link.href ? "page" : undefined}><small>0{index + 1}</small>{link.label}<ArrowUpRight size={25} /></Link>)}</nav>
      <div className="studio-mobile-account">{status === "loading" ? <span role="status">Loading...</span> : !user ? <Link href="/login" onClick={() => setMobileOpen(false)}><LogIn size={18} />Login / Sign Up</Link> : <><Link href="/account" onClick={() => setMobileOpen(false)}>Your account</Link><Link href="/orders" onClick={() => setMobileOpen(false)}>My Orders</Link><button type="button" disabled={loggingOut} onClick={handleLogout}><LogOut size={18} />Logout</button></>}{isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)}>Admin Dashboard</Link>}</div>
      <p className="studio-mobile-signature studio-gradient">A scent. A feeling. Only yours.</p>
    </dialog>
  </>;
}
