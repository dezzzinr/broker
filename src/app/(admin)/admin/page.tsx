import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Control panel",
  description: "Platform overview: accounts, funding requests and user activity.",
};

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  return <AdminOverview />;
}
