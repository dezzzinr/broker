import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin-users";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Search, inspect and manage every Quantix account.",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  return <AdminUsers />;
}
