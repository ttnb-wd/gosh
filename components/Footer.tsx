"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./ui/StudioMotion";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export default function Footer() {
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";
  const footerText =
    settings.footer_text ||
    "A considered collection of fragrances. A lasting expression of you.";
  const contactItems = [settings.address, settings.phone, settings.email].filter(
    Boolean
  );
  const socialLinks = [
    { label: "Facebook", href: settings.facebook_url },
    { label: "Instagram", href: settings.instagram_url },
    { label: "TikTok", href: settings.tiktok_url },
  ].filter((link) => Boolean(link.href));

  return <footer role="contentinfo" id="contact" className="studio-footer">
    <div className="studio-container"><Reveal>
      <div className="studio-footer-grid"><div><h4>{websiteName}</h4><p>{footerText}</p>{contactItems.length > 0 && <div className="studio-footer-contact">{contactItems.map(item => <p key={item}>{item}</p>)}</div>}</div>
        <div><h4>DISCOVER</h4><Link href="/products">All fragrances</Link><Link href="/promotions">Promotions</Link><Link href="/about">Our story</Link></div>
        <div><h4>CLIENT CARE</h4><Link href="/contact">Contact us</Link><Link href="/account">Your account</Link><Link href="/orders">Your orders</Link><Link href="/delivery-policy">Delivery</Link><Link href="/refund-policy">Returns & refunds</Link></div>
        <div><h4>FOLLOW THE FEELING</h4>{socialLinks.map(link => <a key={link.label} href={link.href || "#"} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={13} /></a>)}<p className="studio-footer-signature">Fragrance, beautifully personal.</p></div>
      </div>
      <div className="studio-footer-bottom"><p>© 2026 {websiteName}. All rights reserved.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><span>GOSH / PERFUME STUDIO</span></div>
    </Reveal></div>
  </footer>;
}
