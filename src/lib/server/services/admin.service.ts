import "server-only";
import { db, transaction } from "../db";
import * as users from "../repo/users";
import * as wallet from "../repo/wallet";
import * as methods from "../repo/methods";
import * as activity from "../repo/activity";
import * as notifications from "../repo/notifications";
import * as settingsRepo from "../repo/settings";
import { destroyAllSessions, type SessionUser } from "../auth";
import { ApiError } from "../http";
import type { RequestMeta } from "./auth.service";
import type { MethodInput } from "../repo/methods";
import type {
  Announcement,
  DepositMethod,
  PlatformSettings,
  PublicUser,
  UserRole,
} from "@/lib/types/platform";

/**
 * Administrator actions.
 *
 * Each function is a complete unit of work: it mutates data, writes an
 * immutable activity record naming the acting administrator, and notifies the
 * affected user. Guards prevent administrators from locking themselves (or the
 * platform) out of the console.
 */

function assertNotSelf(admin: SessionUser, userId: string, what: string) {
  if (admin.id === userId) {
    throw new ApiError(400, `You cannot ${what} your own account.`);
  }
}

function requireTarget(userId: string): PublicUser {
  const user = users.findById(userId);
  if (!user) throw new ApiError(404, "That account no longer exists.");
  return user;
}

export function setUserStatus(
  admin: SessionUser,
  userId: string,
  status: PublicUser["status"],
  meta: RequestMeta,
  reason = ""
): PublicUser {
  assertNotSelf(admin, userId, "suspend");
  const target = requireTarget(userId);
  const updated = users.updateUser(userId, { status });
  if (!updated) throw new ApiError(500, "Could not update the account.");

  if (status === "suspended") {
    destroyAllSessions(userId);
  }

  activity.logActivity({
    actionKey: "userStatusChanged",
    userId,
    actorId: admin.id,
    summary: `${target.name} was ${status === "suspended" ? "suspended" : "reactivated"} by ${admin.name}${reason ? ` — ${reason}` : ""}`,
    entityType: "user",
    entityId: userId,
    severity: status === "suspended" ? "warning" : "success",
    meta: { status, reason, previous: target.status },
    ...meta,
  });

  notifications.pushNotification({
    userId,
    title: status === "suspended" ? "Account suspended" : "Account reactivated",
    body:
      status === "suspended"
        ? reason || "Your account has been suspended by the compliance team. Contact support for details."
        : "Your account is active again. Welcome back.",
    kind: status === "suspended" ? "error" : "success",
    href: "/support",
  });

  return updated;
}

export function setUserRole(
  admin: SessionUser,
  userId: string,
  role: UserRole,
  meta: RequestMeta
): PublicUser {
  assertNotSelf(admin, userId, "change the role of");
  const target = requireTarget(userId);
  if (target.role === role) return target;

  if (target.role === "admin" && role === "user") {
    const admins = users.countAdmins();
    if (admins <= 1) throw new ApiError(400, "The platform needs at least one administrator.");
  }

  const updated = users.updateUser(userId, { role });
  if (!updated) throw new ApiError(500, "Could not update the account.");
  if (role === "user") destroyAllSessions(userId);

  activity.logActivity({
    actionKey: "userRoleChanged",
    userId,
    actorId: admin.id,
    summary: `${target.name}'s role changed from ${target.role} to ${role} by ${admin.name}`,
    entityType: "user",
    entityId: userId,
    severity: "critical",
    meta: { from: target.role, to: role },
    ...meta,
  });

  notifications.pushNotification({
    userId,
    title: role === "admin" ? "You are now an administrator" : "Administrator access removed",
    body:
      role === "admin"
        ? "Your account was granted access to the Quantix control panel."
        : "Your account no longer has access to the control panel.",
    kind: role === "admin" ? "success" : "warning",
    href: role === "admin" ? "/admin" : "/settings",
  });

  return updated;
}

