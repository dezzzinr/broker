/** Client-safe copy of the server upload limits (see `lib/server/validation`). */
export const PROOF_MAX_BYTES = 6 * 1024 * 1024;
export const PROOF_ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
];
export const PROOF_LIMITS_LABEL = "PNG, JPG, WEBP, GIF, HEIC or PDF up to 6 MB.";

export function validateProof(file: File | null): string | null {
  if (!file) return "Attach your proof of payment to continue.";
  if (file.size === 0) return "That file is empty. Please choose another.";
  if (file.size > PROOF_MAX_BYTES) return "Proof files must be smaller than 6 MB.";
  const type = (file.type || "").toLowerCase();
  if (!PROOF_ALLOWED.includes(type)) return PROOF_LIMITS_LABEL;
  return null;
}
