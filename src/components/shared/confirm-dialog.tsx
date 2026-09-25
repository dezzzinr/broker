"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";

/**
 * Confirmation dialog for destructive or irreversible console actions.
 * Optionally collects a reason that is stored with the activity log entry.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "negative",
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain this decision for the audit log…",
  children,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "negative" | "positive" | "default";
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  children?: ReactNode;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  async function confirm() {
    if (requireReason && reason.trim().length < 3) {
      setError("Add a short reason — it is stored with the audit entry.");
      return;
    }
    setError(null);
    await onConfirm(reason.trim());
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={
        <span className="flex items-center gap-2">
          {variant === "negative" && <AlertTriangle className="size-4 text-negative" aria-hidden />}
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "negative" ? "negative" : variant === "positive" ? "positive" : "default"}
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy && <Loader2 className="size-4 animate-spin-slow" aria-hidden />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {children}
        {requireReason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="min-h-[80px]"
              disabled={busy}
            />
            {error && <p className="text-[11px] font-medium text-negative">{error}</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
}
