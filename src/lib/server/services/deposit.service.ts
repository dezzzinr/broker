import "server-only";
import { db, transaction } from "../db";
import * as funds from "../repo/funds";
import * as methods from "../repo/methods";
import * as wallet from "../repo/wallet";
import * as activity from "../repo/activity";
import * as notifications from "../repo/notifications";
import * as settingsRepo from "../repo/settings";
import type { SessionUser } from "../auth";
import { ApiError } from "../http";
import type { RequestMeta } from "./auth.service";
import { money } from "@/lib/format";
import type { DepositMethod, FundRequest } from "@/lib/types/platform";

/**
 * Manual funding service.
 *
 * Users pick a deposit method configured by an administrator, transfer the
 * money off-platform, then submit proof of payment. Nothing is credited until
 * an administrator reviews the request — approvals, rejections, refunds and
 * ledger entries all happen inside a single transaction.
 */

export interface SubmitDepositInput {
  methodId: string;
  amount: number;
  payerName: string;
  reference?: string;
  note?: string;
  proof: { data: Buffer; mime: string; name: string } | null;
}

export function getEnabledMethods(): DepositMethod[] {
  return methods.listMethods(false);
}

export function calculateFee(method: DepositMethod, amount: number) {
  const fee = Math.round(amount * (method.feePercent / 100) * 100) / 100;
  return { fee, credit: Math.round((amount - fee) * 100) / 100 };
}

export function submitDeposit(
  user: SessionUser,
  input: SubmitDepositInput,
  meta: RequestMeta
): FundRequest {
  const platform = settingsRepo.getPlatformSettings();
  const method = methods.getMethod(input.methodId);

  if (!method || !method.enabled) {
    throw new ApiError(400, "That deposit method is no longer available.", {
      methodId: "Choose another deposit method.",
    });
  }
  if (!input.proof) {
    throw new ApiError(400, "Attach your proof of payment to submit the deposit.", {
      proof: "Proof of payment is required.",
    });
  }
  if (input.amount < Math.max(method.minAmount, platform.minDeposit)) {
    throw new ApiError(
      400,
      `The minimum deposit for ${method.name} is ${money(Math.max(method.minAmount, platform.minDeposit))}.`,
      { amount: "Amount is below the minimum." }
    );
  }
  if (input.amount < 0 || input.amount > Math.min(method.maxAmount, platform.maxDeposit)) {
    throw new ApiError(
      400,
      `The maximum deposit for ${method.name} is ${money(Math.min(method.maxAmount, platform.maxDeposit))}.`,
      { amount: "Amount exceeds the limit." }
    );
  }

  const pendingCount = funds.listFundRequests({
    userId: user.id,
    kind: "deposit",
    status: "pending",
    pageSize: 50,
  }).total;
  if (pendingCount >= 5) {
    throw new ApiError(
      429,
      "You already have 5 deposits awaiting review. Please wait for them to be processed."
    );
  }

  const { fee, credit } = calculateFee(method, input.amount);

  const request = funds.createFundRequest({
    userId: user.id,
    kind: "deposit",
    methodId: method.id,
    methodName: method.name,
    asset: "USD",
    amount: input.amount,
    fee,
    reference: input.reference,
    payerName: input.payerName,
    note: input.note,
    proof: input.proof,
  });

  activity.logActivity({
    actionKey: "depositSubmitted",
    userId: user.id,
    summary: `Submitted a ${money(request.amount)} deposit via ${method.name}`,
    entityType: "deposit",
    entityId: request.id,
    severity: "warning",
    meta: {
      amount: request.amount,
      fee,
      credit,
      method: method.name,
      reference: request.reference,
      proof: request.proofName,
    },
    ...meta,
  });

  notifications.pushNotification({
    userId: user.id,
    title: "Deposit submitted for review",
    body: `${money(request.amount)} via ${method.name} · reference ${request.reference}. Our team reviews deposits ${method.processingTime.toLowerCase()}.`,
    kind: "info",
    href: "/deposits",
  });

  notifyAdmins({
    title: "New deposit awaiting review",
    body: `${user.name} submitted ${money(request.amount)} via ${method.name} (${request.reference}).`,
    href: "/admin/deposits",
    kind: "warning",
  });

  // Optional fast-path: administrators can auto-credit small deposits.
  if (platform.autoApproveBelow > 0 && request.amount <= platform.autoApproveBelow) {
    const admin = findSystemReviewer();
    if (admin) {
      return approveDeposit(
        admin,
        request.id,
        { ip: "system", userAgent: "quantix auto-approval" },
        `Auto-approved (below ${money(platform.autoApproveBelow)})`
      );
    }
  }

  return request;
}

