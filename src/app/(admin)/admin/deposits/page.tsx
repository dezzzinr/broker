import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewQueue } from "@/components/admin/review-queue";
import { RouteSkeleton } from "@/components/shared/route-skeleton";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Funding reviews",
  description: "Approve or reject manual deposits and withdrawal requests.",
};

export const dynamic = "force-dynamic";

export default async function AdminDepositsPage() {
  await requireAdmin();
  return (
    <Suspense fallback={<RouteSkeleton label="Loading review queue" />}>
      <ReviewQueue />
    </Suspense>
  );
}
