"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Bell,
  Clock3,
  Loader2,
  Mail,
  Megaphone,
  MessageSquareText,
  Pin,
  ShieldCheck,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useSession } from "@/components/providers/session-provider";
import { useWallet } from "@/components/providers/wallet-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate, timeAgo } from "@/lib/format";
import type { Announcement } from "@/lib/types/platform";

const TAG_STYLES: Record<string, string> = {
  update: "border-accent/25 bg-accent-soft text-accent",
  maintenance: "border-warning/25 bg-warning/10 text-warning",
  market: "border-info/25 bg-info/10 text-info",
  security: "border-negative/25 bg-negative/10 text-negative",
  promotion: "border-positive/25 bg-positive/10 text-positive",
};

const TOPICS = [
  { value: "Deposit not credited", label: "Deposit not credited" },
  { value: "Withdrawal status", label: "Withdrawal status" },
  { value: "Account & verification", label: "Account & verification" },
  { value: "Trading question", label: "Trading question" },
  { value: "Report a bug", label: "Report a bug" },
  { value: "General question", label: "General question" },
];

const FAQS = [
  {
    id: "faq-deposits",
    question: "How do manual deposits work?",
    answer:
      "Open Deposits, choose one of the funding methods published by the team, send the amount from your own bank or wallet, then upload your proof of payment (a screenshot, receipt or PDF up to 6 MB). Your request enters the review queue and you are notified the moment an administrator approves or rejects it.",
  },
  {
    id: "faq-timing",
    question: "How long does a deposit review take?",
    answer:
      "Most requests are reviewed within the processing time shown on the funding method — typically under an hour during business hours. Every method displays its own expected processing time, and you can follow the status of each request under Deposits → History.",
  },
  {
    id: "faq-withdrawals",
    question: "Can I withdraw my funds?",
    answer:
      "Yes, when withdrawals are enabled. Choose a payout method from your Wallet, enter the amount and your destination account or wallet address. The amount is moved into escrow immediately so it cannot be double-spent, then released once the payout is approved. Rejected requests are refunded automatically.",
  },
  {
    id: "faq-trading",
    question: "Are my trades real?",
    answer:
      "Orders settle instantly against your Quantix balances at the quoted price, with a 0.1% fee, and every fill is written to your ledger. Market prices stream from the platform's own simulated feed — no external exchange is involved.",
  },
  {
    id: "faq-security",
    question: "How is my account protected?",
    answer:
      "Passwords are stored as salted scrypt hashes, sessions are cookie-based and expire after 30 days, and every sensitive action — sign-ins, funding reviews, balance adjustments — is written to an audit log reviewed by administrators.",
  },
  {
    id: "faq-local",
    question: "What is stored only in my browser?",
    answer:
      "Appearance (theme, accent, motion), trading defaults, notification switches and your watchlist live in this browser. Balances, deposits, trades and history are stored on the server against your account.",
  },
];

