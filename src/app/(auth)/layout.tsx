import type { ReactNode } from "react";

/** Bare, chrome-free layout for the authentication screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
