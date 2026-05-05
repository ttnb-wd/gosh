import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
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
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
