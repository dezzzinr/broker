import { Bitcoin, CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DepositMethodKind } from "@/lib/types/platform";

export const METHOD_ICONS: Record<DepositMethodKind, LucideIcon> = {
  bank: Landmark,
  crypto: Bitcoin,
  mobile: Smartphone,
  card: CreditCard,
  other: Wallet,
};

export const METHOD_LABELS: Record<DepositMethodKind, string> = {
  bank: "Bank transfer",
  crypto: "Crypto transfer",
  mobile: "Mobile money",
  card: "Card payment",
  other: "Cash / other",
};

export function MethodIcon({
  kind,
  size = 38,
  className,
}: {
  kind: DepositMethodKind;
  size?: number;
  className?: string;
}) {
  const Icon = METHOD_ICONS[kind] ?? Wallet;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} />
    </span>
  );
}
