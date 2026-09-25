import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin/admin-settings";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Platform settings",
  description: "Funding rules, registrations and maintenance configuration.",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  return <AdminSettings />;
}
