/**
 * Platform domain types — accounts, wallets, fund requests, activity and
 * notifications. Shared by the server repositories, API routes and client UI.
 *
 * These are wire types: nothing here ever contains a password hash or a
 * proof-of-payment blob.
 */

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";
export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: KycStatus;
  phone: string;
  country: string;
  avatarHue: number;
  twoFactor: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
}

/** A user row enriched with aggregate figures for admin tables. */
export interface AdminUserRow extends PublicUser {
  balanceUsd: number;
  depositsUsd: number;
  pendingDeposits: number;
  trades: number;
  lastActivityAt: string | null;
}

export interface Balance {
  asset: string;
  amount: number;
  avgCost: number;
  updatedAt: string;
}

export type DepositMethodKind = "bank" | "crypto" | "mobile" | "card" | "other";

export interface DepositMethod {
  id: string;
  name: string;
  kind: DepositMethodKind;
  currency: string;
  instructions: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  referencePrefix: string;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  processingTime: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type FundKind = "deposit" | "withdrawal";
export type FundStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface FundRequest {
  id: string;
  userId: string;
  kind: FundKind;
  methodId: string | null;
  methodName: string;
  methodKind: DepositMethodKind;
  asset: string;
  amount: number;
  fee: number;
  credit: number;
  status: FundStatus;
  reference: string;
  payerName: string;
  destination: string;
  note: string;
  proofName: string | null;
  proofMime: string | null;
  proofSize: number | null;
  hasProof: boolean;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerName?: string | null;
  reviewNote: string;
  /** Joined for admin views */
  user?: { id: string; name: string; email: string };
}

export type LedgerType =
  | "buy"
  | "sell"
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "adjustment"
  | "reward";

export interface LedgerEntry {
  id: string;
  userId: string;
  type: LedgerType;
  asset: string;
  amount: number;
  price: number;
  fee: number;
  status: "completed" | "pending" | "failed";
  note: string;
  refId: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export type ActivityCategory =
  | "auth"
  | "account"
  | "deposit"
  | "withdrawal"
  | "trade"
  | "admin"
  | "security";

export type ActivitySeverity = "info" | "success" | "warning" | "critical";

export interface ActivityLog {
  id: string;
  userId: string | null;
  actorId: string | null;
  action: string;
  category: ActivityCategory;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown>;
  severity: ActivitySeverity;
  ip: string;
  userAgent: string;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
  actor?: { id: string; name: string; email: string } | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning" | "error";
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  tag: string;
  pinned: boolean;
  published: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  registrationsOpen: boolean;
  minDeposit: number;
  maxDeposit: number;
  withdrawalEnabled: boolean;
  autoApproveBelow: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface PlatformStats {
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  sessionsActive: number;
  pendingDeposits: number;
  pendingValue: number;
  approvedDeposits: number;
  approvedValue: number;
  rejectedDeposits: number;
  withdrawalsPending: number;
  todayActivity: number;
  totalActivity: number;
  tradesToday: number;
  volumeUsd: number;
  signupsByDay: { day: string; count: number }[];
  depositsByDay: { day: string; value: number; count: number }[];
  depositsByMethod: { method: string; value: number; count: number }[];
  depositsByStatus: { status: FundStatus; count: number }[];
}
