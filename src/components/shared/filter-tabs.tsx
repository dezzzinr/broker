"use client";

import { Tabs } from "@/components/ui/tabs";

export type MarketFilter = "all" | "gainers" | "losers" | "favorites";

const OPTIONS: { value: MarketFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gainers", label: "Gainers" },
  { value: "losers", label: "Losers" },
  { value: "favorites", label: "Favorites" },
];

export function FilterTabs({
  value,
  onChange,
  className,
}: {
  value: MarketFilter;
  onChange: (v: MarketFilter) => void;
  className?: string;
}) {
  return (
    <Tabs<MarketFilter>
      value={value}
      onChange={onChange}
      options={OPTIONS}
      ariaLabel="Filter market list"
      className={className}
      size="sm"
    />
  );
}
