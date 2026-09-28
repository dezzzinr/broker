import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/server/auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { unreadCount } from "@/lib/server/repo/notifications";
import { countPending } from "@/lib/server/repo/funds";
import { getPlatformSettings } from "@/lib/server/repo/settings";

/**
 * Authenticated trader shell.
 *
 * The session is resolved on the server so the first paint already knows who is
 * signed in; client components read it through `useSession`.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const platform = await getPlatformSettings();
  const pending =
    user.role === "admin" ? await countPending("deposit") + await countPending("withdrawal") : 0;

  return (
    <SessionProvider user={user} unread={await unreadCount(user.id)} pendingReviews={pending}>
      <WalletProvider>
        <AppShell maintenance={{ active: platform.maintenanceMode, message: platform.maintenanceMessage }}>
          {children}
        </AppShell>
      </WalletProvider>
    </SessionProvider>
  );
}
