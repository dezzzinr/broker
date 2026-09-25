"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Megaphone,
  Pin,
  RefreshCcw,
  Send,
  Trash2,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { Announcement } from "@/lib/types/platform";

const TAGS = [
  { value: "update", label: "Product update" },
  { value: "maintenance", label: "Maintenance" },
  { value: "market", label: "Market notice" },
  { value: "security", label: "Security" },
  { value: "promotion", label: "Promotion" },
];

const TAG_STYLE: Record<string, string> = {
  update: "border-info/25 bg-info/10 text-info",
  maintenance: "border-warning/30 bg-warning/10 text-warning",
  market: "border-accent/30 bg-accent-soft text-accent",
  security: "border-negative/25 bg-negative/10 text-negative",
  promotion: "border-positive/25 bg-positive/10 text-positive",
};

/** Publish platform-wide notices and push broadcast notifications to traders. */
export function AdminAnnouncements() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reach, setReach] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [mode, setMode] = useState<"announcement" | "broadcast">("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("update");
  const [pinned, setPinned] = useState(false);
  const [notify, setNotify] = useState(true);
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState<Announcement | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setSyncing(true);
    else setLoading(true);
    try {
      const data = await api<{ announcements: Announcement[] }>("/api/admin/announcements");
      setAnnouncements(data.announcements);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ stats: { activeUsers: number } }>("/api/admin/stats");
        if (!cancelled) setReach(data.stats.activeUsers);
      } catch {
        /* reach estimate is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function publish() {
    if (title.trim().length < 3) {
      setFieldErrors({ title: "Add a headline of at least 3 characters." });
      return;
    }
    const minBody = mode === "broadcast" ? 5 : 10;
    if (body.trim().length < minBody) {
      setFieldErrors({ body: `Write at least ${minBody} characters.` });
      return;
    }

    setSending(true);
    setError(null);
    try {
      if (mode === "broadcast") {
        const result = await api<{ reached: number }>("/api/admin/announcements", {
          method: "POST",
          body: {
            intent: "broadcast",
            title: title.trim(),
            body: body.trim(),
            ...(href.trim() ? { href: href.trim() } : {}),
          },
        });
        toast({
          title: "Broadcast delivered",
          description: `${result.reached.toLocaleString("en-US")} account(s) notified.`,
          variant: "success",
        });
      } else {
        await api<{ announcement: Announcement }>("/api/admin/announcements", {
          method: "POST",
          body: {
            intent: "announcement",
            title: title.trim(),
            body: body.trim(),
            tag,
            pinned,
            broadcast: notify,
          },
        });
        toast({
          title: "Announcement published",
          description: notify ? "Traders were also notified in-app." : "Visible on the notice board.",
          variant: "success",
        });
      }
      setTitle("");
      setBody("");
      setPinned(false);
      setHref("");
      setFieldErrors({});
      await load(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError("Could not publish this message.");
      }
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await api(`/api/admin/announcements?id=${encodeURIComponent(removing.id)}`, {
        method: "DELETE",
      });
      toast({ title: "Announcement removed", description: removing.title, variant: "warning" });
      setRemoving(null);
      await load(true);
    } catch (err) {
      toast({
        title: "Could not remove announcement",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Announcements"
        description="Publish notices to the trader notice board, or push a one-off broadcast notification into every account's inbox."
        syncing={syncing}
        meta={
          reach !== null ? (
            <>
              <span>{announcements.length} published</span>
              <span className="hidden sm:inline">·</span>
              <span>{reach.toLocaleString("en-US")} active accounts would receive a broadcast</span>
            </>
          ) : undefined
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load(true)} disabled={syncing}>
            <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        {/* Composer */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-accent" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Compose</h2>
          </div>

          <Tabs<"announcement" | "broadcast">
            ariaLabel="Message type"
            className="mt-3 w-full"
            value={mode}
            onChange={(v) => {
              setMode(v);
              setFieldErrors({});
              setError(null);
            }}
            options={[
              { value: "announcement", label: "Announcement" },
              { value: "broadcast", label: "Broadcast" },
            ]}
          />

          <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
            {mode === "announcement"
              ? "Announcements stay on the trader notice board and can optionally notify everyone at once."
              : "Broadcasts are delivery-only: a notification lands in every inbox with a link, but nothing is stored on the notice board."}
          </p>

          <div className="mt-4 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="space-y-1.5">
              <Label htmlFor="announcement-title">Headline</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldErrors((p) => ({ ...p, title: "" }));
                }}
                placeholder={
                  mode === "announcement"
                    ? "e.g. New mobile-money deposits are live"
                    : "e.g. Scheduled maintenance Sunday 02:00 UTC"
                }
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.title)}
              />
              {fieldErrors.title && (
                <p className="text-[11px] text-negative">{fieldErrors.title}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea
                id="announcement-body"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setFieldErrors((p) => ({ ...p, body: "" }));
                }}
                placeholder="Explain what changed and what traders should do…"
                className="min-h-[130px]"
                maxLength={mode === "announcement" ? 1200 : 400}
                aria-invalid={Boolean(fieldErrors.body)}
              />
              <div className="flex items-center justify-between text-[10.5px] text-faint">
                {fieldErrors.body ? (
                  <span className="text-negative">{fieldErrors.body}</span>
                ) : (
                  <span>{mode === "announcement" ? "Up to 1200 characters" : "Up to 400 characters"}</span>
                )}
                <span className="tabular-nums">{body.length}</span>
              </div>
            </div>

            {mode === "announcement" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Tag</Label>
                  <Select
                    ariaLabel="Announcement tag"
                    value={tag}
                    onChange={setTag}
                    options={TAGS}
                  />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
                  <span>
                    <span className="block text-[12.5px] font-medium text-foreground">
                      Pin to the top
                    </span>
                    <span className="block text-[11px] text-faint">
                      Pinned notices stay above everything else on the board.
                    </span>
                  </span>
                  <Switch ariaLabel="Pin announcement" checked={pinned} onCheckedChange={setPinned} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
                  <span>
                    <span className="block text-[12.5px] font-medium text-foreground">
                      Also notify every trader
                    </span>
                    <span className="block text-[11px] text-faint">
                      Sends an in-app notification linking to the support desk.
                    </span>
                  </span>
                  <Switch ariaLabel="Notify every trader" checked={notify} onCheckedChange={setNotify} />
                </label>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="announcement-href">Link (optional)</Label>
                <Input
                  id="announcement-href"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="/deposits"
                  maxLength={120}
                />
                <p className="text-[11px] text-faint">
                  Defaults to the support desk. Use an in-app path such as /deposits or /markets.
                </p>
              </div>
            )}

            <Button className="w-full sm:w-auto" onClick={() => void publish()} disabled={sending}>
              {sending ? (
                <Loader2 className="size-4 animate-spin-slow" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {mode === "announcement" ? "Publish announcement" : "Send broadcast"}
            </Button>
          </div>
        </Card>

        {/* Published list */}
        <Card className="overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-foreground">Notice board</h2>
            <span className="text-[11px] text-faint">{announcements.length} total</span>
          </header>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted">
              <Loader2 className="size-4 animate-spin-slow" aria-hidden />
              Loading announcements…
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState
              className="m-4 border-0 bg-transparent"
              icon={Megaphone}
              title="Nothing published yet"
              description="Announcements you publish appear here and on every trader's notice board."
            />
          ) : (
            <ul className="divide-y divide-border">
              {announcements.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            TAG_STYLE[item.tag] ?? "border-border bg-fill-2 text-muted"
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
                        {!item.published && (
                          <span className="rounded-full border border-border bg-fill-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Draft
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 text-[13px] font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-muted">
                        {item.body}
                      </p>
                      <p className="mt-2 text-[10.5px] text-faint">
                        {formatDateTime(item.createdAt)} · {timeAgo(new Date(item.createdAt))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-negative hover:bg-negative/10 hover:text-negative"
                      aria-label={`Delete “${item.title}”`}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => !removeBusy && setRemoving(null)}
        onConfirm={remove}
        busy={removeBusy}
        title="Remove this announcement?"
        confirmLabel="Remove"
        description={
          <>
            “{removing?.title}” disappears from the trader notice board immediately. Notifications
            already delivered stay in traders&apos; inboxes.
          </>
        }
      />
    </div>
  );
}
