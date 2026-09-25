"use client";

import { useState } from "react";
import {
  Bell,
  Gauge,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import {
  useSettings,
  type OrderTypePref,
} from "@/components/providers/settings-provider";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";

const SLIPPAGE_OPTIONS = [
  { value: "0.1", label: "0.1% — tightest" },
  { value: "0.5", label: "0.5% — recommended" },
  { value: "1", label: "1% — volatile markets" },
  { value: "2", label: "2% — aggressive" },
];

const NOTIFICATION_ROWS: {
  key: keyof ReturnType<typeof useSettings>["settings"]["notifications"];
  title: string;
  description: string;
}[] = [
  {
    key: "depositUpdates",
    title: "Deposit & withdrawal updates",
    description: "Approval, rejection and review notes for every funding request.",
  },
  {
    key: "orderFills",
    title: "Order fills",
    description: "Confirmation as soon as a market or limit order executes.",
  },
  {
    key: "priceAlerts",
    title: "Price alerts",
    description: "Alerts for watched markets moving sharply in either direction.",
  },
  {
    key: "productNews",
    title: "Product news",
    description: "New markets, features and platform announcements.",
  },
  {
    key: "weeklyDigest",
    title: "Weekly digest",
    description: "A Monday summary of portfolio performance and open orders.",
  },
];

/** Trading defaults, notification channels and locally stored data. */
export function PreferencesPanel() {
  const { settings, update, updateNotification, reset } = useSettings();
  const { clear, ids } = useWatchlist();
  const { toast } = useToast();

  const [resetOpen, setResetOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Trading defaults</h2>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Applied every time you open the order ticket on the trade screen.
        </p>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted">Default order type</span>
              <Tabs<OrderTypePref>
                ariaLabel="Default order type"
                className="w-full"
                value={settings.defaultOrderType}
                onChange={(v) => update({ defaultOrderType: v })}
                options={[
                  { value: "market", label: "Market" },
                  { value: "limit", label: "Limit" },
                ]}
              />
              <p className="text-[11px] text-faint">
                {settings.defaultOrderType === "market"
                  ? "Market orders fill instantly at the best available price."
                  : "Limit orders only fill at your price or better."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="slippage-select">
                Slippage tolerance
              </label>
              <Select
                ariaLabel="Slippage tolerance"
                value={String(settings.slippage)}
                onChange={(v) => update({ slippage: Number(v) })}
                options={SLIPPAGE_OPTIONS}
              />
              <p className="text-[11px] text-faint">
                Orders beyond {settings.slippage}% slippage are rejected instead of filled.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-foreground">Confirm before placing orders</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-faint">
                Shows a review step with the fee and expected fill before submitting.
              </p>
            </div>
            <Switch
              ariaLabel="Confirm before placing orders"
              checked={settings.confirmOrders}
              onCheckedChange={(v) => update({ confirmOrders: v })}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Bell className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Notifications</h2>
        </div>
        <div>
          {NOTIFICATION_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-6 border-b border-border/60 px-5 py-3.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">{row.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                  {row.description}
                </p>
              </div>
              <Switch
                ariaLabel={row.title}
                checked={settings.notifications[row.key]}
                onCheckedChange={(v) => updateNotification(row.key, v)}
              />
            </div>
          ))}
        </div>
        <p className="border-t border-border px-5 py-3 text-[11px] text-faint">
          Notification preferences are stored on this device. Funding decisions are always delivered
          in-app regardless of these settings.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Local data</h2>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Appearance, trading defaults and your watchlist live in this browser. Your account data —
          balances, deposits and history — is stored on the server and is never affected.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-4" aria-hidden />
            Reset preferences
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWatchlistOpen(true)}
            disabled={ids.length === 0}
          >
            <Trash2 className="size-4" aria-hidden />
            Clear watchlist ({ids.length})
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          reset();
          setResetOpen(false);
          toast({
            title: "Preferences reset",
            description: "Theme, accent and trading defaults are back to their defaults.",
            variant: "info",
          });
        }}
        title="Reset local preferences?"
        confirmLabel="Reset preferences"
        variant="default"
        description={
          <>
            Theme, accent colour, motion, order defaults and notification switches return to their
            original values on this device. Your profile, balances and deposit history are not
            touched.
          </>
        }
      />

      <ConfirmDialog
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        onConfirm={() => {
          clear();
          setWatchlistOpen(false);
          toast({ title: "Watchlist cleared", variant: "info" });
        }}
        title="Clear your watchlist?"
        confirmLabel="Clear watchlist"
        description={
          <>
            Removes all {ids.length} watched market{ids.length === 1 ? "" : "s"} from this device.
          </>
        }
      >
        <p className="flex items-center gap-2 text-[12px] text-muted">
          <Star className="size-3.5 text-warning" aria-hidden />
          You can re-add markets from any price list.
        </p>
      </ConfirmDialog>
    </div>
  );
}