export interface ReviewContext extends RequestMeta {
  admin: SessionUser;
}

/** Minimal actor shape — an administrator or the automated review bot. */
export interface Reviewer {
  id: string;
  name: string;
  email?: string;
}

function findSystemReviewer(): Reviewer | null {
  const row = db()
    .prepare("SELECT id, name, email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1")
    .get() as { id: string; name: string; email: string } | undefined;
  return row ?? null;
}

export function approveDeposit(
  reviewer: Reviewer,
  requestId: string,
  meta: RequestMeta,
  note = ""
): FundRequest {
  const before = funds.getFundRequest(requestId);
  if (!before) throw new ApiError(404, "Deposit request not found.");
  if (before.status !== "pending")
    throw new ApiError(409, `This request was already ${before.status}.`);

  const result = funds.reviewFundRequest({
    requestId,
    reviewerId: reviewer.id,
    decision: "approved",
    note,
  });

  activity.logActivity({
    actionKey: before.kind === "deposit" ? "depositApproved" : "withdrawalApproved",
    userId: before.userId,
    actorId: reviewer.id,
    summary: `${before.kind === "deposit" ? "Deposit" : "Withdrawal"} of ${money(result.creditedAmount || before.amount)} approved by ${reviewer.name}`,
    entityType: before.kind,
    entityId: before.id,
    severity: "success",
    meta: {
      amount: before.amount,
      credited: result.creditedAmount,
      reference: before.reference,
      method: before.methodName,
      reviewer: reviewer.email ?? reviewer.name,
      note,
    },
    ...meta,
  });

  notifications.pushNotification({
    userId: before.userId,
    title:
      before.kind === "deposit"
        ? `Deposit approved — ${money(result.creditedAmount)} credited`
        : `Withdrawal approved — ${money(before.amount)}`,
    body:
      before.kind === "deposit"
        ? `Your ${before.methodName} deposit (${before.reference}) has been credited to your USD balance.`
        : `Your payout to ${before.destination || before.methodName} has been released.`,
    kind: "success",
    href: before.kind === "deposit" ? "/wallet" : "/deposits",
  });

  return result.request;
}

export function rejectDeposit(
  reviewer: Reviewer,
  requestId: string,
  meta: RequestMeta,
  note: string
): FundRequest {
  const before = funds.getFundRequest(requestId);
  if (!before) throw new ApiError(404, "Request not found.");
  if (before.status !== "pending")
    throw new ApiError(409, `This request was already ${before.status}.`);
  if (!note.trim())
    throw new ApiError(400, "Add a reason so the user knows what to fix.", {
      note: "A rejection reason is required.",
    });

  const result = funds.reviewFundRequest({
    requestId,
    reviewerId: reviewer.id,
    decision: "rejected",
    note,
  });

  // Withdrawals escrow funds at submission — refund them when rejected.
  if (before.kind === "withdrawal") {
    transaction(() => {
      wallet.credit(before.userId, before.asset, before.amount);
      db()
        .prepare(
          `UPDATE transactions SET status = 'failed', note = ? WHERE ref_id = ? AND type = 'withdrawal'`
        )
        .run(`Withdrawal rejected — ${note}`, before.id);
    });
  }

  activity.logActivity({
    actionKey: before.kind === "deposit" ? "depositRejected" : "withdrawalRejected",
    userId: before.userId,
    actorId: reviewer.id,
    summary: `${before.kind === "deposit" ? "Deposit" : "Withdrawal"} of ${money(before.amount)} rejected by ${reviewer.name}`,
    entityType: before.kind,
    entityId: before.id,
    severity: "warning",
    meta: { amount: before.amount, reference: before.reference, reason: note, reviewer: reviewer.email ?? reviewer.name },
    ...meta,
  });

  notifications.pushNotification({
    userId: before.userId,
    title:
      before.kind === "deposit"
        ? `Deposit rejected — ${before.reference}`
        : `Withdrawal rejected — ${before.reference}`,
    body: note,
    kind: "error",
    href: "/deposits",
  });

  return result.request;
}

