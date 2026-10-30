import type { Metadata } from "next";
import { Instrument_Serif, Outfit } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://finazza.vercel.app";
const description = "Investment social network for stocks, ETFs, commodities, and collectibles.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "FINAZZA",
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "FINAZZA",
    title: "FINAZZA",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "FINAZZA",
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
