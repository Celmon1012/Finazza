import type { Metadata } from "next";
import { Instrument_Serif, Outfit } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif" });

export const metadata: Metadata = {
  title: "FINAZZA",
  description: "Investment social network for stocks, ETFs, commodities, and collectibles.",
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
