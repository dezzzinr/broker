"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Password input with a visibility toggle and optional strength meter. */
export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete = "current-password",
  hint,
  strength,
  required = true,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  hint?: React.ReactNode;
  /** 0–4 — renders a segmented strength meter when provided. */
  strength?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {hint}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("pr-10", error && "border-negative/60 focus-visible:ring-negative/25")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-faint transition-colors hover:bg-fill-2 hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>

      {strength !== undefined && value.length > 0 && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex flex-1 gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i < strength
                    ? strength <= 1
                      ? "bg-negative"
                      : strength === 2
                        ? "bg-warning"
                        : strength === 3
                          ? "bg-info"
                          : "bg-positive"
                    : "bg-fill-3"
                )}
              />
            ))}
          </div>
          <span className="w-16 text-right text-[10px] font-medium uppercase tracking-wide text-faint">
            {["weak", "fair", "good", "strong"][Math.max(0, strength - 1)] ?? "weak"}
          </span>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="text-[11px] font-medium text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

export function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, Math.max(password.length > 0 ? 1 : 0, score - 1));
}
