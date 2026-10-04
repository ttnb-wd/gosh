"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";

export type AmbientVariant = "champagne" | "blush" | "pearl" | "admin";

/** Route groups are stable on the server and client, including nested/future routes. */
export function ambientVariantForPath(pathname: string): AmbientVariant {
  const group = pathname.split("/")[1];
  if (group === "admin") return "admin";
  if (["promotions", "about", "contact"].includes(group)) return "blush";
  if (["login", "register", "verify-email", "forgot-password", "reset-password", "auth",
    "account", "orders", "cart", "checkout", "order-confirmation", "privacy", "terms",
    "refund-policy", "delivery-policy"].includes(group)) return "pearl";
  return "champagne";
}

/** Text-free artwork derived from the existing hero's silk curves and light fields. */
export function AmbientBackgroundVisual({ variant = "champagne" }: { variant?: AmbientVariant }) {
  const id = useId();
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visibility = () => layer.current?.setAttribute("data-paused", String(document.hidden));
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  return (
    <div ref={layer} className="site-ambient" data-variant={variant} aria-hidden="true">
      <div className="site-ambient-wash" />
      <div className="site-ambient-light" />
      <svg className="site-ambient-flow" viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none" focusable="false">
        <defs>
          <linearGradient id={`${id}-silk`} x1="0" y1="760" x2="1440" y2="190" gradientUnits="userSpaceOnUse">
            <stop className="site-ambient-stop-gold" stopOpacity=".04" />
            <stop className="site-ambient-stop-gold" offset=".32" stopOpacity=".25" />
            <stop className="site-ambient-stop-rose" offset=".57" stopOpacity=".5" />
            <stop className="site-ambient-stop-plum" offset=".8" stopOpacity=".35" />
            <stop className="site-ambient-stop-gold" offset="1" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id={`${id}-light`} x1="170" y1="820" x2="1410" y2="160" gradientUnits="userSpaceOnUse">
            <stop className="site-ambient-stop-light" stopOpacity="0" />
            <stop className="site-ambient-stop-light" offset=".38" stopOpacity=".7" />
            <stop className="site-ambient-stop-light" offset=".68" stopOpacity=".48" />
            <stop className="site-ambient-stop-rose" offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-line`} x1="0" y1="670" x2="1440" y2="200" gradientUnits="userSpaceOnUse">
            <stop className="site-ambient-stop-gold" stopOpacity="0" />
            <stop className="site-ambient-stop-gold" offset=".36" stopOpacity=".3" />
            <stop className="site-ambient-stop-plum" offset=".62" stopOpacity=".42" />
            <stop className="site-ambient-stop-gold" offset="1" stopOpacity=".4" />
          </linearGradient>
        </defs>
        <g className="site-ambient-ribbons">
          <path d="M-180 780C160 582 420 910 800 690S1240 665 1600 280" stroke={`url(#${id}-silk)`} strokeWidth="160" />
          <path d="M-130 750C195 569 425 865 812 647S1300 555 1550 315" stroke={`url(#${id}-light)`} strokeWidth="40" />
          <path className="site-ambient-ribbon-secondary" d="M-160 280C240 60 500 410 910 205S1330 90 1610 170" stroke={`url(#${id}-silk)`} strokeWidth="72" opacity=".45" />
        </g>
        <g className="site-ambient-lines" strokeWidth="1">
          <path d="M-80 679C256 503 491 786 853 540S1244 546 1550 250" stroke={`url(#${id}-line)`} />
          <path d="M-40 828C267 629 600 863 941 626S1340 520 1520 372" stroke={`url(#${id}-light)`} />
        </g>
      </svg>
      <span className="site-ambient-glass site-ambient-glass-one" />
      <span className="site-ambient-glass site-ambient-glass-two" />
      <span className="site-ambient-accent site-ambient-accent-one" />
      <span className="site-ambient-accent site-ambient-accent-two" />
    </div>
  );
}

export default function GlobalAmbientBackground() {
  const pathname = usePathname();
  return <AmbientBackgroundVisual variant={ambientVariantForPath(pathname ?? "/")} />;
}
