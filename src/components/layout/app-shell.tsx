import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { TopHeader } from "./top-header";

export interface MaintenanceState {
  active: boolean;
  message: string;
}

export function AppShell({
  children,
  maintenance,
}: {
  children: ReactNode;
  maintenance?: MaintenanceState;
}) {
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

        {maintenance?.active && (
          <div className="flex items-start gap-2.5 border-b border-warning/25 bg-warning/10 px-4 py-2.5 text-[12px] leading-relaxed text-warning sm:px-6 lg:px-8">
            <Construction className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Scheduled maintenance.</span> {maintenance.message}
            </p>
          </div>
        )}

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] flex-1 px-3 pb-24 pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-7"
        >
          {children}
          <footer className="mt-14 border-t border-border pt-5 pb-2 text-[11px] leading-relaxed text-faint">
            <p>
              Quantix — AI-Powered Trading. Market data is simulated; manual deposits are reviewed by
              administrators inside this demo platform and no real funds are moved. Nothing here is
              financial advice.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
