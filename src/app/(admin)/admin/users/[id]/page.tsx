import type { Metadata } from "next";
import { AdminUserDossier } from "@/components/admin/admin-user-dossier";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Account file",
  description: "Full trader account dossier with wallets, funding and activity.",
};

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  return <AdminUserDossier userId={id} />;
}
