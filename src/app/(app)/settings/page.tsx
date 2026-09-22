"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Palette,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import {
  useSettings,
  type AccentName,
} from "@/components/providers/settings-provider";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ACCENTS: { value: AccentName; label: string; swatch: string }[] = [
  { value: "violet", label: "Violet", swatch: "#8B5CF6" },
  { value: "blue", label: "Blue", swatch: "#4F8CFF" },
  { value: "emerald", label: "Emerald", swatch: "#2DD4A7" },
  { value: "amber", label: "Amber", swatch: "#F59E0B" },
];

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border/60 px-5 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update, updateNotification, reset } = useSettings();
  const { clear } = useWatchlist();
  const { toast } = useToast();

  const [name, setName] = useState(settings.profile.name);
  const [email, setEmail] = useState(settings.profile.email);
  const [slippage, setSlippage] = useState(String(settings.slippage));
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setName(settings.profile.name);
    setEmail(settings.profile.email);
  }, [settings.profile.name, settings.profile.email]);

  useEffect(() => {
    setSlippage(String(settings.slippage));
  }, [settings.slippage]);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Profile, appearance and trading preferences. Changes are saved to this browser." />

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <UserRound className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Profile</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex size-14 items-center justify-center rounded-full bg-gradient-accent text-lg font-semibold text-white shadow-[0_0_20px_-4px_var(--accent-glow)]"
            >
              {name.trim().charAt(0).toUpperCase() || "Q"}
            </span>
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-name">Display name</Label>
                <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                update({ profile: { name: name.trim() || "Jason Moreau", email: email.trim() } });
                toast({ title: "Profile saved", description: "Stored locally in your browser.", variant: "success" });
              }}
            >
              <Save className="size-4" aria-hidden />
              Save profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Palette className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Appearance</h2>
        </div>
        <SettingsRow title="Accent color" description="Used across buttons, charts and glowing accents.">
          <div role="radiogroup" aria-label="Accent color" className="flex items-center gap-2">
            {ACCENTS.map((a) => {
              const active = settings.accent === a.value;
              return (
                <button
                  key={a.value}
                  role="radio"
                  aria-checked={active}
                  aria-label={`${a.label} accent`}
                  onClick={() => update({ accent: a.value })}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 transition-all",
                    active ? "scale-110 border-white/60" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: a.swatch }}
                >
                  {active && <Check className="size-3.5 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </SettingsRow>
        <SettingsRow
          title="Dark theme"
          description="Quantix is designed dark-first — the recommended experience."
        >
          <span className="rounded-full border border-positive/25 bg-positive/10 px-2.5 py-1 text-[11px] font-medium text-positive">
            Active
          </span>
        </SettingsRow>
        <SettingsRow
          title="Reduce motion"
          description="Minimizes animations, including live number transitions and card entrances."
        >
          <Switch
            ariaLabel="Reduce motion"
            checked={settings.reduceMotion}
            onCheckedChange={(v) => update({ reduceMotion: v })}
          />
        </SettingsRow>
      </Card>

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Bell className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Notifications</h2>
        </div>
        <SettingsRow title="Price alerts" description="Notify when watchlist coins move beyond your thresholds.">
          <Switch
            ariaLabel="Price alerts"
            checked={settings.notifications.priceAlerts}
            onCheckedChange={(v) => updateNotification("priceAlerts", v)}
          />
        </SettingsRow>
        <SettingsRow title="Order fills" description="Confirmations when demo orders are simulated as filled.">
          <Switch
            ariaLabel="Order fills"
            checked={settings.notifications.orderFills}
            onCheckedChange={(v) => updateNotification("orderFills", v)}
          />
        </SettingsRow>
        <SettingsRow title="Weekly digest" description="A Monday summary of markets and your portfolio.">
          <Switch
            ariaLabel="Weekly digest"
            checked={settings.notifications.weeklyDigest}
            onCheckedChange={(v) => updateNotification("weeklyDigest", v)}
          />
        </SettingsRow>
        <SettingsRow title="Product news" description="Occasional updates about new Quantix features.">
          <Switch
            ariaLabel="Product news"
            checked={settings.notifications.productNews}
            onCheckedChange={(v) => updateNotification("productNews", v)}
          />
        </SettingsRow>
      </Card>

      {/* Security */}
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Shield className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Security</h2>
        </div>
        <SettingsRow
          title="Two-factor authentication"
          description="Require a one-time code at sign-in. Simulated in the demo build."
        >
          <Switch
            ariaLabel="Two-factor authentication"
            checked={settings.twoFactor}
            onCheckedChange={(v) => {
              update({ twoFactor: v });
              toast({
                title: v ? "2FA enabled (simulated)" : "2FA disabled",
                description: "Demo build — no authenticator is enrolled.",
                variant: "info",
              });
            }}
          />
        </SettingsRow>
        <SettingsRow
          title="Active sessions"
          description="1 device · Chrome on macOS · Zürich, CH · current session"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({
                title: "Sessions revoked (simulated)",
                description: "Other devices would be signed out in production.",
                variant: "info",
              })
            }
          >
            Revoke others
          </Button>
        </SettingsRow>
        <SettingsRow title="Change password" description="Passwords are not processed in the demo build.">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({
                title: "Password flows are disabled",
                description: "This demo does not handle credentials.",
                variant: "info",
              })
            }
          >
            Change
          </Button>
        </SettingsRow>
      </Card>

      {/* Trading preferences */}
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Wand2 className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Trading preferences</h2>
        </div>
        <SettingsRow title="Default order type" description="Pre-selected when you open the trade panel.">
          <Select
            ariaLabel="Default order type"
            value={settings.defaultOrderType}
            onChange={(v) => update({ defaultOrderType: v as "market" | "limit" })}
            options={[
              { value: "market", label: "Market" },
              { value: "limit", label: "Limit" },
            ]}
            className="w-36"
          />
        </SettingsRow>
        <SettingsRow title="Slippage tolerance" description="Maximum acceptable deviation for market orders.">
          <div className="flex items-center gap-2">
            <Input
              aria-label="Slippage tolerance percent"
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-20 text-right"
            />
            <span className="text-[13px] text-muted">%</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const v = Math.min(5, Math.max(0.1, Number.parseFloat(slippage) || 0.5));
                setSlippage(String(v));
                update({ slippage: v });
                toast({ title: "Slippage tolerance saved", description: `${v}%`, variant: "success" });
              }}
            >
              Save
            </Button>
          </div>
        </SettingsRow>
        <SettingsRow
          title="Confirm orders before submitting"
          description="Show a review dialog before placing demo orders."
        >
          <Switch
            ariaLabel="Confirm orders before submitting"
            checked={settings.confirmOrders}
            onCheckedChange={(v) => update({ confirmOrders: v })}
          />
        </SettingsRow>
      </Card>

      {/* Reset */}
      <Card className="border-negative/20">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <RotateCcw className="size-4 text-negative" aria-hidden />
              Reset local data
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted">
              Clears saved settings and your watchlist from this browser. Mock market data is
              unaffected.
            </p>
          </div>
          <Button variant="negative" onClick={() => setResetOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            Reset
          </Button>
        </div>
      </Card>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset local data?"
        description="Your saved preferences and watchlist will be restored to defaults. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="negative"
              onClick={() => {
                reset();
                clear();
                setResetOpen(false);
                toast({ title: "Local data reset", description: "Settings and watchlist restored to defaults.", variant: "success" });
              }}
            >
              Reset everything
            </Button>
          </>
        }
      />
    </div>
  );
}
