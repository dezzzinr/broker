"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  MonitorSmartphone,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatDateTime, timeAgo } from "@/lib/format";

interface SessionRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  ip: string;
  userAgent: string;
  current: boolean;
}

/** Guess a friendly device label from a user-agent string. */
function describeDevice(userAgent: string): { label: string; os: string; icon: typeof Laptop } {
  const ua = userAgent.toLowerCase();
  const os = ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")
    ? "iOS"
    : ua.includes("android")
      ? "Android"
      : ua.includes("mac os")
        ? "macOS"
        : ua.includes("windows")
          ? "Windows"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown device";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome") || ua.includes("chromium")
      ? "Chrome"
      : ua.includes("firefox")
        ? "Firefox"
        : ua.includes("safari")
          ? "Safari"
          : ua.includes("curl") || ua.includes("node")
            ? "API client"
            : "Browser";

  const mobile = ua.includes("mobile") || ua.includes("iphone") || ua.includes("android");
  return {
    label: `${browser} on ${os}`,
    os,
    icon: mobile ? Smartphone : ua.includes("ipad") || ua.includes("tablet") ? MonitorSmartphone : Laptop,
  };
}

function passwordScore(value: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return { score, label: "Weak", tone: "bg-negative" };
  if (score <= 2) return { score, label: "Fair", tone: "bg-warning" };
  if (score <= 3) return { score, label: "Good", tone: "bg-info" };
  return { score, label: "Strong", tone: "bg-positive" };
}

/** Password changes, active sessions and account protection. */
export function SecurityPanel() {
  const { user, signOut } = useSession();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await api<{ sessions: SessionRow[] }>("/api/auth/sessions");
      setSessions(data.sessions);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const strength = passwordScore(newPassword);

  async function changePassword() {
    if (!currentPassword) {
      setFieldErrors({ currentPassword: "Enter your current password." });
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setFieldErrors({
        newPassword: "Use at least 8 characters with one letter and one number.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api("/api/auth/account", {
        method: "POST",
        body: {
          intent: "password",
          currentPassword,
          newPassword,
          confirmPassword,
        },
      });
      toast({
        title: "Password changed",
        description: "Other devices were signed out for your security.",
        variant: "success",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      await loadSessions();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError("Could not change your password.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function revokeOthers() {
    setRevoking(true);
    try {
      const data = await api<{ revoked: number }>("/api/auth/sessions", { method: "DELETE" });
      toast({
        title: "Other devices signed out",
        description: `${data.revoked} session(s) revoked.`,
        variant: "success",
      });
      setRevokeOpen(false);
      await loadSessions();
    } catch (err) {
      toast({
        title: "Could not revoke sessions",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setRevoking(false);
    }
  }

  const otherSessions = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-5">
      {/* Password */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Password</h2>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Changing your password signs every other device out immediately.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void changePassword();
          }}
        >
          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setFieldErrors((p) => ({ ...p, currentPassword: "" }));
                  }}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={Boolean(fieldErrors.currentPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-faint transition-colors hover:bg-fill-2 hover:text-foreground"
                >
                  {showPasswords ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-[11px] text-negative">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, newPassword: "" }));
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.newPassword)}
              />
              {fieldErrors.newPassword && (
                <p className="text-[11px] text-negative">{fieldErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-negative">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {newPassword.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-300",
                      index < strength.score ? strength.tone : "bg-fill-3"
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-faint">
                Strength: <span className="text-muted">{strength.label}</span> — aim for 12+
                characters mixing cases, numbers and symbols.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin-slow" aria-hidden />
              ) : (
                <Lock className="size-4" aria-hidden />
              )}
              Update password
            </Button>
            {(currentPassword || newPassword || confirmPassword) && !saving && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setFieldErrors({});
                  setError(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Sessions */}
      <Card className="overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <MonitorSmartphone className="size-4 text-accent" aria-hidden />
              Active sessions
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {sessionsLoading
                ? "Checking devices…"
                : `${sessions.length} device(s) signed in as ${user.email}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void loadSessions()} disabled={sessionsLoading}>
              <RefreshCcw className={cn("size-4", sessionsLoading && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
            <Button
              variant="negative"
              size="sm"
              onClick={() => setRevokeOpen(true)}
              disabled={otherSessions === 0}
            >
              <Trash2 className="size-4" aria-hidden />
              Sign out others
            </Button>
          </div>
        </header>

        {sessionsLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[12.5px] text-muted">
            <Loader2 className="size-4 animate-spin-slow" aria-hidden />
            Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-5 py-10 text-center text-[12.5px] text-muted">
            No active sessions were returned.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((session) => {
              const device = describeDevice(session.userAgent);
              const Icon = device.icon;
              return (
                <li key={session.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      session.current
                        ? "border-accent/30 bg-accent-soft text-accent"
                        : "border-border bg-fill-1 text-muted"
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-foreground">
                      {device.label}
                      {session.current && (
                        <span className="rounded-full border border-positive/25 bg-positive/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-positive">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {session.ip || "IP unknown"} · last seen {timeAgo(new Date(session.lastSeenAt))}
                    </p>
                    <p className="text-[10.5px] text-faint">
                      Signed in {formatDateTime(session.createdAt)} · expires{" "}
                      {formatDateTime(session.expiresAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Account protection */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Account protection</h2>
        </div>
        <ul className="mt-4 space-y-3 text-[12.5px]">
          <Protection
            ok
            label="Password hashing"
            detail="Your password is stored as a salted scrypt hash — never in plain text."
          />
          <Protection
            ok={Boolean(user.twoFactor)}
            label="Two-factor authentication"
            detail={
              user.twoFactor
                ? "Enabled on this account."
                : "Not enabled. Ask an administrator to enrol this account in 2FA."
            }
          />
          <Protection
            ok={sessions.length <= 2}
            label="Device sessions"
            detail={
              sessions.length <= 2
                ? `${sessions.length} active session(s) — review the list above regularly.`
                : `${sessions.length} active sessions. Consider signing out the ones you do not recognise.`
            }
          />
          <Protection
            ok
            label="Suspicious sign-ins"
            detail="Failed attempts are rate-limited and written to the platform audit log."
          />
        </ul>

        <div className="mt-5 border-t border-border pt-4">
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden />
            Sign out of this device
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => !revoking && setRevokeOpen(false)}
        onConfirm={revokeOthers}
        busy={revoking}
        title="Sign out other devices?"
        confirmLabel={`Revoke ${otherSessions} session(s)`}
        description="Every device except this one is signed out immediately and will need your password to sign back in."
      />
    </div>
  );
}

function Protection({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          ok
            ? "border-positive/30 bg-positive/10 text-positive"
            : "border-warning/30 bg-warning/10 text-warning"
        )}
        aria-hidden
      >
        {ok ? "✓" : "!"}
      </span>
      <span>
        <span className="block font-medium text-foreground">{label}</span>
        <span className="block text-[11.5px] leading-relaxed text-muted">{detail}</span>
      </span>
    </li>
  );
}
