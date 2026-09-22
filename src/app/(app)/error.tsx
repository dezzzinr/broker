"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-negative/25 bg-negative/10">
        <AlertTriangle className="size-6 text-negative" aria-hidden />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted">
          An unexpected error interrupted this page. Your data is safe — try again, or head back
          to the dashboard.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RefreshCcw className="size-4" aria-hidden />
          Try again
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
