import type { Metadata } from "next";
import { SettingsManager } from "@/components/settings/settings-manager";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, appearance, security and trading preferences.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser();
  return <SettingsManager />;
}
