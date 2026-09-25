import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { requireAdmin } from "@/lib/server/auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { countPending } from "@/lib/server/repo/funds";
import { unreadCount } from "@/lib/server/repo/notifications";
import { getPlatformSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

/**
 * Administrator console.
 *
 * `requireAdmin` resolves the session and the role on the server; anything less
 * than an administrator is redirected before a single byte of console UI is
 * rendered. The API layer enforces the same rule independently.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const platform = getPlatformSettings();
  const pending = countPending("deposit") + countPending("withdrawal");

  return (
    <SessionProvider user={admin} unread={unreadCount(admin.id)} pendingReviews={pending}>
      {platform.maintenanceMode && (
        <div className="flex items-center gap-2.5 border-b border-warning/25 bg-warning/10 px-4 py-2 text-[12px] text-warning lg:pl-[274px]">
          <Construction className="size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Maintenance mode is on.</span> Traders see a banner and
            {platform.registrationsOpen ? " sign-ups remain open" : " sign-ups are closed"}.
          </span>
        </div>
      )}
      <AdminShell pending={pending}>{children}</AdminShell>
    </SessionProvider>
  );
}
