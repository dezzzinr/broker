"use client";

import { useState } from "react";
import { Bell, CheckCheck, Mail, MessageSquareText, Megaphone } from "lucide-react";
import { ANNOUNCEMENTS, FAQS } from "@/lib/data/insights";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  Maintenance: "border-warning/25 bg-warning/10 text-warning",
  Product: "border-accent/25 bg-accent-soft text-accent",
  Security: "border-positive/25 bg-positive/10 text-positive",
};

export default function SupportPage() {
  const { toast } = useToast();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("general");

  const unreadCount = ANNOUNCEMENTS.filter((a) => a.unread && !readIds.has(a.id)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Announcements, answers and a direct line to the Quantix team."
        actions={
          <Button
            variant="secondary"
            disabled={unreadCount === 0}
            onClick={() => {
              setReadIds(new Set(ANNOUNCEMENTS.map((a) => a.id)));
              toast({ title: "All announcements marked as read", variant: "success" });
            }}
          >
            <CheckCheck className="size-4" aria-hidden />
            Mark all as read
          </Button>
        }
      />

      {/* Announcements */}
      <section aria-labelledby="announcements-title">
        <h2 id="announcements-title" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Megaphone className="size-4 text-accent" aria-hidden />
          Announcements
          {unreadCount > 0 && (
            <span className="rounded-full bg-negative/15 px-2 py-0.5 text-[10px] font-semibold text-negative">
              {unreadCount} new
            </span>
          )}
        </h2>
        <div className="mt-3 space-y-3">
          {ANNOUNCEMENTS.map((a) => {
            const unread = a.unread && !readIds.has(a.id);
            return (
              <Card
                key={a.id}
                className={cn(
                  "flex items-start gap-4 p-5 transition-colors",
                  unread && "border-accent/25 bg-gradient-to-r from-accent-soft/60 to-transparent"
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    unread ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-white/15"
                  )}
                  aria-label={unread ? "Unread" : "Read"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        CATEGORY_STYLES[a.category]
                      )}
                    >
                      {a.category}
                    </span>
                    <h3 className="text-[13.5px] font-semibold text-foreground">{a.title}</h3>
                    <span className="ml-auto text-[11px] text-faint">{formatDate(a.date)}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{a.body}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* FAQ */}
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <MessageSquareText className="size-4 text-accent" aria-hidden />
            Frequently asked questions
          </h2>
          <Accordion
            items={FAQS.map((f, i) => ({ id: `faq-${i}`, question: f.q, answer: f.a }))}
            className="mt-3"
          />
        </section>

        {/* Contact */}
        <Card>
          <div className="p-5 pb-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Mail className="size-4 text-accent" aria-hidden />
              Contact the team
            </h2>
            <p className="mt-0.5 text-xs text-muted">Typical response time: under 24 hours</p>
          </div>
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              toast({
                title: "Message simulated",
                description: "This demo build does not send real messages — nothing left your browser.",
                variant: "info",
              });
              form.reset();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" name="name" placeholder="Jason Moreau" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" name="email" type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-topic">Topic</Label>
              <Select
                ariaLabel="Topic"
                value={subject}
                onChange={setSubject}
                options={[
                  { value: "general", label: "General question" },
                  { value: "bug", label: "Report a bug" },
                  { value: "feature", label: "Feature request" },
                  { value: "api", label: "API & integrations" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                name="message"
                placeholder="How can we help?"
                required
                minLength={10}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-faint">
                <Bell className="size-3" aria-hidden />
                Demo only — no message is actually sent.
              </p>
              <Button type="submit">Send message</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
