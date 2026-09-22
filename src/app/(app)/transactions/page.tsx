"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Gift,
  ShoppingCart,
  Download,
} from "lucide-react";
import type { Transaction, TransactionType } from "@/lib/types";
import { transactionsService } from "@/lib/services";
import { cn } from "@/lib/utils";
import { formatAmount, formatDateTime, formatUSD } from "@/lib/format";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";

type TypeFilter = "all" | "buy" | "sell" | "deposits" | "withdrawals";

const TYPE_ICONS: Record<TransactionType, typeof ShoppingCart> = {
  buy: ShoppingCart,
  sell: ArrowUpFromLine,
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  transfer: ArrowLeftRight,
  reward: Gift,
};

const TYPE_STYLES: Record<TransactionType, string> = {
  buy: "text-positive bg-positive/10 border-positive/20",
  sell: "text-negative bg-negative/10 border-negative/20",
  deposit: "text-info bg-info/10 border-info/20",
  withdrawal: "text-warning bg-warning/10 border-warning/20",
  transfer: "text-muted bg-white/[0.05] border-border",
  reward: "text-accent bg-accent-soft border-accent/25",
};

const FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
  { value: "deposits", label: "Deposits" },
  { value: "withdrawals", label: "Withdrawals" },
];

export default function TransactionsPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [filter, setFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    let cancelled = false;
    transactionsService
      .getTransactions()
      .then((txs) => {
        if (!cancelled) setTransactions(txs);
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!transactions) return [];
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    switch (filter) {
      case "buy":
        return sorted.filter((t) => t.type === "buy");
      case "sell":
        return sorted.filter((t) => t.type === "sell");
      case "deposits":
        return sorted.filter((t) => t.type === "deposit");
      case "withdrawals":
        return sorted.filter((t) => t.type === "withdrawal" || t.type === "transfer");
      default:
        return sorted;
    }
  }, [transactions, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Account activity history. Demo records only — no real funds are ever moved."
        actions={
          <Tooltip content="Export as CSV (demo)">
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: "Export simulated",
                  description: "CSV export is not available in the demo build.",
                  variant: "info",
                })
              }
            >
              <Download className="size-4" aria-hidden />
              Export
            </Button>
          </Tooltip>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<TypeFilter>
          value={filter}
          onChange={setFilter}
          options={FILTER_OPTIONS}
          ariaLabel="Filter transactions"
        />
        {transactions && (
          <p className="text-xs text-faint" aria-live="polite">
            {rows.length} transaction{rows.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-5 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions === null ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      className="border-0 bg-transparent"
                      icon={ArrowLeftRight}
                      title="No transactions here"
                      description="Nothing matches this filter. Try a different type or view all activity."
                      action={
                        <Button variant="secondary" size="sm" onClick={() => setFilter("all")}>
                          View all
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((tx) => {
                  const Icon = TYPE_ICONS[tx.type];
                  const total = tx.amount * tx.price;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="pl-5 whitespace-nowrap tabular-nums text-muted">
                        {formatDateTime(tx.date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                            TYPE_STYLES[tx.type]
                          )}
                        >
                          <Icon className="size-3" aria-hidden />
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{tx.assetSymbol}</span>
                        {tx.note && <span className="ml-2 text-[11px] text-faint">{tx.note}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatAmount(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted">{formatUSD(tx.price)}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">{formatUSD(total)}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <StatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
