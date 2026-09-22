import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  PieChart,
  ReceiptText,
  Settings,
  Star,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Text badge (e.g. "Beta") */
  badge?: string;
  /** Numeric notification badge */
  count?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Account",
    items: [
      { label: "Portfolio", href: "/portfolio", icon: PieChart },
      { label: "Wallet", href: "/wallet", icon: Wallet },
      { label: "Watchlist", href: "/watchlist", icon: Star },
    ],
  },
  {
    label: "Activity",
    items: [
      { label: "Trade", href: "/trade", icon: ArrowLeftRight },
      { label: "Transactions", href: "/transactions", icon: ReceiptText },
    ],
  },
  {
    label: "Others",
    items: [
      { label: "Insights", href: "/insights", icon: Lightbulb },
      { label: "Analytics", href: "/analytics", icon: BarChart3, badge: "Beta" },
      { label: "Market Trends", href: "/market-trends", icon: TrendingUp },
    ],
  },
  {
    label: "Others",
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy, count: 2 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** Resolves the active nav item for a pathname. */
export function findNavItem(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { group, item };
      }
    }
  }
  return null;
}