export function setKycStatus(
  admin: SessionUser,
  userId: string,
  kycStatus: PublicUser["kycStatus"],
  meta: RequestMeta
): PublicUser {
  const target = requireTarget(userId);
  const updated = users.updateUser(userId, { kycStatus });
  if (!updated) throw new ApiError(500, "Could not update the account.");

  activity.logActivity({
    actionKey: "userStatusChanged",
    userId,
    actorId: admin.id,
    summary: `KYC for ${target.name} set to ${kycStatus} by ${admin.name}`,
    entityType: "user",
    entityId: userId,
    meta: { from: target.kycStatus, to: kycStatus },
    ...meta,
  });

  notifications.pushNotification({
    userId,
    title: `Identity verification ${kycStatus}`,
    body:
      kycStatus === "verified"
        ? "Your identity has been verified. Deposit and withdrawal limits are now lifted."
        : kycStatus === "rejected"
          ? "We could not verify your identity. Contact support with a clearer document."
          : `Your verification status is now “${kycStatus}”.`,
    kind: kycStatus === "verified" ? "success" : kycStatus === "rejected" ? "error" : "info",
    href: "/settings",
  });

  return updated;
}

export function adjustBalance(
  admin: SessionUser,
  userId: string,
  asset: string,
  amount: number,
  reason: string,
  meta: RequestMeta
): { balance: number } {
  const target = requireTarget(userId);
  wallet.ensureAssets(userId, [asset]);

  const next = transaction<number>(() => {
    const balance =
      amount >= 0
        ? wallet.credit(userId, asset, amount)
        : wallet.debit(userId, asset, Math.abs(amount));
    db()
      .prepare(
        `INSERT INTO transactions (id, user_id, type, asset, amount, price, fee, status, note, created_at)
         VALUES (?, ?, 'adjustment', ?, ?, 1, 0, 'completed', ?, ?)`
      )
      .run(
        `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        userId,
        asset,
        Math.abs(amount),
        `${amount >= 0 ? "Credit" : "Debit"} by ${admin.name} — ${reason}`,
        new Date().toISOString()
      );
    return balance.amount;
  });

  activity.logActivity({
    actionKey: "balanceAdjusted",
    userId,
    actorId: admin.id,
    summary: `${admin.name} ${amount >= 0 ? "credited" : "debited"} ${Math.abs(amount)} ${asset} ${amount >= 0 ? "to" : "from"} ${target.name}`,
    entityType: "balance",
    entityId: userId,
    severity: "critical",
    meta: { asset, amount, reason, balanceAfter: next },
    ...meta,
  });

  notifications.pushNotification({
    userId,
    title: `${amount >= 0 ? "Credit" : "Debit"} of ${Math.abs(amount)} ${asset}`,
    body: `${reason} — applied by the Quantix operations team.`,
    kind: amount >= 0 ? "success" : "warning",
    href: "/transactions",
  });

  return { balance: next };
}

export function resetUserPassword(
  admin: SessionUser,
  userId: string,
  newPassword: string,
  notifyUser: boolean,
  meta: RequestMeta
): void {
  const target = requireTarget(userId);
  users.setPassword(userId, newPassword);
  destroyAllSessions(userId);

  activity.logActivity({
    actionKey: "passwordReset",
    userId,
    actorId: admin.id,
    summary: `${admin.name} reset the password for ${target.email} (all sessions signed out)`,
    entityType: "user",
    entityId: userId,
    severity: "critical",
    ...meta,
  });

  if (notifyUser) {
    notifications.pushNotification({
      userId,
      title: "Password reset by an administrator",
      body: "Your password was changed and every device was signed out. Sign in with the new password.",
      kind: "warning",
      href: "/settings",
    });
  }
}

export function deleteUser(admin: SessionUser, userId: string, meta: RequestMeta): void {
  assertNotSelf(admin, userId, "delete");
  const target = requireTarget(userId);
  if (target.role === "admin") {
    throw new ApiError(400, "Administrator accounts cannot be deleted. Demote the account first.");
  }

  users.deleteUser(userId);

  activity.logActivity({
    actionKey: "userDeleted",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} deleted the account ${target.email}`,
    entityType: "user",
    entityId: userId,
    severity: "critical",
    meta: { email: target.email, name: target.name },
    ...meta,
  });
}

/* ------------------------------ deposit methods -------------------------- */

export function saveMethod(
  admin: SessionUser,
  input: Partial<MethodInput> & { id?: string },
  meta: RequestMeta
): DepositMethod {
  const { id, ...rest } = input;
  if (id) {
    const before = methods.getMethod(id);
    if (!before) throw new ApiError(404, "Deposit method not found.");
    const updated = methods.updateMethod(id, rest);
    activity.logActivity({
      actionKey: "methodUpdated",
      userId: null,
      actorId: admin.id,
      summary: `${admin.name} updated deposit method “${updated?.name ?? before.name}”`,
      entityType: "method",
      entityId: id,
      meta: { changes: Object.keys(rest), enabled: updated?.enabled },
      ...meta,
    });
    return updated!;
  }

  const created = methods.createMethod(rest as MethodInput);
  activity.logActivity({
    actionKey: "methodCreated",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} created deposit method “${created.name}”`,
    entityType: "method",
    entityId: created.id,
    meta: { kind: created.kind, min: created.minAmount, max: created.maxAmount },
    ...meta,
  });
  return created;
}

export function removeMethod(admin: SessionUser, id: string, meta: RequestMeta): void {
  const method = methods.getMethod(id);
  if (!method) throw new ApiError(404, "Deposit method not found.");
  const pending = db()
    .prepare(
      "SELECT COUNT(*) AS c FROM fund_requests WHERE method_id = ? AND status = 'pending'"
    )
    .get(id) as { c: number };
  if (pending.c > 0) {
    throw new ApiError(
      409,
      `${pending.c} request(s) are still pending against this method. Disable it instead.`
    );
  }
  methods.deleteMethod(id);
  activity.logActivity({
    actionKey: "methodDeleted",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} deleted deposit method “${method.name}”`,
    entityType: "method",
    entityId: id,
    severity: "warning",
    ...meta,
  });
}

