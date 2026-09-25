import type { Metadata } from "next";
import { AdminLedger } from "@/components/admin/admin-ledger";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Balance ledger",
  description: "Every balance movement across all accounts and assets.",
};

export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  await requireAdmin();
  return <AdminLedger />;
}
