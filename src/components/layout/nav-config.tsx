import {
  Activity,
  ArrowLeftRight,
  ArrowDownToLine,
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  PieChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { PublicUser } from "@/lib/types/platform";

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

const TRADER_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Account",
    items: [
      { label: "Portfolio", href: "/portfolio", icon: PieChart },
      { label: "Wallet", href: "/wallet", icon: Wallet },
      { label: "Deposits", href: "/deposits", icon: ArrowDownToLine },
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
    label: "Intelligence",
    items: [
      { label: "Insights", href: "/insights", icon: Lightbulb },
      { label: "Analytics", href: "/analytics", icon: BarChart3, badge: "Beta" },
      { label: "Market Trends", href: "/market-trends", icon: TrendingUp },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** Bottom tab bar for small screens — the five highest-frequency destinations. */
export const MOBILE_TABS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trade", href: "/trade", icon: ArrowLeftRight },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Deposits", href: "/deposits", icon: ArrowDownToLine },
];

export function navGroupsFor(
  user: Pick<PublicUser, "role">,
  counts: { pendingDeposits?: number; support?: number } = {}
): NavGroup[] {
  const groups = TRADER_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.href === "/deposits" && counts.pendingDeposits) {
        return { ...item, count: counts.pendingDeposits };
      }
      if (item.href === "/support" && counts.support) {
        return { ...item, count: counts.support };
      }
      return item;
    }),
  }));

  if (user.role === "admin") {
    groups.push({
      label: "Administration",
      items: [{ label: "Control panel", href: "/admin", icon: ShieldCheck }],
    });
  }

  return groups;
}

export const NAV_GROUPS = TRADER_GROUPS;

/** Admin console navigation (rendered by the admin shell). */
export function adminNavGroups(counts: { pending?: number } = {}): NavGroup[] {
  return [
    {
      label: "Console",
      items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
    },
    {
      label: "Operations",
      items: [
        {
          label: "Deposit reviews",
          href: "/admin/deposits",
          icon: ArrowDownToLine,
          count: counts.pending,
        },
        { label: "Accounts", href: "/admin/users", icon: ShieldCheck },
        { label: "Activity log", href: "/admin/activity", icon: Activity },
        { label: "Ledger", href: "/admin/ledger", icon: ReceiptText },
      ],
    },
    {
      label: "Configuration",
      items: [
        { label: "Deposit methods", href: "/admin/methods", icon: Wallet },
        { label: "Announcements", href: "/admin/announcements", icon: TrendingUp },
        { label: "Platform settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];
}

/** Resolves the active nav item for a pathname. */
export function findNavItem(
  pathname: string,
  groups: NavGroup[] = TRADER_GROUPS
): { group: NavGroup; item: NavItem } | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { group, item };
      }
    }
  }
  return null;
}
