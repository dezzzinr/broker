"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MethodIcon, METHOD_LABELS } from "@/components/shared/method-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import type { DepositMethod, DepositMethodKind } from "@/lib/types/platform";

const KIND_OPTIONS = (Object.keys(METHOD_LABELS) as DepositMethodKind[]).map((kind) => ({
  value: kind,
  label: METHOD_LABELS[kind],
}));

const CURRENCIES = ["USD", "USDT", "EUR", "GBP", "NGN", "KES", "ZAR", "GHS", "INR", "BRL"];

interface MethodForm {
  name: string;
  kind: DepositMethodKind;
  currency: string;
  instructions: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  referencePrefix: string;
  minAmount: string;
  maxAmount: string;
  feePercent: string;
  processingTime: string;
  enabled: boolean;
  sortOrder: string;
}

const EMPTY_FORM: MethodForm = {
  name: "",
  kind: "bank",
  currency: "USD",
  instructions: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
  referencePrefix: "",
  minAmount: "10",
  maxAmount: "100000",
  feePercent: "0",
  processingTime: "Within 1 hour",
  enabled: true,
  sortOrder: "0",
};

function toForm(method: DepositMethod): MethodForm {
  return {
    name: method.name,
    kind: method.kind,
    currency: method.currency,
    instructions: method.instructions,
    accountName: method.accountName,
    accountNumber: method.accountNumber,
    bankName: method.bankName,
    referencePrefix: method.referencePrefix,
    minAmount: String(method.minAmount),
    maxAmount: String(method.maxAmount),
    feePercent: String(method.feePercent),
    processingTime: method.processingTime,
    enabled: method.enabled,
    sortOrder: String(method.sortOrder),
  };
}

