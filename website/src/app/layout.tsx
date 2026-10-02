import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/backend/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// A distinct display serif for headlines only (body copy and UI stay on Geist Sans for
// legibility) — gives the site an editorial, considered feel instead of looking like an
// unstyled default.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gaadigrid.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GaadiGrid — Fuel. Clean. Care. Drive.",
    template: "%s | GaadiGrid",
  },
  description:
    "GaadiGrid puts live fuel prices, real-time queue status, and trusted car care providers in one place, so every drive starts with fewer surprises.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon-48.png",
  },
  openGraph: {
    title: "GaadiGrid — Fuel. Clean. Care. Drive.",
    description:
      "Live fuel prices, real-time queue status, and trusted car care providers, all in one place.",
    url: siteUrl,
    siteName: "GaadiGrid",
    images: [{ url: "/brand/og-image.png", width: 1600, height: 420 }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GaadiGrid — Fuel. Clean. Care. Drive.",
    description:
      "Live fuel prices, real-time queue status, and trusted car care providers, all in one place.",
    images: ["/brand/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#102a43",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
