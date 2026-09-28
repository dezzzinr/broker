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

export async function signUp(
  input: SignUpInput,
  meta: RequestMeta
): Promise<{
  user: PublicUser;
  token: string;
  expiresAt: Date;
}> {
  const platform = await settingsRepo.getPlatformSettings();
  if (!platform.registrationsOpen) {
    throw new ApiError(403, "Registrations are currently closed. Please contact support.");
  }
  if (await users.emailExists(input.email)) {
    throw new ApiError(409, "An account with that email already exists.", {
      email: "That email is already registered.",
    });
  }

  const user = await users.createUser({
    email: input.email,
    name: input.name,
    password: input.password,
    phone: input.phone,
    country: input.country,
  });

  const { token, expiresAt } = await createSession(user.id, meta.ip, meta.userAgent);
  await users.recordLogin(user.id, meta.ip);

  await activity.logActivity({
    actionKey: "signup",
    userId: user.id,
    summary: `Account created for ${user.email}`,
    entityType: "user",
    entityId: user.id,
    severity: "success",
    meta: { country: user.country, phone: user.phone },
    ...meta,
  });
  await activity.logActivity({
    actionKey: "login",
    userId: user.id,
    summary: "Signed in after registration",
    ...meta,
  });

  await notifications.pushNotification({
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

export async function signIn(
  email: string,
  password: string,
  meta: RequestMeta
): Promise<SignInResult> {
  const lockout = await loginLockout(email, meta.ip);
  if (lockout.locked) {
    throw new ApiError(
      429,
      `Too many failed attempts. Try again in ${Math.ceil(lockout.retryAfter / 60)} minute(s).`
    );
  }

  const account = await users.findByEmail(email);
  const valid = account ? verifyPassword(password, account.passwordHash) : false;

  if (!account || !valid) {
    await registerLoginAttempt(email, meta.ip, false);
    await activity.logActivity({
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
    await registerLoginAttempt(email, meta.ip, false);
    await activity.logActivity({
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

  await clearLoginAttempts(email);
  await registerLoginAttempt(email, meta.ip, true);
  const { token, expiresAt } = await createSession(account.id, meta.ip, meta.userAgent);
  await users.recordLogin(account.id, meta.ip);

  // Never let the credential leave the server — strip the hash before returning.
  const { passwordHash: _hash, ...publicUser } = account;
  void _hash;
  const user = { ...publicUser, sessionId: "" } as SessionUser;
  await activity.logActivity({
    actionKey: "login",
    userId: account.id,
    summary: "Signed in",
    meta: { remember: true },
    ...meta,
  });

  return { user, token, expiresAt };
}

export async function signOut(
  token: string | null,
  user: SessionUser | null,
  meta: RequestMeta
): Promise<void> {
  await destroySession(token);
  if (user) {
    await activity.logActivity({ actionKey: "logout", userId: user.id, summary: "Signed out", ...meta });
  }
}

export async function changePassword(
  user: SessionUser,
  currentPassword: string,
  newPassword: string,
  meta: RequestMeta
): Promise<void> {
  const account = await users.findByEmail(user.email);
  if (!account || !verifyPassword(currentPassword, account.passwordHash)) {
    await activity.logActivity({
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
  await users.setPassword(user.id, newPassword);
  await activity.logActivity({
    actionKey: "passwordChanged",
    userId: user.id,
    summary: "Password changed",
    severity: "critical",
    ...meta,
  });
  await notifications.pushNotification({
    userId: user.id,
    title: "Password changed",
    body: "Your account password was updated. If this wasn't you, contact support immediately.",
    kind: "warning",
    href: "/settings",
  });
}

export async function updateProfile(
  user: SessionUser,
  patch: { name?: string; phone?: string; country?: string },
  meta: RequestMeta
): Promise<PublicUser> {
  const updated = await users.updateUser(user.id, patch);
  if (!updated) throw new ApiError(404, "Account not found.");
  const changed = Object.entries(patch)
    .filter(([, v]) => typeof v === "string" && v !== undefined)
    .map(([k]) => k);
  await activity.logActivity({
    actionKey: "profileUpdated",
    userId: user.id,
    summary: `Updated profile (${changed.join(", ") || "no changes"})`,
    meta: { changed },
    ...meta,
  });
  return updated;
}

export async function countActiveSessions(userId: string): Promise<number> {
  const row = (await db()
    .prepare("SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND expires_at > ?")
    .get(userId, new Date().toISOString())) as { c: number };
  return row.c;
}
