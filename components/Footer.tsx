"use client";

import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export default function Footer() {
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";
  const footerText =
    settings.footer_text ||
    "Luxury perfume experience built with Next.js and modern animation.";
  const contactItems = [settings.address, settings.phone, settings.email].filter(
    Boolean
  );
  const socialLinks = [
    { label: "Facebook", href: settings.facebook_url },
    { label: "Instagram", href: settings.instagram_url },
    { label: "TikTok", href: settings.tiktok_url },
  ].filter((link) => Boolean(link.href));

  return (
    <footer
      role="contentinfo"
      id="contact"
      className="border-t border-[#d4af37]/20 bg-white dark:border-[#d4af37]/25 dark:bg-[#0f0b07]"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
        <h4 className="text-2xl font-bold text-[#1f1a14] dark:text-[#fff7e6]">{websiteName}</h4>
        <p className="mt-3 text-[#7a6a55] dark:text-[#fff7e6]/65">{footerText}</p>
        {contactItems.length > 0 && (
          <p className="mx-auto mt-4 max-w-3xl text-sm font-medium text-[#7a6a55]/90 dark:text-[#fff7e6]/60">
            {contactItems.join(" • ")}
          </p>
        )}
        {socialLinks.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#d4af37]/30 bg-[#fffaf0] px-4 py-2 text-xs font-bold text-[#b88705] transition hover:border-[#d4af37]/60 hover:bg-[#fff7e6] dark:bg-[#15100b] dark:text-[#d4af37] dark:hover:bg-[#1c160f]"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        <p className="mt-6 text-sm text-[#7a6a55]/80 dark:text-[#fff7e6]/50">
          © 2026 {websiteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
