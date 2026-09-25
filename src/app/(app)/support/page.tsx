import type { Metadata } from "next";
import { SupportManager } from "@/components/support/support-manager";
import { getPlatformSettings, listAnnouncements } from "@/lib/server/repo/settings";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Support",
  description: "Announcements, answers and a direct line to the Quantix team.",
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  await requireUser();
  const platform = getPlatformSettings();
  const announcements = listAnnouncements({ limit: 12 });

  return (
    <SupportManager announcements={announcements} supportEmail={platform.supportEmail} />
  );
}