/* --------------------------- platform configuration ---------------------- */

export function savePlatformSettings(
  admin: SessionUser,
  patch: Partial<PlatformSettings>,
  meta: RequestMeta
): PlatformSettings {
  const before = settingsRepo.getPlatformSettings();
  const next = settingsRepo.updatePlatformSettings(patch);
  const changes = (Object.keys(patch) as (keyof PlatformSettings)[]).filter(
    (key) => before[key] !== next[key]
  );

  activity.logActivity({
    actionKey: "settingsUpdated",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} updated platform settings (${changes.join(", ") || "no changes"})`,
    entityType: "settings",
    severity: "warning",
    meta: { changes, before: pick(before, changes), after: pick(next, changes) },
    ...meta,
  });

  return next;
}

function pick<T extends object>(obj: T, keys: (keyof T)[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) out[String(key)] = obj[key];
  return out;
}

export function publishAnnouncement(
  admin: SessionUser,
  input: { title: string; body: string; tag?: string; pinned?: boolean; broadcast?: boolean },
  meta: RequestMeta
): Announcement {
  const announcement = settingsRepo.createAnnouncement({
    title: input.title,
    body: input.body,
    tag: input.tag,
    pinned: input.pinned,
  });

  activity.logActivity({
    actionKey: "announcementCreated",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} published “${announcement.title}”`,
    entityType: "announcement",
    entityId: announcement.id,
    ...meta,
  });

  if (input.broadcast !== false) {
    const reached = settingsRepo.broadcast({
      title: announcement.title,
      body: announcement.body.slice(0, 160),
      kind: "info",
      href: "/support",
    });
    activity.logActivity({
      actionKey: "announcementCreated",
      userId: null,
      actorId: admin.id,
      summary: `Announcement pushed to ${reached} account(s)`,
      entityType: "announcement",
      entityId: announcement.id,
      meta: { reached },
      ...meta,
    });
  }

  return announcement;
}

export function removeAnnouncement(admin: SessionUser, id: string, meta: RequestMeta): void {
  settingsRepo.deleteAnnouncement(id);
  activity.logActivity({
    actionKey: "announcementDeleted",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} removed an announcement`,
    entityType: "announcement",
    entityId: id,
    severity: "warning",
    ...meta,
  });
}

/** Broadcast a one-off notification to every user (used from the console). */
export function broadcastMessage(
  admin: SessionUser,
  input: { title: string; body: string; href?: string },
  meta: RequestMeta
): number {
  const reached = settingsRepo.broadcast({
    title: input.title,
    body: input.body,
    href: input.href ?? "/support",
    kind: "info",
  });
  activity.logActivity({
    actionKey: "announcementCreated",
    userId: null,
    actorId: admin.id,
    summary: `${admin.name} broadcast “${input.title}” to ${reached} accounts`,
    entityType: "broadcast",
    meta: { reached, title: input.title },
    ...meta,
  });
  return reached;
}
