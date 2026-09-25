import type { Metadata } from "next";
import { AdminActivity } from "@/components/admin/admin-activity";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Activity log",
  description: "Every action recorded across the Quantix platform.",
};

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  await requireAdmin();
  return <AdminActivity />;
}
