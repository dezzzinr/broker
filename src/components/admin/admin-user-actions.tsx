"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  KeyRound,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  Wallet,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import { useSession } from "@/components/providers/session-provider";
import { formatUSD } from "@/lib/format";
import type { AdminUserRow, PublicUser } from "@/lib/types/platform";

type DialogKind = "balance" | "password" | "suspend" | "delete" | "role" | null;

const ASSETS = ["USD", "USDT", "BTC", "ETH", "SOL"];

/**
 * Administrator actions for one account: status, role, KYC, balance
 * adjustments, password resets and deletion — each with its own confirmation
 * step because every action is written to the audit log.
 */
export function AdminUserActions({
  user,
  onChanged,
  align = "end",
  compact = false,
}: {
  user: AdminUserRow | PublicUser;
  onChanged?: () => void;
  align?: "start" | "end";
  compact?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: admin } = useSession();

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Balance form
  const [asset, setAsset] = useState("USD");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);

  const isSelf = admin.id === user.id;
  const suspended = user.status === "suspended";

  function reset() {
    setDialog(null);
    setError(null);
    setAmount("");
    setReason("");
    setNewPassword("");
    setBusy(false);
  }

  async function patch(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body });
      toast({ title: successMessage, description: user.name, variant: "success" });
      reset();
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Action failed.");
      setBusy(false);
    }
  }

  async function adjustBalance() {
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value === 0) {
      setError("Enter a non-zero amount (use a negative number to debit).");
      return;
    }
    if (reason.trim().length < 3) {
      setError("A reason is required — it is shown to the user and stored in the audit log.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ balance: number }>(`/api/admin/users/${user.id}/balance`, {
        method: "POST",
        body: { asset, amount: value, reason: reason.trim() },
      });
      toast({
        title: `${value > 0 ? "Credited" : "Debited"} ${formatUSD(Math.abs(value))} ${asset}`,
        description: `New ${asset} balance: ${result.balance.toLocaleString("en-US", { maximumFractionDigits: 6 })}`,
        variant: "success",
      });
      reset();
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Adjustment failed.");
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      setError("Use at least 8 characters with a letter and a number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${user.id}/password`, {
        method: "POST",
        body: { newPassword, notifyUser },
      });
      toast({
        title: "Password reset",
        description: `${user.name} was signed out of every device.`,
        variant: "success",
      });
      reset();
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Reset failed.");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
      toast({ title: "Account deleted", description: user.email, variant: "warning" });
      reset();
      onChanged?.();
      router.push("/admin/users");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Deletion failed.");
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu
        ariaLabel={`Actions for ${user.name}`}
        align={align}
        contentClassName="w-[230px]"
        triggerClassName={compact ? "size-8" : "size-9"}
        trigger={
          <span className="flex items-center justify-center">
            <MoreHorizontal className="size-4" aria-hidden />
          </span>
        }
      >
        {(close) => (
          <>
            <DropdownItem
              onClick={() => {
                close();
                router.push(`/admin/users/${user.id}`);
              }}
            >
              <FileText className="size-4" aria-hidden />
              Open account file
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                close();
                setAsset("USD");
                setDialog("balance");
              }}
            >
              <Wallet className="size-4" aria-hidden />
              Adjust balance
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                close();
                setDialog("password");
              }}
            >
              <KeyRound className="size-4" aria-hidden />
              Reset password
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              disabled={isSelf}
              onClick={() => {
                close();
                void patch(
                  { status: suspended ? "active" : "suspended" },
                  suspended ? "Account reactivated" : "Account suspended"
                );
              }}
              className={cnDanger(!suspended && !isSelf)}
            >
              {suspended ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <Ban className="size-4" aria-hidden />
              )}
              {suspended ? "Reactivate account" : "Suspend account"}
            </DropdownItem>
            <DropdownItem
              disabled={isSelf}
              onClick={() => {
                close();
                void patch(
                  { role: user.role === "admin" ? "user" : "admin" },
                  user.role === "admin" ? "Administrator access removed" : "Granted administrator access"
                );
              }}
            >
              <ShieldCheck className="size-4" aria-hidden />
              {user.role === "admin" ? "Demote to trader" : "Promote to admin"}
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              className="text-negative hover:bg-negative/10 hover:text-negative"
              disabled={isSelf || user.role === "admin"}
              onClick={() => {
                close();
                setDialog("delete");
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete account
            </DropdownItem>
            {isSelf && (
              <p className="px-2.5 py-2 text-[11px] leading-relaxed text-faint">
                You cannot change your own role, status or delete your own account.
              </p>
            )}
          </>
        )}
      </DropdownMenu>

      {/* Adjust balance */}
      <Dialog
        open={dialog === "balance"}
        onClose={busy ? () => undefined : reset}
        title={`Adjust balance — ${user.name}`}
        description="Credits and debits are recorded in the ledger and attributed to your administrator account."
        footer={
          <>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void adjustBalance()} disabled={busy}>
              Apply adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="adjust-asset">Asset</Label>
              <Select
                ariaLabel="Asset"
                value={asset}
                onChange={setAsset}
                options={ASSETS.map((a) => ({ value: a, label: a }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-amount">Amount (negative to debit)</Label>
              <Input
                id="adjust-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 250 or -250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Textarea
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Goodwill credit for a delayed deposit review"
              className="min-h-[76px]"
            />
          </div>
          {Number.parseFloat(amount) < 0 && (
            <Alert variant="warning">
              Debiting reduces the available balance immediately and cannot be undone — the user is
              notified with your reason.
            </Alert>
          )}
        </div>
      </Dialog>

      {/* Reset password */}
      <Dialog
        open={dialog === "password"}
        onClose={busy ? () => undefined : reset}
        title={`Reset password — ${user.name}`}
        description="The user is signed out of every device and notified unless you disable the notification."
        footer={
          <>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button variant="negative" onClick={() => void resetPassword()} disabled={busy}>
              Reset password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters, letter + number"
              autoComplete="new-password"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Quantix@2026", "Reset!4821", "Support#771"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setNewPassword(suggestion)}
                  className="rounded-full border border-border bg-fill-1 px-2.5 py-1 font-mono text-[10.5px] text-muted hover:border-accent/40 hover:text-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={notifyUser}
              onChange={(e) => setNotifyUser(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Notify the user in-app
          </label>
        </div>
      </Dialog>

      {/* Delete */}
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={reset}
        onConfirm={remove}
        busy={busy}
        title="Delete this account?"
        confirmLabel="Delete permanently"
        description={
          <>
            <span className="font-semibold text-foreground">{user.name}</span> ({user.email}) and
            every related record — balances, funding requests, ledger entries and notifications —
            will be removed. Activity log entries are kept for audit with the account reference
            cleared.
          </>
        }
      >
        {error && <Alert variant="error">{error}</Alert>}
      </ConfirmDialog>
    </>
  );
}

function cnDanger(active: boolean) {
  return active ? "text-warning hover:bg-warning/10 hover:text-warning" : undefined;
}
