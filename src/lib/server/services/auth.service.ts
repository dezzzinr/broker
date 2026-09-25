import "server-only";
import { db } from "../db";
import { verifyPassword } from "../crypto";
import * as users from "../repo/users";
import * as activity from "../repo/activity";
import * as notifications from "../repo/notifications";
import * as settingsRepo from "../repo/settings";
import { createSession, destroySession, type SessionUser } from "../auth";
import { ApiError, clearLoginAttempts, loginLockout, registerLoginAttempt } from "../http";
import type { PublicUser } from "@/lib/types/platform";

/**
 * Authentication service — the only place accounts are created or verified.
 * Every outcome (success, failure, lockout) is written to the activity log so
 * the admin console can monitor sign-in behaviour across the platform.
 */

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  country?: string;
  phone?: string;
}

export function signUp(input: SignUpInput, meta: RequestMeta): {
  user: PublicUser;
  token: string;
  expiresAt: Date;
} {
  const platform = settingsRepo.getPlatformSettings();
  if (!platform.registrationsOpen) {
    throw new ApiError(403, "Registrations are currently closed. Please contact support.");
  }
  if (users.emailExists(input.email)) {
    throw new ApiError(409, "An account with that email already exists.", {
      email: "That email is already registered.",
    });
  }

  const user = users.createUser({
    email: input.email,
    name: input.name,
    password: input.password,
    phone: input.phone,
    country: input.country,
  });

  const { token, expiresAt } = createSession(user.id, meta.ip, meta.userAgent);
  users.recordLogin(user.id, meta.ip);

  activity.logActivity({
    actionKey: "signup",
    userId: user.id,
    summary: `Account created for ${user.email}`,
    entityType: "user",
    entityId: user.id,
    severity: "success",
    meta: { country: user.country, phone: user.phone },
    ...meta,
  });
  activity.logActivity({
    actionKey: "login",
    userId: user.id,
    summary: "Signed in after registration",
    ...meta,
  });

  notifications.pushNotification({
    userId: user.id,
    title: `Welcome to ${platform.platformName}, ${user.name.split(" ")[0]}`,
    body: "Your account is ready. Make your first deposit to start trading.",
    kind: "success",
    href: "/deposits",
  });

  return { user, token, expiresAt };
}

export interface SignInResult {
  user: SessionUser;
  token: string;
  expiresAt: Date;
}

export function signIn(
  email: string,
  password: string,
  meta: RequestMeta
): SignInResult {
  const lockout = loginLockout(email, meta.ip);
  if (lockout.locked) {
    throw new ApiError(
      429,
      `Too many failed attempts. Try again in ${Math.ceil(lockout.retryAfter / 60)} minute(s).`
    );
  }

  const account = users.findByEmail(email);
  const valid = account ? verifyPassword(password, account.passwordHash) : false;

  if (!account || !valid) {
    registerLoginAttempt(email, meta.ip, false);
    activity.logActivity({
      actionKey: "loginFailed",
      userId: account?.id ?? null,
      actorId: account?.id ?? null,
      summary: account
        ? `Failed sign-in for ${account.email} — incorrect password`
        : `Failed sign-in attempt for unknown email ${email}`,
      severity: "warning",
      meta: { email },
      ...meta,
    });
    // Deliberately generic: never reveal whether the email exists.
    throw new ApiError(401, "Incorrect email or password.", {
      password: "Incorrect email or password.",
    });
  }

  if (account.status !== "active") {
    registerLoginAttempt(email, meta.ip, false);
    activity.logActivity({
      actionKey: "loginFailed",
      userId: account.id,
      summary: `Sign-in blocked — account is ${account.status}`,
      severity: "critical",
      ...meta,
    });
    throw new ApiError(
      403,
      "This account has been suspended. Contact support@quantix.app for assistance."
    );
  }

  clearLoginAttempts(email);
  registerLoginAttempt(email, meta.ip, true);
  const { token, expiresAt } = createSession(account.id, meta.ip, meta.userAgent);
  users.recordLogin(account.id, meta.ip);

  // Never let the credential leave the server — strip the hash before returning.
  const { passwordHash: _hash, ...publicUser } = account;
  void _hash;
  const user = { ...publicUser, sessionId: "" } as SessionUser;
  activity.logActivity({
    actionKey: "login",
    userId: account.id,
    summary: "Signed in",
    meta: { remember: true },
    ...meta,
  });

  return { user, token, expiresAt };
}

export function signOut(
  token: string | null,
  user: SessionUser | null,
  meta: RequestMeta
): void {
  destroySession(token);
  if (user) {
    activity.logActivity({ actionKey: "logout", userId: user.id, summary: "Signed out", ...meta });
  }
}

export function changePassword(
  user: SessionUser,
  currentPassword: string,
  newPassword: string,
  meta: RequestMeta
): void {
  const account = users.findByEmail(user.email);
  if (!account || !verifyPassword(currentPassword, account.passwordHash)) {
    activity.logActivity({
      actionKey: "loginFailed",
      userId: user.id,
      summary: "Password change rejected — current password incorrect",
      severity: "warning",
      ...meta,
    });
    throw new ApiError(401, "Your current password is incorrect.", {
      currentPassword: "Incorrect password.",
    });
  }
  users.setPassword(user.id, newPassword);
  activity.logActivity({
    actionKey: "passwordChanged",
    userId: user.id,
    summary: "Password changed",
    severity: "critical",
    ...meta,
  });
  notifications.pushNotification({
    userId: user.id,
    title: "Password changed",
    body: "Your account password was updated. If this wasn't you, contact support immediately.",
    kind: "warning",
    href: "/settings",
  });
}

export function updateProfile(
  user: SessionUser,
  patch: { name?: string; phone?: string; country?: string },
  meta: RequestMeta
): PublicUser {
  const updated = users.updateUser(user.id, patch);
  if (!updated) throw new ApiError(404, "Account not found.");
  const changed = Object.entries(patch)
    .filter(([, v]) => typeof v === "string" && v !== undefined)
    .map(([k]) => k);
  activity.logActivity({
    actionKey: "profileUpdated",
    userId: user.id,
    summary: `Updated profile (${changed.join(", ") || "no changes"})`,
    meta: { changed },
    ...meta,
  });
  return updated;
}

export function countActiveSessions(userId: string): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND expires_at > ?")
    .get(userId, new Date().toISOString()) as { c: number };
  return row.c;
}
