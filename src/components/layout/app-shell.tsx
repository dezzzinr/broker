import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { TopHeader } from "./top-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-elevated focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileNav />
      <div className="flex min-h-dvh flex-col lg:pl-[250px]">
        <TopHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7"
        >
          {children}
          <footer className="mt-14 border-t border-border pt-5 text-[11px] leading-relaxed text-faint">
            <p>
              Quantix — AI-Powered Trading. Demo preview: market data is simulated and trading,
              deposits and withdrawals are illustrative only. Nothing here is financial advice.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
