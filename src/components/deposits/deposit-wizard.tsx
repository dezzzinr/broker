"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleAlert,
  Clock3,
  Loader2,
  Percent,
  ReceiptText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/shared/copy-button";
import { MethodIcon, METHOD_LABELS } from "@/components/shared/method-icon";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { ProofUpload } from "./proof-upload";
import { validateProof } from "./proof-limits";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DepositMethod, FundRequest } from "@/lib/types/platform";

const STEPS = [
  { id: 1, label: "Method", hint: "How will you pay?" },
  { id: 2, label: "Amount", hint: "How much?" },
  { id: 3, label: "Proof", hint: "Attach receipt" },
  { id: 4, label: "Review", hint: "Confirm & submit" },
] as const;

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500];

export function DepositWizard({
  methods,
  limits,
  onSubmitted,
}: {
  methods: DepositMethod[];
  limits: { minDeposit: number; maxDeposit: number };
  onSubmitted: (request: FundRequest) => void;
}) {
  const { user } = useSession();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState(user.name);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<FundRequest | null>(null);

  const method = useMemo(
    () => methods.find((m) => m.id === methodId) ?? null,
    [methods, methodId]
  );

  const numericAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const minAllowed = method ? Math.max(method.minAmount, limits.minDeposit) : limits.minDeposit;
  const maxAllowed = method ? Math.min(method.maxAmount, limits.maxDeposit) : limits.maxDeposit;
  const fee = amountValid && method ? (numericAmount * method.feePercent) / 100 : 0;
  const credit = amountValid ? numericAmount - fee : 0;

  useEffect(() => {
    if (done) return;
    if (step === 1 && !methodId && methods.length === 1) setMethodId(methods[0].id);
  }, [methods, methodId, step, done]);

  function reset() {
    setStep(1);
    setMethodId("");
    setAmount("");
    setReference("");
    setNote("");
    setFile(null);
    setError(null);
    setFields({});
    setDone(null);
  }

  function next() {
    setError(null);
    setFields({});

    if (step === 1 && !method) {
      setError("Choose a deposit method to continue.");
      return;
    }
    if (step === 2) {
      if (!amountValid) {
        setError("Enter the amount you transferred.");
        setFields({ amount: "Required." });
        return;
      }
      if (numericAmount < minAllowed) {
        setError(`The minimum for ${method?.name} is ${formatUSD(minAllowed)}.`);
        setFields({ amount: `Minimum ${formatUSD(minAllowed)}` });
        return;
      }
      if (numericAmount > maxAllowed) {
        setError(`The maximum for ${method?.name} is ${formatUSD(maxAllowed)}.`);
        setFields({ amount: `Maximum ${formatUSD(maxAllowed)}` });
        return;
      }
      if (!payerName.trim() || payerName.trim().length < 2) {
        setError("Enter the name the payment was sent from.");
        setFields({ payerName: "Required." });
        return;
      }
    }
    if (step === 3) {
      const invalid = validateProof(file);
      if (invalid) {
        setError(invalid);
        setFields({ proof: invalid });
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  }

  async function submit() {
    if (!method || !file) return;
    setSubmitting(true);
    setError(null);
    setFields({});

    try {
      const form = new FormData();
      form.set("methodId", method.id);
      form.set("amount", String(numericAmount));
      form.set("payerName", payerName.trim());
      form.set("reference", reference.trim());
      form.set("note", note.trim());
      form.set("proof", file, file.name);

      const { request } = await api<{ request: FundRequest }>("/api/deposits", {
        method: "POST",
        form,
      });

      setDone(request);
      onSubmitted(request);
      toast({
        title: "Deposit submitted for review",
        description: `Reference ${request.reference} · ${formatUSD(request.amount)} via ${method.name}.`,
        variant: "success",
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("We could not submit your deposit. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------ success view --------------------------- */
  if (done) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-accent-soft to-transparent p-6 text-center sm:p-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-positive/30 bg-positive/15">
            <BadgeCheck className="size-7 text-positive" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            Deposit submitted
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            An administrator will match your proof of payment and credit{" "}
            <span className="font-semibold text-foreground">{formatUSD(done.credit)}</span> to your
            USD balance. You will get a notification as soon as it is processed.
          </p>
          <div className="mt-4 inline-flex">
            <FundStatusBadge status={done.status} />
          </div>
        </div>

        <dl className="divide-y divide-border text-[13px]">
          <Row label="Reference">
            <span className="flex items-center gap-2 font-mono text-foreground">
              {done.reference}
              <CopyButton value={done.reference} compact />
            </span>
          </Row>
          <Row label="Method">{done.methodName}</Row>
          <Row label="Amount paid">{formatUSD(done.amount)}</Row>
          {done.fee > 0 && <Row label="Processing fee">{formatUSD(done.fee)}</Row>}
          <Row label="You will receive">
            <span className="font-semibold text-positive">{formatUSD(done.credit)}</span>
          </Row>
          <Row label="Sent from">{done.payerName}</Row>
          <Row label="Attachment">{done.proofName ?? "—"}</Row>
          <Row label="Expected review">{method?.processingTime ?? "Within 24 hours"}</Row>
        </dl>

        <div className="flex flex-col gap-2 border-t border-border p-5 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={reset}>
            <ReceiptText className="size-4" aria-hidden />
            Make another deposit
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const el = document.getElementById("deposit-history");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            View deposit history
          </Button>
        </div>
      </Card>
    );
  }

  /* -------------------------------- wizard ------------------------------- */
  return (
    <Card className="overflow-hidden">
      {/* Stepper */}
      <div className="border-b border-border bg-fill-1/60 px-4 py-3.5 sm:px-5">
        <ol className="flex items-center gap-1.5 sm:gap-2">
          {STEPS.map((s, index) => {
            const state = step === s.id ? "current" : step > s.id ? "done" : "todo";
            return (
              <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => step > s.id && setStep(s.id)}
                  disabled={step < s.id}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors",
                    step > s.id && "cursor-pointer hover:bg-fill-2",
                    step < s.id && "cursor-not-allowed"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                      state === "done" && "border-positive/40 bg-positive/15 text-positive",
                      state === "current" && "border-accent bg-gradient-accent text-on-accent",
                      state === "todo" && "border-border bg-fill-1 text-faint"
                    )}
                  >
                    {state === "done" ? <Check className="size-3.5" /> : s.id}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-[12px] font-semibold",
                        state === "todo" ? "text-faint" : "text-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="hidden truncate text-[10.5px] text-faint sm:block">
                      {s.hint}
                    </span>
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "hidden h-px w-4 shrink-0 sm:block",
                      step > s.id ? "bg-positive/40" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {error && (
          <Alert variant="error" title="Please check the details">
            {error}
          </Alert>
        )}

        {/* Step 1 — choose a method */}
        {step === 1 && (
          <div className="space-y-3">
            <StepHeading
              title="Choose how you will pay"
              description="These funding channels are configured by the Quantix operations team. Pick one, send the money, then upload the receipt."
            />
            {methods.length === 0 ? (
              <Alert variant="warning" title="No funding channels available">
                Administrators have not published any deposit methods yet. Please contact support.
              </Alert>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {methods.map((m) => {
                  const active = m.id === methodId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethodId(m.id)}
                      aria-pressed={active}
                      className={cn(
                        "group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                        active
                          ? "border-accent/50 bg-accent-soft shadow-[0_0_0_1px_var(--accent-border)]"
                          : "border-border bg-fill-1 hover:border-border-strong hover:bg-fill-2"
                      )}
                    >
                      <MethodIcon kind={m.kind} size={38} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">
                            {m.name}
                          </span>
                          {active && (
                            <Check className="ml-auto size-4 shrink-0 text-accent" aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-faint">
                          {METHOD_LABELS[m.kind]} · {m.currency}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3 text-faint" aria-hidden />
                            {m.processingTime}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Percent className="size-3 text-faint" aria-hidden />
                            {m.feePercent > 0 ? `${m.feePercent}% fee` : "No fee"}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] text-faint">
                          {formatUSD(m.minAmount)} – {formatUSD(m.maxAmount)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — amount & payer details */}
        {step === 2 && method && (
          <div className="space-y-4">
            <StepHeading
              title={`How much will you send via ${method.name}?`}
              description={`Send the exact amount — it helps our team match your payment faster. Limits: ${formatUSD(minAllowed)} to ${formatUSD(maxAllowed)}.`}
            />

            <div className="space-y-1.5">
              <Label htmlFor="deposit-amount">Amount sent ({method.currency})</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-faint">
                  $
                </span>
                <Input
                  id="deposit-amount"
                  type="number"
                  inputMode="decimal"
                  min={minAllowed}
                  max={maxAllowed}
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    "h-11 pl-7 text-[15px] font-semibold tabular-nums",
                    fields.amount && "border-negative/60"
                  )}
                  disabled={submitting}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_AMOUNTS.filter((v) => v >= minAllowed && v <= maxAllowed).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="rounded-lg border border-border bg-fill-1 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                  >
                    {formatUSD(v, 0)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(String(maxAllowed))}
                  className="rounded-lg border border-border bg-fill-1 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                >
                  Max
                </button>
              </div>
            </div>

            {amountValid && (
              <div className="grid gap-2.5 sm:grid-cols-3">
                <MiniStat label="Amount sent" value={formatUSD(numericAmount)} />
                <MiniStat
                  label={`Fee (${method.feePercent}%)`}
                  value={formatUSD(fee)}
                  tone={fee > 0 ? "warning" : "muted"}
                />
                <MiniStat label="Credited to wallet" value={formatUSD(credit)} tone="positive" />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payer-name">Name on the payment</Label>
                <Input
                  id="payer-name"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Exactly as it appears on the transfer"
                  className={fields.payerName ? "border-negative/60" : undefined}
                  disabled={submitting}
                />
                <p className="text-[11px] leading-relaxed text-faint">
                  Third-party payments are rejected — the sender must match your Quantix account.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reference">
                  Your reference <span className="text-faint">(optional)</span>
                </Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={
                    method.referencePrefix ? `${method.referencePrefix}-______` : "Auto-generated"
                  }
                  maxLength={64}
                  disabled={submitting}
                />
                <p className="text-[11px] leading-relaxed text-faint">
                  Include this in your payment description. Leave blank and we will generate one.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deposit-note">
                Note for the reviewer <span className="text-faint">(optional)</span>
              </Label>
              <Textarea
                id="deposit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything that helps us match the payment — bank, branch, time of transfer…"
                maxLength={600}
                className="min-h-[76px]"
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {/* Step 3 — proof of payment */}
        {step === 3 && method && (
          <div className="space-y-4">
            <StepHeading
              title="Upload your proof of payment"
              description="Send the money first, then attach the confirmation. Requests without a receipt cannot be approved."
            />
            <PaymentDetails method={method} reference={reference} amount={numericAmount} />
            <ProofUpload file={file} onFile={setFile} error={fields.proof} disabled={submitting} />
          </div>
        )}

        {/* Step 4 — review */}
        {step === 4 && method && (
          <div className="space-y-4">
            <StepHeading
              title="Review and submit"
              description="Double-check every detail — mismatches between your receipt and this form are the most common reason for rejection."
            />

            <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              <Row label="Method">
                <span className="flex items-center gap-2">
                  <MethodIcon kind={method.kind} size={22} className="rounded-md" />
                  {method.name}
                </span>
              </Row>
              <Row label="Amount sent">{formatUSD(numericAmount)}</Row>
              <Row label="Processing fee">{fee > 0 ? formatUSD(fee) : "None"}</Row>
              <Row label="Credited to wallet">
                <span className="font-semibold text-positive">{formatUSD(credit)}</span>
              </Row>
              <Row label="Sent from">{payerName || "—"}</Row>
              <Row label="Reference">
                <span className="font-mono">{reference || "Auto-generated"}</span>
              </Row>
              <Row label="Proof">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-positive" aria-hidden />
                  {file?.name}
                </span>
              </Row>
              {note.trim() && <Row label="Note">{note}</Row>}
            </dl>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-fill-1 p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <p className="text-[11.5px] leading-relaxed text-muted">
                Your deposit enters the administrator review queue. Approvals credit your USD wallet
                immediately; rejections include a reason and never move funds you have not sent.
              </p>
            </div>
          </div>
        )}

        {/* Payment details panel for step 2 as well */}
        {step === 2 && method && (
          <PaymentDetails method={method} reference={reference} amount={numericAmount} collapsible />
        )}
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-fill-1/60 p-4 pb-safe sm:p-5">
        <Button
          variant="ghost"
          onClick={() => (step === 1 ? undefined : setStep((s) => s - 1))}
          disabled={step === 1 || submitting}
          className={cn(step === 1 && "invisible")}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>

        {step < 4 ? (
          <Button onClick={next} disabled={step === 1 && !method}>
            Continue
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={() => void submit()} disabled={submitting || !file}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin-slow" aria-hidden />
                Submitting…
              </>
            ) : (
              <>
                <Send className="size-4" aria-hidden />
                Submit for review
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------- pieces -------------------------------- */

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted">{description}</p>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border bg-fill-1 px-3 py-2.5">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-faint">{label}</p>
      <p
        className={cn(
          "mt-1 text-[15px] font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "warning" && "text-warning",
          tone === "muted" && "text-muted",
          tone === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** The off-platform payment instructions an administrator configured. */
export function PaymentDetails({
  method,
  reference,
  amount,
  collapsible = false,
}: {
  method: DepositMethod;
  reference?: string;
  amount?: number;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);

  const details = [
    method.bankName && { label: "Institution", value: method.bankName },
    method.accountName && { label: "Account name", value: method.accountName },
    method.accountNumber && { label: paymentLabel(method), value: method.accountNumber },
    {
      label: "Reference",
      value: reference?.trim() || (method.referencePrefix ? `${method.referencePrefix}-…` : "Auto-generated"),
    },
    amount && Number.isFinite(amount) && amount > 0
      ? { label: "Send exactly", value: formatUSD(amount) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="overflow-hidden rounded-xl border border-accent/25 bg-accent-soft/50">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-left",
          collapsible && "cursor-pointer hover:bg-accent-soft"
        )}
      >
        <MethodIcon kind={method.kind} size={26} className="rounded-lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-foreground">
            Payment details — {method.name}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {method.instructions.slice(0, 70) || method.bankName || "Follow the instructions below"}
          </span>
        </span>
        {collapsible && (
          <ArrowRight
            className={cn("size-4 shrink-0 text-faint transition-transform", open && "rotate-90")}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-accent/20 px-4 py-3.5">
          {method.instructions && (
            <p className="text-[12px] leading-relaxed text-muted">{method.instructions}</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {details.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-faint">
                    {d.label}
                  </span>
                  <span className="block truncate font-mono text-[12px] text-foreground">
                    {d.value}
                  </span>
                </span>
                <CopyButton value={d.value} compact />
              </div>
            ))}
          </div>
          {method.feePercent > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-warning">
              <CircleAlert className="size-3.5" aria-hidden />
              A {method.feePercent}% processing fee applies and is deducted before crediting.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function paymentLabel(method: DepositMethod): string {
  switch (method.kind) {
    case "crypto":
      return "Wallet address";
    case "mobile":
      return "Paybill / account";
    case "card":
      return "Payment link";
    default:
      return "Account number";
  }
}
