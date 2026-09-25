import "server-only";
import { db, transaction } from "../db";
import { newId, newReference } from "../ids";
import * as wallet from "./wallet";
import type { DepositMethodKind, FundKind, FundRequest, FundStatus } from "@/lib/types/platform";

/**
 * Fund requests — manual deposits (with proof of payment) and withdrawals.
 * A request is created `pending`; an administrator reviews it and the wallet
 * is only credited inside the approval transaction.
 */

export interface CreateFundInput {
  userId: string;
  kind: FundKind;
  methodId?: string | null;
  methodName: string;
  asset?: string;
  amount: number;
  fee?: number;
  reference?: string;
  payerName?: string;
  destination?: string;
  note?: string;
  proof?: { data: Buffer; mime: string; name: string } | null;
}

function map(row: Record<string, unknown>): FundRequest {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: row.kind as FundKind,
    methodId: (row.method_id as string | null) ?? null,
    methodName: String(row.method_name),
    methodKind: (row.method_kind ?? "other") as DepositMethodKind,
    asset: String(row.asset),
    amount: Number(row.amount),
    fee: Number(row.fee ?? 0),
    credit: Number(row.credit ?? 0),
    status: row.status as FundStatus,
    reference: String(row.reference ?? ""),
    payerName: String(row.payer_name ?? ""),
    destination: String(row.destination ?? ""),
    note: String(row.note ?? ""),
    proofName: (row.proof_name as string | null) ?? null,
    proofMime: (row.proof_mime as string | null) ?? null,
    proofSize: row.proof_size === null ? null : Number(row.proof_size),
    hasProof: row.proof !== null && row.proof !== undefined,
    submittedAt: String(row.submitted_at),
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    reviewerName: (row.reviewer_name as string | null) ?? null,
    reviewNote: String(row.review_note ?? ""),
    user: row.user_email
      ? {
          id: String(row.user_id),
          name: String(row.user_name),
          email: String(row.user_email),
        }
      : undefined,
  };
}

const SELECT_WITH_USER = `
  SELECT f.*, u.name AS user_name, u.email AS user_email, r.name AS reviewer_name,
         m.kind AS method_kind
    FROM fund_requests f
    JOIN users u ON u.id = f.user_id
    LEFT JOIN users r ON r.id = f.reviewed_by
    LEFT JOIN deposit_methods m ON m.id = f.method_id`;

