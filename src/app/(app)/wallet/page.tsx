"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Info,
  Wallet as WalletIcon,
  Layers,
  Coins,
} from "lucide-react";
import { DEMO_BALANCES } from "@/lib/data/portfolio";
import { formatAmount, formatUSD } from "@/lib/format";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { CoinIcon } from "@/components/shared/coin-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";

type DialogKind = "deposit" | "withdraw" | "transfer" | null;

const DIALOG_META: Record<"deposit" | "withdraw" | "transfer", { title: string; cta: string }> = {
  deposit: { title: "Deposit funds", cta: "Simulate deposit" },
  withdraw: { title: "Withdraw funds", cta: "Simulate withdrawal" },
  transfer: { title: "Internal transfer", cta: "Simulate transfer" },
};

export default function WalletPage() {
  const { coins, loading } = useLiveMarket();
  const { toast } = useToast();
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);

  const assets = coins.filter((c) => DEMO_BALANCES[c.symbol] !== undefined);
  const totalBalance = assets.reduce(
    (sum, c) => sum + (DEMO_BALANCES[c.symbol] ?? 0) * c.price,
    0
  );
  const available = DEMO_BALANCES.USDT * (coins.find((c) => c.symbol === "USDT")?.price ?? 1);

  const submitDemoAction = (kind: Exclude<DialogKind, null>) => {
    setDialog(null);
    toast({
      title: "Simulation only — nothing was moved",
      description: `The ${kind} flow in Quantix demo does not create real transactions or move any funds.`,
      variant: "warning",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Demo balances across your Quantix account. Deposits, withdrawals and transfers are simulated."
        actions={
          <>
            <Button onClick={() => setDialog("deposit")}>
              <ArrowDownToLine className="size-4" aria-hidden />
              Deposit
            </Button>
            <Button variant="secondary" onClick={() => setDialog("withdraw")}>
              <ArrowUpFromLine className="size-4" aria-hidden />
              Withdraw
            </Button>
            <Button variant="outline" onClick={() => setDialog("transfer")}>
              <ArrowLeftRight className="size-4" aria-hidden />
              Transfer
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Balance" value={loading ? "…" : formatUSD(totalBalance)} icon={WalletIcon} footer="Across all assets" />
        <StatCard label="Available Balance" value={loading ? "…" : formatUSD(available)} icon={Coins} footer="Unlocked for trading" />
        <StatCard label="Assets Held" value={String(assets.length)} icon={Layers} footer="Spot + demo accounts" />
      </div>

      <Card>
        <div className="flex items-center justify-between p-5 pb-1">
          <h2 className="text-[15px] font-semibold text-foreground">Assets</h2>
          <p className="text-[11px] text-faint">Live prices from the simulated feed</p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Asset</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">24H</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((coin) => {
                const amount = DEMO_BALANCES[coin.symbol];
                const value = amount * coin.price;
                return (
                  <TableRow key={coin.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <CoinIcon symbol={coin.symbol} color={coin.color} size={30} />
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{coin.name}</p>
                          <p className="text-[11px] text-faint">{coin.symbol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted">
                      {formatAmount(amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatUSD(coin.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PercentageBadge value={coin.change24h} size="sm" withIcon={false} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatUSD(value)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/trade?coin=${coin.id}`)}
                      >
                        Trade
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Demo action dialogs */}
      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog ? DIALOG_META[dialog].title : ""}
        description={
          <>
            This is a demo interface. No real funds are moved and no transaction record is
            created — the confirmation below is for UI exploration only.
          </>
        }
      >
        {dialog && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitDemoAction(dialog);
            }}
            className="space-y-4"
          >
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/10 p-3.5">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p className="text-xs leading-relaxed text-warning/90">
                Simulated flow — Quantix demo never touches real money or custodial wallets.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wallet-asset">Asset</Label>
              <Input id="wallet-asset" defaultValue="USDT" aria-label="Asset" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wallet-amount">Amount (USD)</Label>
              <Input
                id="wallet-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                inputMode="decimal"
                required
              />
            </div>
            {dialog === "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="wallet-destination">Destination</Label>
                <Input id="wallet-destination" defaultValue="Demo trading account" aria-label="Destination" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button type="submit">{DIALOG_META[dialog].cta}</Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
