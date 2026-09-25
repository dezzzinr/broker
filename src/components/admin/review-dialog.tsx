"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Label, Textarea } from "@/components/ui/input";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { MethodIcon } from "@/components/shared/method-icon";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useToast } from "@/components/providers/toast-provider";
import { formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FundRequest } from "@/lib/types/platform";

const REJECTION_REASONS = [
  "Amount does not match the attached receipt",
  "Proof is unreadable or cropped",
  "Sender name does not match the account holder",
  "Payment not found in our statement",
  "Duplicate submission of an already credited transfer",
];

/**
 * The administrator's decision screen for one funding request:
 * requester context, submitted details, the proof attachment and the
 * approve / reject actions that settle the wallet.
 */
export function ReviewDialog({
  request,
  onClose,
  onResolved,
}: {
  request: FundRequest | null;
  onClose: () => void;
  onResolved: (updated: FundRequest) => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  const proofUrl = request?.hasProof ? `/api/admin/funds/${request.id}/proof` : null;
  const isImage = (request?.proofMime ?? "").startsWith("image/");
  const isPdf = request?.proofMime === "application/pdf";

  useEffect(() => {
    if (!request) return;
    setNote("");
    setError(null);
    setBusy(null);
    setZoom(false);
  }, [request]);

  const summary = useMemo(() => {
    if (!request) return [];
    return [
      { label: "Reference", value: request.reference, mono: true },
      { label: "Method", value: request.methodName },
      { label: "Amount submitted", value: formatUSD(request.amount) },
      {
        label: "Processing fee",
        value: request.fee > 0 ? formatUSD(request.fee) : "None",
      },
      {
        label: request.kind === "withdrawal" ? "To be paid out" : "Credited on approval",
        value: formatUSD(request.credit),
        highlight: true,
      },
      { label: "Sent from", value: request.payerName || "—" },
      ...(request.destination ? [{ label: "Destination", value: request.destination }] : []),
      { label: "Submitted", value: `${formatDateTime(request.submittedAt)} · ${timeAgo(new Date(request.submittedAt))}` },
      { label: "Attachment", value: request.proofName ?? "None provided" },
      ...(request.note ? [{ label: "User note", value: request.note }] : []),
    ];
  }, [request]);

  async function decide(decision: "approved" | "rejected") {
    if (!request) return;
    if (decision === "rejected" && note.trim().length < 3) {
      setError("Add a reason for the rejection — the user sees it in their notifications.");
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      const { request: updated } = await api<{ request: FundRequest }>(
        `/api/admin/funds/${request.id}`,
        { method: "PATCH", body: { decision, note: note.trim() } }
      );
      toast({
        title: decision === "approved" ? "Request approved" : "Request rejected",
        description:
          decision === "approved"
            ? `${formatUSD(updated.credit)} credited to ${updated.user?.name ?? "the account"}.`
            : `${updated.user?.name ?? "The user"} was notified with your reason.`,
        variant: decision === "approved" ? "success" : "warning",
      });
      onResolved(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not process this request.");
    } finally {
      setBusy(null);
    }
  }

  if (!request) return null;

  const settled = request.status !== "pending";

  return (
    <>
      <Dialog
        open
        onClose={busy ? () => undefined : onClose}
        className="max-w-3xl"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {request.kind === "deposit" ? "Deposit review" : "Withdrawal review"}
            <FundStatusBadge status={request.status} />
          </span>
        }
        description={
          <span className="font-mono text-[12px]">{request.id}</span>
        }
      >
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          {settled && (
            <Alert
              variant={request.status === "approved" ? "success" : request.status === "rejected" ? "error" : "info"}
              title={`This request is ${request.status}`}
            >
              {request.reviewNote || "No reviewer note was recorded."}
              {request.reviewedAt && (
                <span className="mt-1 block text-[11px] opacity-80">
                  Processed {formatDateTime(request.reviewedAt)}
                  {request.reviewerName ? ` by ${request.reviewerName}` : ""}
                </span>
              )}
            </Alert>
          )}

          {/* Requester */}
          {request.user && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-fill-1 p-3.5">
              <UserAvatar user={{ name: request.user.name, avatarHue: 265 }} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {request.user.name}
                </p>
                <p className="truncate text-[11.5px] text-faint">{request.user.email}</p>
              </div>
              <Link
                href={`/admin/users/${request.userId}`}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-foreground"
                )}
              >
                Account file
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Details */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">
                <MethodIcon kind={request.methodKind} size={20} className="rounded-md" />
                Submitted details
              </h3>
              <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {summary.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-[11.5px] text-muted">{row.label}</dt>
                    <dd
                      className={cn(
                        "min-w-0 break-words text-right text-[12.5px] font-medium text-foreground",
                        "mono" in row && row.mono && "font-mono",
                        "highlight" in row && row.highlight && "text-positive"
                      )}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Proof */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">
                <ImageIcon className="size-3.5" aria-hidden />
                Proof of payment
              </h3>

              {proofUrl ? (
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proofUrl}
                      alt={`Proof of payment for ${request.reference}`}
                      className="max-h-[300px] w-full object-contain"
                      loading="lazy"
                    />
                  ) : isPdf ? (
                    <div className="flex h-[300px] flex-col items-center justify-center gap-3 p-6 text-center">
                      <FileText className="size-8 text-accent" aria-hidden />
                      <p className="text-[12.5px] text-muted">
                        PDF attachment — {request.proofName}
                      </p>
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-fill-1 px-3 py-1.5 text-[11.5px] font-medium text-foreground hover:bg-fill-2"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        Open in a new tab
                      </a>
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center p-6 text-center text-[12.5px] text-muted">
                      Unsupported preview — download the file to inspect it.
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-fill-1 px-3 py-2">
                    <span className="truncate text-[11px] text-faint">
                      {request.proofName} · {((request.proofSize ?? 0) / 1024).toFixed(0)} KB
                    </span>
                    <span className="flex items-center gap-1.5">
                      {isImage && (
                        <>
                          <button
                            type="button"
                            onClick={() => setZoom(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground"
                          >
                            <ZoomIn className="size-3" aria-hidden />
                            Zoom
                          </button>
                        </>
                      )}
                      <a
                        href={proofUrl}
                        download={request.proofName ?? "proof"}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground"
                      >
                        <Download className="size-3" aria-hidden />
                        Download
                      </a>
                    </span>
                  </div>
                </div>
              ) : (
                <Alert variant="warning" title="No attachment">
                  This request was submitted without proof of payment. Ask the user for a receipt
                  before approving, or reject it with instructions.
                </Alert>
              )}
            </div>
          </div>

          {/* Decision */}
          {!settled && (
            <div className="space-y-3 rounded-xl border border-border bg-fill-1 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="review-note">
                  Reviewer note {request.status === "pending" && <span className="text-faint">(required to reject)</span>}
                </Label>
                <Textarea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you verify? Shown to the user and stored in the audit log."
                  className="min-h-[74px] bg-background"
                  disabled={Boolean(busy)}
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {REJECTION_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setNote(reason)}
                      disabled={Boolean(busy)}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[10.5px] text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="positive"
                  className="flex-1"
                  disabled={Boolean(busy)}
                  onClick={() => void decide("approved")}
                >
                  {busy === "approved" ? (
                    <Loader2 className="size-4 animate-spin-slow" aria-hidden />
                  ) : (
                    <Check className="size-4" aria-hidden />
                  )}
                  Approve &amp; credit {formatUSD(request.credit)}
                </Button>
                <Button
                  variant="negative"
                  className="flex-1"
                  disabled={Boolean(busy)}
                  onClick={() => void decide("rejected")}
                >
                  {busy === "rejected" ? (
                    <Loader2 className="size-4 animate-spin-slow" aria-hidden />
                  ) : (
                    <X className="size-4" aria-hidden />
                  )}
                  Reject request
                </Button>
              </div>

              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Approving writes a ledger entry, credits the wallet and notifies the user. Both
                decisions are recorded against your administrator account.
              </p>
            </div>
          )}

          {settled && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-4 py-3">
              <span className="flex items-center gap-2 text-[12px] text-muted">
                <BadgeCheck className="size-4 text-accent" aria-hidden />
                Processed {request.reviewedAt ? formatDateTime(request.reviewedAt) : ""}
              </span>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </Dialog>

      {/* Full-screen proof zoom */}
      {zoom && proofUrl && isImage && (
        <div
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Proof of payment, full size"
          onClick={() => setZoom(false)}
        >
          <div className="mb-3 flex w-full max-w-4xl items-center justify-between gap-3">
            <p className="truncate text-[12px] text-foreground">{request.proofName}</p>
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label="Close preview"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-elevated text-muted hover:text-foreground"
            >
              <ZoomOut className="size-4" aria-hidden />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofUrl}
            alt="Proof of payment, full size"
            className="max-h-[80vh] max-w-full rounded-xl border border-border bg-background object-contain shadow-[var(--shadow-pop)]"
          />
        </div>
      )}
    </>
  );
}