/** Support desk: platform announcements, answers and a real ticket submission. */
export function SupportManager({
  announcements,
  supportEmail,
}: {
  announcements: Announcement[];
  supportEmail: string;
}) {
  const { user } = useSession();
  const { fundRequests } = useWallet();
  const { toast } = useToast();

  const [topic, setTopic] = useState(TOPICS[0].value);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const pending = fundRequests.filter((request) => request.status === "pending");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 10) {
      setFieldError("Please write at least 10 characters so we can help properly.");
      return;
    }

    setSending(true);
    setError(null);
    setFieldError(null);
    try {
      await api("/api/support", {
        method: "POST",
        body: { topic, message: message.trim() },
      });
      setSent(true);
      setMessage("");
      toast({
        title: "Support request sent",
        description: "The team has been notified and will reply to your account.",
        variant: "success",
      });
    } catch (err) {
      const errorMessage =
        err instanceof ApiRequestError ? err.message : "Could not send your message.";
      setError(errorMessage);
      toast({ title: "Message not sent", description: errorMessage, variant: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Platform announcements, answers to the questions we hear most, and a direct line to the Quantix team."
        actions={
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-fill-2 px-4 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-fill-3"
          >
            <Mail className="size-4" aria-hidden />
            {supportEmail}
          </a>
        }
      />

      {pending.length > 0 && (
        <Alert variant="info" title={`${pending.length} funding request(s) under review`}>
          Deposits and withdrawals are processed by an administrator. You can follow each one under{" "}
          <Link href="/deposits" className="font-medium underline underline-offset-2">
            Deposits → History
          </Link>
          .
        </Alert>
      )}

      {/* Announcements */}
      <section aria-labelledby="announcements-title">
        <h2
          id="announcements-title"
          className="flex items-center gap-2 text-[15px] font-semibold text-foreground"
        >
          <Megaphone className="size-4 text-accent" aria-hidden />
          Announcements
          <span className="rounded-full border border-border bg-fill-1 px-2 py-0.5 text-[10px] font-semibold text-muted">
            {announcements.length}
          </span>
        </h2>

        {announcements.length === 0 ? (
          <Card className="mt-3 px-5 py-8 text-center text-[12.5px] text-muted">
            No announcements have been published yet.
          </Card>
        ) : (
          <div className="mt-3 space-y-3">
            {announcements.map((item) => (
              <Card key={item.id} className="flex items-start gap-4 p-5">
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    item.pinned ? "bg-accent shadow-[0_0_8px_var(--accent-glow)]" : "bg-fill-3"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        TAG_STYLES[item.tag] ?? "border-border bg-fill-2 text-muted"
                      )}
                    >
                      {item.tag}
                    </span>
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        <Pin className="size-3" aria-hidden />
                        Pinned
                      </span>
                    )}
                    <h3 className="text-[13.5px] font-semibold text-foreground">{item.title}</h3>
                    <span className="ml-auto text-[11px] text-faint">
                      {formatDate(item.createdAt)} · {timeAgo(new Date(item.createdAt))}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* FAQ */}
        <section aria-labelledby="faq-title">
          <h2
            id="faq-title"
            className="flex items-center gap-2 text-[15px] font-semibold text-foreground"
          >
            <MessageSquareText className="size-4 text-accent" aria-hidden />
            Frequently asked questions
          </h2>
          <Accordion items={FAQS} className="mt-3" />

          <Card className="mt-4 p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <ShieldCheck className="size-4 text-positive" aria-hidden />
              Before you write to us
            </h3>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-muted">
              <li className="flex gap-2">
                <Clock3 className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                Include the reference shown on your deposit (for example QTX-8F3K2A) — it is the
                fastest way for us to locate a payment.
              </li>
              <li className="flex gap-2">
                <ArrowDownToLine className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                Upload proof that shows the sender name, amount, date and destination account.
              </li>
              <li className="flex gap-2">
                <Bell className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                Every funding decision sends you an in-app notification with the reviewer&apos;s note.
              </li>
            </ul>
          </Card>
        </section>

        {/* Contact */}
        <Card>
          <div className="p-5 pb-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Mail className="size-4 text-accent" aria-hidden />
              Contact the team
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Your request is logged and routed to the administrators of this platform.
            </p>
          </div>

          <form className="space-y-4 p-5" onSubmit={submit}>
            {error && <Alert variant="error">{error}</Alert>}

            {sent && !error && (
              <Alert variant="success" title="Message received">
                We logged your request under {topic}. An administrator will follow up through your
                account notifications.
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" value={user.name} readOnly className="opacity-70" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" value={user.email} readOnly className="opacity-70" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Select ariaLabel="Topic" value={topic} onChange={setTopic} options={TOPICS} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setFieldError(null);
                }}
                placeholder="Tell us what happened — include amounts, references and dates where you can."
                className="min-h-[130px]"
                maxLength={2000}
                aria-invalid={Boolean(fieldError)}
              />
              <div className="flex items-center justify-between text-[10.5px]">
                {fieldError ? (
                  <span className="text-negative">{fieldError}</span>
                ) : (
                  <span className="text-faint">Minimum 10 characters</span>
                )}
                <span className="tabular-nums text-faint">{message.length}/2000</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-faint">
                Typical response time: under 24 hours · {supportEmail}
              </p>
              <Button type="submit" disabled={sending}>
                {sending && <Loader2 className="size-4 animate-spin-slow" aria-hidden />}
                {sending ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <p className="text-center text-[11px] text-faint">
        Support requests are recorded in the platform activity log and visible to administrators
        only.
      </p>
    </div>
  );
}

export function SupportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
