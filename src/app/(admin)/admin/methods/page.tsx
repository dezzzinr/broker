import type { Metadata } from "next";
import { AdminMethods } from "@/components/admin/admin-methods";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Deposit methods",
  description: "Publish and manage the funding methods traders can deposit through.",
};

export const dynamic = "force-dynamic";

export default async function AdminMethodsPage() {
  await requireAdmin();
  return <AdminMethods />;
}