export function createFundRequest(input: CreateFundInput): FundRequest {
  const now = new Date().toISOString();
  const id = newId(input.kind === "deposit" ? "dep" : "wdr");
  const fee = Math.max(0, input.fee ?? 0);
  const credit = Math.max(0, input.amount - fee);
  const reference =
    input.reference?.trim() ||
    newReference(input.kind === "deposit" ? "DEP" : "WDR");

  db()
    .prepare(
      `INSERT INTO fund_requests
        (id, user_id, kind, method_id, method_name, asset, amount, fee, credit, status,
         reference, payer_name, destination, note, proof_mime, proof_name, proof_size, proof,
         submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.userId,
      input.kind,
      input.methodId ?? null,
      input.methodName,
      input.asset ?? "USD",
      input.amount,
      fee,
      credit,
      reference,
      input.payerName ?? "",
      input.destination ?? "",
      input.note ?? "",
      input.proof?.mime ?? null,
      input.proof?.name ?? null,
      input.proof ? input.proof.data.byteLength : null,
      input.proof?.data ?? null,
      now
    );

  return getFundRequest(id)!;
}

export function getFundRequest(id: string): FundRequest | null {
  const row = db()
    .prepare(`${SELECT_WITH_USER} WHERE f.id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? map(row) : null;
}

export interface ListFundsParams {
  userId?: string;
  kind?: FundKind | "all";
  status?: FundStatus | "all";
  query?: string;
  page?: number;
  pageSize?: number;
}

export function listFundRequests(
  params: ListFundsParams = {}
): { rows: FundRequest[]; total: number; pendingValue: number } {
  const { userId, kind = "all", status = "all", query = "", page = 1, pageSize = 20 } = params;
  const where: string[] = [];
  const args: (string | number)[] = [];

  if (userId) {
    where.push("f.user_id = ?");
    args.push(userId);
  }
  if (kind !== "all") {
    where.push("f.kind = ?");
    args.push(kind);
  }
  if (status !== "all") {
    where.push("f.status = ?");
    args.push(status);
  }
  if (query.trim()) {
    where.push("(f.reference LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR f.method_name LIKE ?)");
    const like = `%${query.trim()}%`;
    args.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = (
    db()
      .prepare(
        `SELECT COUNT(*) AS c FROM fund_requests f JOIN users u ON u.id = f.user_id ${whereSql}`
      )
      .get(...args) as { c: number }
  ).c;

  const rows = db()
    .prepare(
      `${SELECT_WITH_USER} ${whereSql}
        ORDER BY CASE f.status WHEN 'pending' THEN 0 ELSE 1 END, f.submitted_at DESC
        LIMIT ? OFFSET ?`
    )
    .all(...args, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

  const pendingValue = (
    db()
      .prepare(
        `SELECT COALESCE(SUM(f.amount), 0) AS v
           FROM fund_requests f JOIN users u ON u.id = f.user_id
          ${where.length ? `WHERE ${where.join(" AND ")} AND` : "WHERE"} f.status = 'pending'`
      )
      .get(...args) as { v: number }
  ).v;

  return { rows: rows.map(map), total, pendingValue };
}

export interface ReviewInput {
  requestId: string;
  reviewerId: string;
  decision: "approved" | "rejected";
  note?: string;
}

export interface ReviewResult {
  request: FundRequest;
  creditedAmount: number;
  transactionId: string | null;
}

/**
 * Approves or rejects a fund request.
 * Approval credits the user's wallet and writes a ledger entry — all inside a
 * single transaction so a request can never be approved twice.
 */
export function reviewFundRequest(input: ReviewInput): ReviewResult {
  const now = new Date().toISOString();
  const result = transaction<ReviewResult>(() => {
    const row = db()
      .prepare("SELECT * FROM fund_requests WHERE id = ?")
      .get(input.requestId) as Record<string, unknown> | undefined;
    if (!row) throw new Error("Request not found");
    if (row.status !== "pending") throw new Error("This request has already been processed");

    const amount = Number(row.credit || row.amount);
    const updated = db()
      .prepare(
        `UPDATE fund_requests
            SET status = ?, reviewed_at = ?, reviewed_by = ?, review_note = ?
          WHERE id = ? AND status = 'pending'`
      )
      .run(input.decision, now, input.reviewerId, input.note ?? "", input.requestId);

    if (updated.changes === 0) throw new Error("This request has already been processed");

    let transactionId: string | null = null;
    // Deposits credit the wallet on approval. Withdrawals were debited when the
    // request was raised, so approval only settles the existing ledger entry.
    if (input.decision === "approved" && row.kind === "deposit") {
      const asset = String(row.asset ?? "USD");
      wallet.credit(String(row.user_id), asset, amount);
      transactionId = `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      db()
        .prepare(
          `INSERT INTO transactions (id, user_id, type, asset, amount, price, fee, status, note, ref_id, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, 'completed', ?, ?, ?)`
        )
        .run(
          transactionId,
          String(row.user_id),
          "deposit",
          asset,
          amount,
          Number(row.fee ?? 0),
          `Deposit via ${row.method_name} · ${row.reference}`,
          String(row.id),
          now
        );
    }

    return {
      request: getFundRequest(input.requestId)!,
      creditedAmount: input.decision === "approved" ? amount : 0,
      transactionId,
    };
  });

  return result;
}

export function getProof(id: string): { data: Buffer; mime: string; name: string } | null {
  const row = db()
    .prepare("SELECT proof, proof_mime, proof_name FROM fund_requests WHERE id = ?")
    .get(id) as { proof: Buffer | null; proof_mime: string | null; proof_name: string | null } | undefined;
  if (!row?.proof) return null;
  return {
    data: Buffer.from(row.proof),
    mime: row.proof_mime ?? "application/octet-stream",
    name: row.proof_name ?? "proof",
  };
}

export function cancelFundRequest(id: string, userId: string): boolean {
  const info = db()
    .prepare(
      `UPDATE fund_requests SET status = 'cancelled', reviewed_at = ?, review_note = 'Cancelled by user'
        WHERE id = ? AND user_id = ? AND status = 'pending'`
    )
    .run(new Date().toISOString(), id, userId);
  return info.changes > 0;
}

export function countPending(kind: FundKind = "deposit"): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS c FROM fund_requests WHERE status = 'pending' AND kind = ?")
    .get(kind) as { c: number };
  return row.c;
}
