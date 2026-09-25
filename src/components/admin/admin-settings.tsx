"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Construction,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import type { PlatformSettings } from "@/lib/types/platform";

interface FormState {
  platformName: string;
  supportEmail: string;
  registrationsOpen: boolean;
  minDeposit: string;
  maxDeposit: string;
  withdrawalEnabled: boolean;
  autoApproveBelow: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

function toForm(settings: PlatformSettings): FormState {
  return {
    platformName: settings.platformName,
    supportEmail: settings.supportEmail,
    registrationsOpen: settings.registrationsOpen,
    minDeposit: String(settings.minDeposit),
    maxDeposit: String(settings.maxDeposit),
    withdrawalEnabled: settings.withdrawalEnabled,
    autoApproveBelow: String(settings.autoApproveBelow),
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
  };
}

/** Platform-wide configuration: identity, funding rules and maintenance mode. */
export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      else setLoading(true);
      try {
        const data = await api<{ settings: PlatformSettings }>("/api/admin/settings");
        setSettings(data.settings);
        setForm(toForm(data.settings));
        setError(null);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Could not load platform settings.");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!settings || !form) return false;
    return JSON.stringify(toForm(settings)) !== JSON.stringify(form);
  }, [settings, form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function save() {
    if (!form) return;
    const min = Number(form.minDeposit);
    const max = Number(form.maxDeposit);
    const auto = Number(form.autoApproveBelow);

    if (form.platformName.trim().length < 2) {
      setFieldErrors({ platformName: "Enter the platform name traders see." });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.supportEmail.trim())) {
      setFieldErrors({ supportEmail: "Enter a valid support email address." });
      return;
    }
    if (!Number.isFinite(min) || min < 0) {
      setFieldErrors({ minDeposit: "Enter a valid minimum deposit." });
      return;
    }
    if (!Number.isFinite(max) || max <= min) {
      setFieldErrors({ maxDeposit: "The maximum must be greater than the minimum." });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await api<{ settings: PlatformSettings }>("/api/admin/settings", {
        method: "PATCH",
        body: {
          platformName: form.platformName.trim(),
          supportEmail: form.supportEmail.trim(),
          registrationsOpen: form.registrationsOpen,
          minDeposit: min,
          maxDeposit: max,
          withdrawalEnabled: form.withdrawalEnabled,
          autoApproveBelow: Number.isFinite(auto) ? auto : 0,
          maintenanceMode: form.maintenanceMode,
          maintenanceMessage: form.maintenanceMessage.trim(),
        },
      });
      setSettings(data.settings);
      setForm(toForm(data.settings));
      toast({
        title: "Platform settings saved",
        description: data.settings.maintenanceMode
          ? "Maintenance mode is now ON — traders see the banner."
          : "Changes are live across the app.",
        variant: "success",
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError("Could not save platform settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form || !settings) {
    return (
      <Card className="flex items-center justify-center gap-2 py-24 text-[13px] text-muted">
        <Loader2 className="size-4 animate-spin-slow" aria-hidden />
        Loading platform settings…
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title="Platform settings"
        description="Global configuration for funding rules, sign-ups and maintenance. Changes apply to every trader immediately."
        syncing={syncing}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void load(true)} disabled={syncing || saving}>
              <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
              Reload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setForm(toForm(settings))}
              disabled={!dirty || saving}
            >
              <RotateCcw className="size-4" aria-hidden />
              Discard changes
            </Button>
          </>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {form.maintenanceMode && (
        <Alert variant="warning" title="Maintenance mode is enabled">
          {form.maintenanceMessage ||
            "Traders see a maintenance banner across the app until you switch this off."}
        </Alert>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Identity */}
        <Card className="p-5">
          <SectionHeader
            icon={Settings2}
            title="Platform identity"
            description="The name and support address shown throughout the trader app."
          />
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="setting-name">Platform name</Label>
              <Input
                id="setting-name"
                value={form.platformName}
                onChange={(e) => set("platformName", e.target.value)}
                maxLength={40}
                aria-invalid={Boolean(fieldErrors.platformName)}
              />
              {fieldErrors.platformName ? (
                <p className="text-[11px] text-negative">{fieldErrors.platformName}</p>
              ) : (
                <p className="text-[11px] text-faint">Appears in the sidebar, emails and receipts.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="setting-email">Support email</Label>
              <Input
                id="setting-email"
                type="email"
                value={form.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
                aria-invalid={Boolean(fieldErrors.supportEmail)}
              />
              {fieldErrors.supportEmail && (
                <p className="text-[11px] text-negative">{fieldErrors.supportEmail}</p>
              )}
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
              <span className="flex gap-2.5">
                <UserPlus className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <span>
                  <span className="block text-[12.5px] font-medium text-foreground">
                    Registrations open
                  </span>
                  <span className="block text-[11px] text-faint">
                    When off, new sign-ups are rejected with a message from support.
                  </span>
                </span>
              </span>
              <Switch
                ariaLabel="Registrations open"
                checked={form.registrationsOpen}
                onCheckedChange={(v) => set("registrationsOpen", v)}
              />
            </label>
          </div>
        </Card>

        {/* Funding rules */}
        <Card className="p-5">
          <SectionHeader
            icon={BadgeDollarSign}
            title="Funding rules"
            description="Global limits applied to every manual deposit and withdrawal request."
          />
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="setting-min">Minimum deposit</Label>
                <Input
                  id="setting-min"
                  type="number"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  value={form.minDeposit}
                  onChange={(e) => set("minDeposit", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.minDeposit)}
                />
                {fieldErrors.minDeposit && (
                  <p className="text-[11px] text-negative">{fieldErrors.minDeposit}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-max">Maximum deposit</Label>
                <Input
                  id="setting-max"
                  type="number"
                  min={1}
                  step="1"
                  inputMode="decimal"
                  value={form.maxDeposit}
                  onChange={(e) => set("maxDeposit", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.maxDeposit)}
                />
                {fieldErrors.maxDeposit && (
                  <p className="text-[11px] text-negative">{fieldErrors.maxDeposit}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="setting-auto">Auto-approve deposits up to</Label>
              <Input
                id="setting-auto"
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={form.autoApproveBelow}
                onChange={(e) => set("autoApproveBelow", e.target.value)}
              />
              <p className="text-[11px] text-faint">
                {Number(form.autoApproveBelow) > 0
                  ? `Deposits of ${formatUSD(Number(form.autoApproveBelow))} or less are credited instantly without review.`
                  : "Set to 0 to review every deposit manually (recommended)."}
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
              <span className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <span>
                  <span className="block text-[12.5px] font-medium text-foreground">
                    Withdrawals enabled
                  </span>
                  <span className="block text-[11px] text-faint">
                    When off, traders cannot submit withdrawal requests.
                  </span>
                </span>
              </span>
              <Switch
                ariaLabel="Withdrawals enabled"
                checked={form.withdrawalEnabled}
                onCheckedChange={(v) => set("withdrawalEnabled", v)}
              />
            </label>
          </div>
        </Card>

        {/* Maintenance */}
        <Card className="p-5 xl:col-span-2">
          <SectionHeader
            icon={Construction}
            title="Maintenance"
            description="Show a platform-wide notice without taking the console offline. Administrators keep full access."
          />
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
              <span>
                <span className="block text-[12.5px] font-medium text-foreground">
                  Maintenance mode
                </span>
                <span className="block text-[11px] text-faint">
                  Displays a banner at the top of every trader page.
                </span>
              </span>
              <Switch
                ariaLabel="Maintenance mode"
                checked={form.maintenanceMode}
                onCheckedChange={(v) => set("maintenanceMode", v)}
              />
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="setting-maintenance">Maintenance message</Label>
              <Textarea
                id="setting-maintenance"
                value={form.maintenanceMessage}
                onChange={(e) => set("maintenanceMessage", e.target.value)}
                placeholder="We are upgrading our settlement engine. Deposits may take a little longer than usual."
                className="min-h-[80px]"
                maxLength={300}
                disabled={!form.maintenanceMode}
              />
              <p className="text-[11px] text-faint">
                {form.maintenanceMessage.length}/300 characters
                {form.maintenanceMode ? "" : " — enable maintenance mode to publish this message"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-elevated/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:px-6",
          dirty ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-muted">
            <span className="font-semibold text-foreground">Unsaved changes</span> — settings apply
            to every trader as soon as you save.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setForm(toForm(settings))} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin-slow" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Save settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-faint">{description}</p>
      </div>
    </div>
  );
}
