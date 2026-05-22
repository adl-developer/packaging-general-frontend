import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Base URL drives canonical + Open Graph absolute URLs. Override per environment.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://packaginggeneral.com";

// SEO foundation — per-page metadata extends/overrides this template.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Packaging General — Digital-First Packaging in West Africa",
    template: "%s | Packaging General",
  },
  description:
    "Browse and buy quality packaging supplies online. Packaging General is West Africa's digital-first packaging platform for SMEs and growing brands.",
  applicationName: "Packaging General",
  keywords: [
    "packaging supplies Ghana",
    "shipping cartons",
    "packaging tape",
    "packaging materials West Africa",
    "buy packaging online Accra",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Packaging General",
    title: "Packaging General — Digital-First Packaging in West Africa",
    description:
      "Browse and buy quality packaging supplies online. Built for SMEs and growing brands across West Africa.",
    url: siteUrl,
    locale: "en_GH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Packaging General — Digital-First Packaging in West Africa",
    description:
      "Browse and buy quality packaging supplies online. Built for West Africa.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-brand">{children}</body>
    </html>
  );
}
