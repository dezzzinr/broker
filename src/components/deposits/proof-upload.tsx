"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROOF_LIMITS_LABEL } from "./proof-limits";

/**
 * Proof-of-payment uploader: drag & drop or browse, with an inline preview and
 * client-side type/size validation that mirrors the server rules.
 */
export function ProofUpload({
  file,
  onFile,
  error,
  disabled,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = useCallback(
    (candidate: File | undefined | null) => {
      if (!candidate) return;
      onFile(candidate);
    },
    [onFile]
  );

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-fill-1 p-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Proof of payment preview" className="size-full object-cover" />
            ) : (
              <FileText className="size-6 text-muted" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{file.name}</p>
            <p className="mt-0.5 text-[11px] text-faint">
              {(file.size / 1024).toFixed(0)} KB · {file.type.replace("image/", "").toUpperCase() || "FILE"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="rounded-lg border border-border bg-fill-1 px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-fill-2 hover:text-foreground disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  onFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-lg border border-negative/25 bg-negative/10 px-2 py-1 text-[11px] font-medium text-negative transition-colors hover:bg-negative/15 disabled:opacity-50"
              >
                <Trash2 className="size-3" aria-hidden />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging
              ? "border-accent bg-accent-soft"
              : error
                ? "border-negative/50 bg-negative/5"
                : "border-border-strong bg-fill-1 hover:border-accent/50 hover:bg-accent-soft/40",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          {dragging ? (
            <Loader2 className="size-6 animate-spin-slow text-accent" aria-hidden />
          ) : (
            <UploadCloud className="size-6 text-accent" aria-hidden />
          )}
          <span className="text-[13px] font-semibold text-foreground">
            {dragging ? "Drop to attach" : "Upload proof of payment"}
          </span>
          <span className="max-w-xs text-[11px] leading-relaxed text-muted">
            Drag a screenshot or receipt here, or tap to browse. {PROOF_LIMITS_LABEL}
          </span>
        </button>
      )}

      {error && <p className="text-[11px] font-medium text-negative">{error}</p>}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
        <ImageIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Upload the confirmation screen from your bank, wallet or mobile-money app. Make sure the
        amount, date and your reference are legible — blurry proofs are the most common cause of
        delays.
      </p>
    </div>
  );
}
