import "server-only";
import { db } from "../db";
import { newId } from "../ids";
import type { DepositMethod, DepositMethodKind } from "@/lib/types/platform";

/** Deposit methods configured by administrators and offered to users. */

export interface MethodInput {
  name: string;
  kind: DepositMethodKind;
  currency?: string;
  instructions?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  referencePrefix?: string;
  minAmount?: number;
  maxAmount?: number;
  feePercent?: number;
  processingTime?: string;
  enabled?: boolean;
  sortOrder?: number;
}

function map(row: Record<string, unknown>): DepositMethod {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: (row.kind ?? "bank") as DepositMethodKind,
    currency: String(row.currency ?? "USD"),
    instructions: String(row.instructions ?? ""),
    accountName: String(row.account_name ?? ""),
    accountNumber: String(row.account_number ?? ""),
    bankName: String(row.bank_name ?? ""),
    referencePrefix: String(row.reference_prefix ?? ""),
    minAmount: Number(row.min_amount ?? 0),
    maxAmount: Number(row.max_amount ?? 0),
    feePercent: Number(row.fee_percent ?? 0),
    processingTime: String(row.processing_time ?? ""),
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listMethods(includeDisabled = false): DepositMethod[] {
  const rows = db()
    .prepare(
      `SELECT * FROM deposit_methods
        ${includeDisabled ? "" : "WHERE enabled = 1"}
        ORDER BY sort_order ASC, name ASC`
    )
    .all() as Record<string, unknown>[];
  return rows.map(map);
}

export function getMethod(id: string): DepositMethod | null {
  const row = db().prepare("SELECT * FROM deposit_methods WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? map(row) : null;
}

export function createMethod(input: MethodInput): DepositMethod {
  const now = new Date().toISOString();
  const id = newId("mth");
  db()
    .prepare(
      `INSERT INTO deposit_methods
        (id, name, kind, currency, instructions, account_name, account_number, bank_name,
         reference_prefix, min_amount, max_amount, fee_percent, processing_time, enabled,
         sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name.trim(),
      input.kind,
      input.currency ?? "USD",
      input.instructions ?? "",
      input.accountName ?? "",
      input.accountNumber ?? "",
      input.bankName ?? "",
      input.referencePrefix ?? "",
      input.minAmount ?? 10,
      input.maxAmount ?? 100_000,
      input.feePercent ?? 0,
      input.processingTime ?? "Within 1 hour",
      input.enabled === false ? 0 : 1,
      input.sortOrder ?? 0,
      now,
      now
    );
  return getMethod(id)!;
}

export function updateMethod(id: string, patch: Partial<MethodInput>): DepositMethod | null {
  const sets: string[] = ["updated_at = ?"];
  const args: (string | number)[] = [new Date().toISOString()];
  const columns: Record<string, keyof MethodInput> = {
    name: "name",
    kind: "kind",
    currency: "currency",
    instructions: "instructions",
    account_name: "accountName",
    account_number: "accountNumber",
    bank_name: "bankName",
    reference_prefix: "referencePrefix",
    min_amount: "minAmount",
    max_amount: "maxAmount",
    fee_percent: "feePercent",
    processing_time: "processingTime",
    sort_order: "sortOrder",
  };
  for (const [column, key] of Object.entries(columns)) {
    const value = patch[key];
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      args.push(typeof value === "string" ? value.trim() : (value as number));
    }
  }
  if (patch.enabled !== undefined) {
    sets.push("enabled = ?");
    args.push(patch.enabled ? 1 : 0);
  }
  args.push(id);
  db().prepare(`UPDATE deposit_methods SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  return getMethod(id);
}

export function deleteMethod(id: string): void {
  db().prepare("DELETE FROM deposit_methods WHERE id = ?").run(id);
}

export function countEnabledMethods(): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS c FROM deposit_methods WHERE enabled = 1")
    .get() as { c: number };
  return row.c;
}
