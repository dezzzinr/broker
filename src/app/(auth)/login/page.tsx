import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Quantix trading account.",
};

const SAFE_NEXT = /^\/(?!\/)[a-z0-9\-_/]*$/i;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) {
    redirect(next && SAFE_NEXT.test(next) ? next : user.role === "admin" ? "/admin" : "/dashboard");
  }
  return <LoginForm />;
}
