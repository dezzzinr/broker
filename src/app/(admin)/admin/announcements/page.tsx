import type { Metadata } from "next";
import { AdminAnnouncements } from "@/components/admin/admin-announcements";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Publish notices and broadcast messages to every trader.",
};

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  return <AdminAnnouncements />;
}
