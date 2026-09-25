import Link from "next/link";
import { Compass } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark size={44} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          The page you are looking for doesn&apos;t exist or was moved. Let&apos;s get you back on
          track.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-accent px-5 text-[13px] font-medium text-on-accent transition-all hover:brightness-110"
      >
        <Compass className="size-4" aria-hidden />
        Back to dashboard
      </Link>
    </div>
  );
}
