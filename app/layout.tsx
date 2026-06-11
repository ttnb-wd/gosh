import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import LoadingProvider from "@/components/LoadingProvider";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://goshperfume.com'),
  title: {
    default: "GOSH Perfume Studio | Premium Luxury Perfumes",
    template: "%s | GOSH Perfume Studio"
  },
  description: "Experience premium perfumes crafted with style, depth, and luxury. Discover the scent of elegance with GOSH Perfume Studio - a modern perfume brand with clean elegance and golden highlights.",
  keywords: ["luxury perfume", "premium fragrance", "GOSH perfume", "perfume studio", "elegant scents", "luxury fragrance", "designer perfume"],
  authors: [{ name: "GOSH Perfume Studio" }],
  creator: "GOSH Perfume Studio",
  publisher: "GOSH Perfume Studio",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://goshperfume.com",
    siteName: "GOSH Perfume Studio",
    title: "GOSH Perfume Studio | Premium Luxury Perfumes",
    description: "Experience premium perfumes crafted with style, depth, and luxury. Discover the scent of elegance with GOSH Perfume Studio.",
    images: [
      {
        url: "/images/gosh-perfume-studio-logo.png",
        width: 1200,
        height: 630,
        alt: "GOSH Perfume Studio - Premium Luxury Perfumes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GOSH Perfume Studio | Premium Luxury Perfumes",
    description: "Experience premium perfumes crafted with style, depth, and luxury. Discover the scent of elegance.",
    images: ["/images/gosh-perfume-studio-logo.png"],
    creator: "@goshperfume",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/images/gosh-circle-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("theme");
                  if (theme === "dark") {
                    document.documentElement.classList.add("dark");
                    document.documentElement.style.colorScheme = "dark";
                  } else {
                    localStorage.setItem("theme", "light");
                    document.documentElement.classList.remove("dark");
                    document.documentElement.style.colorScheme = "light";
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="relative isolate flex min-h-full w-full flex-col overflow-x-hidden bg-[var(--background)] dark:bg-[#0f0b07]" suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-KCXSBFNV"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        
        <GoogleAnalytics />
        <ThemeProvider>
          <LoadingProvider>
            <div className="site-page-wrapper relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[var(--background)] pb-20 dark:bg-[#0f0b07] md:pb-0">
              {children}
            </div>
            <MobileBottomNav />
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