/** Administrators publish the funding methods traders can deposit through. */
export function AdminMethods() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DepositMethod | null>(null);
  const [form, setForm] = useState<MethodForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState<DepositMethod | null>(null);
  const [deleting, setDeleting] = useState<DepositMethod | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setSyncing(true);
    else setLoading(true);
    try {
      const data = await api<{ methods: DepositMethod[] }>("/api/admin/methods");
      setMethods(data.methods);
    } catch {
      /* keep previous rows */
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enabledCount = useMemo(() => methods.filter((m) => m.enabled).length, [methods]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: String(methods.length) });
    setFormError(null);
    setFieldErrors({});
    setEditorOpen(true);
  }

  function openEdit(method: DepositMethod) {
    setEditing(method);
    setForm(toForm(method));
    setFormError(null);
    setFieldErrors({});
    setEditorOpen(true);
  }

  function set<K extends keyof MethodForm>(key: K, value: MethodForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function save() {
    const min = Number(form.minAmount);
    const max = Number(form.maxAmount);
    if (form.name.trim().length < 2) {
      setFieldErrors({ name: "Give the method a name traders will recognise." });
      return;
    }
    if (!Number.isFinite(min) || min < 0) {
      setFieldErrors({ minAmount: "Enter a valid minimum." });
      return;
    }
    if (!Number.isFinite(max) || max <= min) {
      setFieldErrors({ maxAmount: "The maximum must be greater than the minimum." });
      return;
    }

    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      currency: form.currency.trim().toUpperCase() || "USD",
      instructions: form.instructions.trim(),
      accountName: form.accountName.trim(),
      accountNumber: form.accountNumber.trim(),
      bankName: form.bankName.trim(),
      referencePrefix: form.referencePrefix.trim().toUpperCase(),
      minAmount: min,
      maxAmount: max,
      feePercent: Number(form.feePercent) || 0,
      processingTime: form.processingTime.trim() || "Within 1 hour",
      enabled: form.enabled,
      sortOrder: Number(form.sortOrder) || 0,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api(`/api/admin/methods/${editing.id}`, { method: "PATCH", body: payload });
        toast({ title: "Deposit method updated", description: payload.name, variant: "success" });
      } else {
        await api("/api/admin/methods", { method: "POST", body: payload });
        toast({
          title: "Deposit method published",
          description: `${payload.name} is now ${payload.enabled ? "visible to traders" : "saved as disabled"}.`,
          variant: "success",
        });
      }
      setEditorOpen(false);
      await load(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setFormError("Could not save this deposit method.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(method: DepositMethod) {
    setTogglingId(method.id);
    try {
      await api(`/api/admin/methods/${method.id}`, {
        method: "PATCH",
        body: { enabled: !method.enabled },
      });
      setMethods((prev) =>
        prev.map((m) => (m.id === method.id ? { ...m, enabled: !m.enabled } : m))
      );
      toast({
        title: method.enabled ? "Method hidden from traders" : "Method published",
        description: method.name,
        variant: method.enabled ? "warning" : "success",
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function reorder(method: DepositMethod, delta: -1 | 1) {
    const nextOrder = Math.max(0, method.sortOrder + delta);
    setTogglingId(method.id);
    try {
      await api(`/api/admin/methods/${method.id}`, {
        method: "PATCH",
        body: { sortOrder: nextOrder },
      });
      await load(true);
    } catch {
      toast({ title: "Could not reorder", variant: "error" });
    } finally {
      setTogglingId(null);
    }
  }

  async function removeMethod() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/admin/methods/${deleting.id}`, { method: "DELETE" });
      toast({
        title: "Deposit method removed",
        description: deleting.name,
        variant: "warning",
      });
      setDeleting(null);
      await load(true);
    } catch (err) {
      toast({
        title: "Could not remove method",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  const sorted = useMemo(
    () => [...methods].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [methods]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Deposit methods"
        description="Publish the bank accounts, wallets and mobile-money lines traders send money to. Each method carries its own limits, fee and instructions."
        syncing={syncing}
        meta={`${enabledCount} of ${methods.length} live`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void load(true)} disabled={syncing}>
              <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              New method
            </Button>
          </>
        }
      />

      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-20 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin-slow" aria-hidden />
          Loading deposit methods…
        </Card>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No deposit methods yet"
          description="Traders cannot fund their accounts until you publish at least one method. Start with a bank transfer or a crypto wallet."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Create the first method
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((method) => (
            <Card
              key={method.id}
              className={cn(
                "flex flex-col gap-4 p-5 transition-colors",
                !method.enabled && "border-dashed opacity-80"
              )}
            >
              <div className="flex items-start gap-3">
                <MethodIcon kind={method.kind} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">{method.name}</h2>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide",
                        method.enabled
                          ? "border-positive/25 bg-positive/10 text-positive"
                          : "border-border bg-fill-2 text-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          method.enabled ? "bg-positive" : "bg-faint"
                        )}
                        aria-hidden
                      />
                      {method.enabled ? "Live" : "Hidden"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-faint">
                    {METHOD_LABELS[method.kind]} · {method.currency}
                    {method.bankName ? ` · ${method.bankName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[10.5px] tabular-nums text-faint">
                  #{method.sortOrder}
                </span>
              </div>

              {method.instructions && (
                <p className="whitespace-pre-line rounded-xl border border-border bg-fill-1 p-3 text-[12px] leading-relaxed text-muted">
                  {method.instructions}
                </p>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px] sm:grid-cols-3">
                <Field label="Account name" value={method.accountName || "—"} />
                <Field label="Account / address" value={method.accountNumber || "—"} mono />
                <Field label="Reference prefix" value={method.referencePrefix || "—"} mono />
                <Field
                  label="Limits"
                  value={`${formatUSD(method.minAmount)} – ${formatUSD(method.maxAmount)}`}
                />
                <Field label="Fee" value={method.feePercent > 0 ? `${method.feePercent}%` : "No fee"} />
                <Field label="Processing" value={method.processingTime || "—"} />
              </dl>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Switch
                  ariaLabel={`${method.enabled ? "Disable" : "Enable"} ${method.name}`}
                  checked={method.enabled}
                  disabled={togglingId === method.id}
                  onCheckedChange={() => void toggleEnabled(method)}
                />
                <span className="mr-auto text-[11.5px] text-faint">
                  {method.enabled ? "Visible in the deposit wizard" : "Hidden from traders"}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={togglingId === method.id}
                    onClick={() => void reorder(method, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={togglingId === method.id}
                    onClick={() => void reorder(method, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                </div>

                <Button variant="ghost" size="sm" onClick={() => setPreviewing(method)}>
                  <Eye className="size-4" aria-hidden />
                  Preview
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(method)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-negative hover:bg-negative/10 hover:text-negative"
                  onClick={() => setDeleting(method)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Delete</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit */}
      {editorOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close editor"
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm animate-fade-in"
            onClick={() => !saving && setEditorOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? `Edit ${editing.name}` : "New deposit method"}
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-[var(--shadow-pop)] animate-scale-in"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {editing ? "Edit deposit method" : "New deposit method"}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-faint">
                  Traders see the name, limits, fee and instructions exactly as entered here.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
                aria-label="Close editor"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {formError && <Alert variant="error">{formError}</Alert>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="method-name">Method name</Label>
                  <Input
                    id="method-name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Zenith Bank — Corporate account"
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                  {fieldErrors.name && <FieldError message={fieldErrors.name} />}
                </div>

                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    ariaLabel="Method type"
                    value={form.kind}
                    onChange={(v) => set("kind", v as DepositMethodKind)}
                    options={KIND_OPTIONS}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select
                    ariaLabel="Currency"
                    value={form.currency}
                    onChange={(v) => set("currency", v)}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-account-name">Account / wallet holder</Label>
                  <Input
                    id="method-account-name"
                    value={form.accountName}
                    onChange={(e) => set("accountName", e.target.value)}
                    placeholder="Quantix Markets Ltd"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-account-number">Account number / address</Label>
                  <Input
                    id="method-account-number"
                    value={form.accountNumber}
                    onChange={(e) => set("accountNumber", e.target.value)}
                    placeholder="0123456789 or bc1q…"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-bank">Bank / provider</Label>
                  <Input
                    id="method-bank"
                    value={form.bankName}
                    onChange={(e) => set("bankName", e.target.value)}
                    placeholder="Zenith Bank"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-prefix">Reference prefix</Label>
                  <Input
                    id="method-prefix"
                    value={form.referencePrefix}
                    onChange={(e) => set("referencePrefix", e.target.value)}
                    placeholder="QTX"
                    maxLength={12}
                    className="font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-min">Minimum amount</Label>
                  <Input
                    id="method-min"
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    value={form.minAmount}
                    onChange={(e) => set("minAmount", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.minAmount)}
                  />
                  {fieldErrors.minAmount && <FieldError message={fieldErrors.minAmount} />}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-max">Maximum amount</Label>
                  <Input
                    id="method-max"
                    type="number"
                    min={1}
                    step="1"
                    inputMode="decimal"
                    value={form.maxAmount}
                    onChange={(e) => set("maxAmount", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.maxAmount)}
                  />
                  {fieldErrors.maxAmount && <FieldError message={fieldErrors.maxAmount} />}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-fee">Fee (%)</Label>
                  <Input
                    id="method-fee"
                    type="number"
                    min={0}
                    max={25}
                    step="0.1"
                    inputMode="decimal"
                    value={form.feePercent}
                    onChange={(e) => set("feePercent", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="method-sort">Sort order</Label>
                  <Input
                    id="method-sort"
                    type="number"
                    min={0}
                    step="1"
                    value={form.sortOrder}
                    onChange={(e) => set("sortOrder", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="method-time">Processing time shown to traders</Label>
                  <Input
                    id="method-time"
                    value={form.processingTime}
                    onChange={(e) => set("processingTime", e.target.value)}
                    placeholder="Within 1 hour"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="method-instructions">Instructions</Label>
                  <Textarea
                    id="method-instructions"
                    value={form.instructions}
                    onChange={(e) => set("instructions", e.target.value)}
                    placeholder={
                      form.kind === "crypto"
                        ? "Send USDT (TRC-20) only. Other networks will be lost. Include your reference in the memo."
                        : "Transfer the exact amount and quote your reference. Name the sender must match your account name."
                    }
                    className="min-h-[110px]"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-fill-1 px-3.5 py-3">
                <span>
                  <span className="block text-[12.5px] font-medium text-foreground">
                    Visible to traders
                  </span>
                  <span className="block text-[11px] text-faint">
                    Disabled methods stay in the console but disappear from the deposit wizard.
                  </span>
                </span>
                <Switch
                  ariaLabel="Visible to traders"
                  checked={form.enabled}
                  onCheckedChange={(v) => set("enabled", v)}
                />
              </label>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border bg-card/60 px-5 py-3.5">
              <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin-slow" aria-hidden />}
                {editing ? "Save changes" : "Publish method"}
              </Button>
            </footer>
          </div>
        </div>
      )}

      {/* Trader-facing preview */}
      <ConfirmDialog
        open={Boolean(previewing)}
        onClose={() => setPreviewing(null)}
        onConfirm={() => setPreviewing(null)}
        title="How traders see this"
        confirmLabel="Close"
        cancelLabel="Dismiss"
        variant="default"
        description="This mirrors the deposit wizard card shown on the Deposits page."
      >
        {previewing && (
          <div className="rounded-xl border border-border bg-fill-1 p-4">
            <div className="flex items-start gap-3">
              <MethodIcon kind={previewing.kind} size={42} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {previewing.name}
                </p>
                <p className="text-[11.5px] text-faint">
                  {METHOD_LABELS[previewing.kind]} · {previewing.currency} ·{" "}
                  {previewing.processingTime}
                </p>
              </div>
            </div>
            {previewing.instructions && (
              <p className="mt-3 whitespace-pre-line rounded-lg border border-border bg-elevated p-3 text-[12px] leading-relaxed text-muted">
                {previewing.instructions}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
              <Field label="Send to" value={previewing.accountName || "—"} />
              <Field label="Account" value={previewing.accountNumber || "—"} mono />
              <Field
                label="Limits"
                value={`${formatUSD(previewing.minAmount)} – ${formatUSD(previewing.maxAmount)}`}
              />
              <Field
                label="Fee"
                value={previewing.feePercent > 0 ? `${previewing.feePercent}%` : "No fee"}
              />
            </dl>
            {previewing.referencePrefix && (
              <p className="mt-3 text-[11px] text-faint">
                References are generated as{" "}
                <code className="rounded bg-fill-2 px-1.5 py-px font-mono text-muted">
                  {previewing.referencePrefix}-XXXXXX
                </code>
                .
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>

      {/* Delete */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => !deleteBusy && setDeleting(null)}
        onConfirm={removeMethod}
        busy={deleteBusy}
        title="Delete this deposit method?"
        confirmLabel="Delete method"
        description={
          <>
            <span className="font-semibold text-foreground">{deleting?.name}</span> will be removed
            from the deposit wizard. Existing funding requests keep their recorded details, but
            traders can no longer select this method.
          </>
        }
      />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-[12px] text-foreground",
          mono && "font-mono text-[11.5px]"
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-[11px] text-negative">{message}</p>;
}
