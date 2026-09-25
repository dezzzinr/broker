import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { getPlatformSettings } from "@/lib/server/repo/settings";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Open a Quantix account — live markets, manual deposits and portfolio analytics.",
};

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const platform = getPlatformSettings();
  if (!platform.registrationsOpen) redirect("/login?reason=closed");

  return <SignupForm />;
}
