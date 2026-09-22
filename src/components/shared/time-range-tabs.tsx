"use client";

import { Tabs } from "@/components/ui/tabs";
import type { TimeRange } from "@/lib/types";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1D", label: "1D" },
  { value: "7D", label: "7D" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

export function TimeRangeTabs({
  value,
  onChange,
  className,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
  className?: string;
}) {
  return (
    <Tabs<TimeRange>
      value={value}
      onChange={onChange}
      options={OPTIONS}
      ariaLabel="Select time range"
      className={className}
      size="sm"
    />
  );
}