export function cancelDeposit(user: SessionUser, requestId: string, meta: RequestMeta): void {
  const request = funds.getFundRequest(requestId);
  if (!request || request.userId !== user.id) throw new ApiError(404, "Request not found.");
  if (request.status !== "pending")
    throw new ApiError(409, `This request was already ${request.status}.`);

  const cancelled = funds.cancelFundRequest(requestId, user.id);
  if (!cancelled) throw new ApiError(409, "This request could not be cancelled.");

  if (request.kind === "withdrawal") {
    transaction(() => {
      wallet.credit(user.id, request.asset, request.amount);
      db()
        .prepare(
          `UPDATE transactions SET status = 'failed', note = ? WHERE ref_id = ? AND type = 'withdrawal'`
        )
        .run("Withdrawal cancelled by user", request.id);
    });
  }

  activity.logActivity({
    actionKey: "depositCancelled",
    userId: user.id,
    summary: `Cancelled ${request.kind} ${request.reference} (${money(request.amount)})`,
    entityType: request.kind,
    entityId: request.id,
    severity: "warning",
    ...meta,
  });
}

/* ------------------------------- withdrawals ---------------------------- */

export function submitWithdrawal(
  user: SessionUser,
  input: { methodId: string; amount: number; destination: string; note?: string },
  meta: RequestMeta
): FundRequest {
  const platform = settingsRepo.getPlatformSettings();
  if (!platform.withdrawalEnabled) {
    throw new ApiError(403, "Withdrawals are temporarily disabled. Please try again later.");
  }
  const method = methods.getMethod(input.methodId);
  if (!method) throw new ApiError(400, "Unknown payout method.");

  const held = wallet.getAmount(user.id, "USD");
  if (held + 1e-9 < input.amount) {
    throw new ApiError(
      400,
      `Insufficient USD balance — you can withdraw up to ${money(held)}.`,
      { amount: "Amount exceeds your available balance." }
    );
  }

  const { fee } = calculateFee(method, input.amount);

  const request = transaction<FundRequest>(() => {
    // Escrow: funds leave the wallet immediately so they cannot be double-spent.
    wallet.debit(user.id, "USD", input.amount);
    const created = funds.createFundRequest({
      userId: user.id,
      kind: "withdrawal",
      methodId: method.id,
      methodName: method.name,
      asset: "USD",
      amount: input.amount,
      fee,
      destination: input.destination,
      note: input.note,
      proof: null,
    });
    db()
      .prepare(
        `INSERT INTO transactions (id, user_id, type, asset, amount, price, fee, status, note, ref_id, created_at)
         VALUES (?, ?, 'withdrawal', 'USD', ?, 1, ?, 'pending', ?, ?, ?)`
      )
      .run(
        created.id.replace("dep_", "tx_").replace("wdr_", "tx_"),
        user.id,
        created.amount,
        fee,
        `Withdrawal via ${method.name} · ${created.reference}`,
        created.id,
        new Date().toISOString()
      );
    return created;
  });

  activity.logActivity({
    actionKey: "withdrawalSubmitted",
    userId: user.id,
    summary: `Requested a ${money(request.amount)} withdrawal to ${request.destination}`,
    entityType: "withdrawal",
    entityId: request.id,
    severity: "warning",
    meta: { amount: request.amount, destination: request.destination, method: method.name },
    ...meta,
  });

  notifications.pushNotification({
    userId: user.id,
    title: "Withdrawal requested",
    body: `${money(request.amount)} to ${request.destination} is awaiting administrator approval.`,
    kind: "info",
    href: "/deposits",
  });

  notifyAdmins({
    title: "Withdrawal awaiting approval",
    body: `${user.name} requested ${money(request.amount)} to ${request.destination}.`,
    href: "/admin/deposits?kind=withdrawal",
    kind: "warning",
  });

  return request;
}

/* --------------------------------- helpers ------------------------------- */

/** Pushes a notification to every active administrator. */
export function notifyAdmins(input: {
  title: string;
  body?: string;
  href?: string;
  kind?: "info" | "success" | "warning" | "error";
}): number {
  const admins = db()
    .prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'")
    .all() as { id: string }[];
  for (const admin of admins) {
    notifications.pushNotification({
      userId: admin.id,
      title: input.title,
      body: input.body,
      href: input.href,
      kind: input.kind ?? "info",
    });
  }
  return admins.length;
}

export function pendingReviewCount(): number {
  return funds.countPending("deposit") + funds.countPending("withdrawal");
}
