import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { AuthProvider } from "@/lib/backend/auth-context";
import { MotionProvider } from "@/components/site/motion-provider";

// Manrope is GaadiGrid's single typeface. One self-hosted variable file covers every weight
// (400 body, 600 labels/buttons, 700 headings, 800 wordmark) — no external font request.
const manrope = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
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
  themeColor: "#f8faf9",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <MotionProvider>{children}</MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
