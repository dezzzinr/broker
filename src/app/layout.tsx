import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { WatchlistProvider } from "@/components/providers/watchlist-provider";
import { LiveMarketProvider } from "@/components/providers/live-market-provider";

export const metadata: Metadata = {
  title: {
    default: "Quantix — AI-Powered Trading",
    template: "%s · Quantix",
  },
  description:
    "Quantix is an AI-powered crypto trading dashboard. Track live markets, manage your portfolio and trade smarter. Demo preview with simulated data.",
  applicationName: "Quantix",
};

export const viewport: Viewport = {
  themeColor: "#08090D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-accent="violet" data-motion="full" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <SettingsProvider>
          <WatchlistProvider>
            <ToastProvider>
              <LiveMarketProvider>{children}</LiveMarketProvider>
            </ToastProvider>
          </WatchlistProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
