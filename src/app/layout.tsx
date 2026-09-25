import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { WatchlistProvider } from "@/components/providers/watchlist-provider";
import { LiveMarketProvider } from "@/components/providers/live-market-provider";
import { ThemeScript } from "@/components/providers/theme-script";

export const metadata: Metadata = {
  title: {
    default: "Quantix — AI-Powered Trading",
    template: "%s · Quantix",
  },
  description:
    "Quantix is a trading platform with real accounts, administrator-reviewed manual deposits and live market intelligence.",
  applicationName: "Quantix",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090D" },
    { media: "(prefers-color-scheme: light)", color: "#F4F6FB" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-accent="violet"
      data-motion="full"
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <ThemeScript />
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
