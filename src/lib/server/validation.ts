import "server-only";
import { z } from "zod";

/** Shared validation schemas for the platform API. */

const trimmed = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const signupSchema = z
  .object({
    name: trimmed(2, 60).refine((v) => /\s/.test(v) || v.length >= 2, {
      message: "Enter your full name.",
    }),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Passwords are limited to 128 characters.")
      .refine((v) => /[A-Za-z]/.test(v), "Include at least one letter.")
      .refine((v) => /[0-9]/.test(v), "Include at least one number."),
    confirmPassword: z.string(),
    country: z.string().trim().max(60).optional().default(""),
    phone: z.string().trim().max(32).optional().default(""),
    acceptTerms: z.literal(true, {
      error: "You must accept the terms to create an account.",
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(128),
  remember: z.boolean().optional().default(true),
});

export const profileSchema = z.object({
  name: trimmed(2, 60).optional(),
  phone: z.string().trim().max(32).optional(),
  country: z.string().trim().max(60).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128)
      .refine((v) => /[A-Za-z]/.test(v), "Include at least one letter.")
      .refine((v) => /[0-9]/.test(v), "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const depositSchema = z.object({
  methodId: z.string().min(1, "Choose a deposit method."),
  amount: z.coerce
    .number({ message: "Enter an amount." })
    .positive("Enter an amount greater than zero.")
    .max(1_000_000, "That amount exceeds the platform limit."),
  payerName: trimmed(2, 80),
  reference: z.string().trim().max(64).optional().default(""),
  note: z.string().trim().max(600).optional().default(""),
});

export const withdrawalSchema = z.object({
  methodId: z.string().min(1, "Choose a payout method."),
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  destination: trimmed(4, 160),
  note: z.string().trim().max(600).optional().default(""),
});

export const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(600).optional().default(""),
});

export const methodSchema = z.object({
  name: trimmed(2, 80),
  kind: z.enum(["bank", "crypto", "mobile", "card", "other"]),
  currency: trimmed(2, 12).optional().default("USD"),
  instructions: z.string().trim().max(1200).optional().default(""),
  accountName: z.string().trim().max(120).optional().default(""),
  accountNumber: z.string().trim().max(160).optional().default(""),
  bankName: z.string().trim().max(120).optional().default(""),
  referencePrefix: z.string().trim().max(12).optional().default(""),
  minAmount: z.coerce.number().min(0).max(1_000_000).optional().default(10),
  maxAmount: z.coerce.number().min(1).max(10_000_000).optional().default(100_000),
  feePercent: z.coerce.number().min(0).max(25).optional().default(0),
  processingTime: z.string().trim().max(80).optional().default("Within 1 hour"),
  enabled: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

/** PATCH variant — no defaults, so omitted keys are left untouched. */
export const methodPatchSchema = z.object({
  name: trimmed(2, 80).optional(),
  kind: z.enum(["bank", "crypto", "mobile", "card", "other"]).optional(),
  currency: trimmed(2, 12).optional(),
  instructions: z.string().trim().max(1200).optional(),
  accountName: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(160).optional(),
  bankName: z.string().trim().max(120).optional(),
  referencePrefix: z.string().trim().max(12).optional(),
  minAmount: z.coerce.number().min(0).max(1_000_000).optional(),
  maxAmount: z.coerce.number().min(1).max(10_000_000).optional(),
  feePercent: z.coerce.number().min(0).max(25).optional(),
  processingTime: z.string().trim().max(80).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const adminUserPatchSchema = z
  .object({
    name: trimmed(2, 60).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().max(32).optional(),
    country: z.string().trim().max(60).optional(),
    role: z.enum(["user", "admin"]).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    kycStatus: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
    twoFactor: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

export const balanceAdjustSchema = z.object({
  asset: trimmed(2, 12).transform((v) => v.toUpperCase()),
  amount: z.coerce.number(),
  reason: trimmed(3, 300),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128)
    .refine((v) => /[A-Za-z]/.test(v), "Include at least one letter.")
    .refine((v) => /[0-9]/.test(v), "Include at least one number."),
  notifyUser: z.boolean().optional().default(true),
});

export const platformSettingsSchema = z.object({
  platformName: trimmed(2, 40).optional(),
  supportEmail: z.string().trim().email().optional(),
  registrationsOpen: z.boolean().optional(),
  minDeposit: z.coerce.number().min(0).max(100_000).optional(),
  maxDeposit: z.coerce.number().min(1).max(10_000_000).optional(),
  withdrawalEnabled: z.boolean().optional(),
  autoApproveBelow: z.coerce.number().min(0).max(100_000).optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().trim().max(300).optional(),
});

export const announcementSchema = z.object({
  title: trimmed(3, 120),
  body: trimmed(10, 1200),
  tag: z.string().trim().max(24).optional().default("update"),
  pinned: z.boolean().optional().default(false),
  broadcast: z.boolean().optional().default(true),
});

export const tradeSchema = z.object({
  coinId: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  orderType: z.enum(["market", "limit"]),
  baseAmount: z.coerce.number().positive("Enter an amount."),
  price: z.coerce.number().positive(),
});

export const supportSchema = z.object({
  topic: trimmed(2, 60),
  message: trimmed(10, 2000),
});

/** Accepted proof-of-payment uploads. */
export const PROOF_LIMITS = {
  maxBytes: 6 * 1024 * 1024,
  allowed: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "application/pdf",
  ] as string[],
};

export function validateProofFile(file: File | null): { ok: true } | { ok: false; message: string } {
  if (!file || file.size === 0) return { ok: false, message: "Attach your proof of payment." };
  if (file.size > PROOF_LIMITS.maxBytes)
    return { ok: false, message: "Proof files must be smaller than 6 MB." };
  const type = (file.type || "").toLowerCase();
  if (!PROOF_LIMITS.allowed.includes(type))
    return {
      ok: false,
      message: "Upload a PNG, JPG, WEBP, GIF, HEIC or PDF file.",
    };
  return { ok: true };
}
