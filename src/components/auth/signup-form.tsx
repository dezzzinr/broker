"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { PasswordField, passwordStrength } from "./password-field";
import { AuthShell, AuthSwitchHint } from "./auth-shell";
import { useToast } from "@/components/providers/toast-provider";
import type { PublicUser } from "@/lib/types/platform";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "Switzerland",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Norway",
  "Poland",
  "Portugal",
  "Ireland",
  "Canada",
  "Australia",
  "New Zealand",
  "Singapore",
  "Japan",
  "South Korea",
  "India",
  "United Arab Emirates",
  "Saudi Arabia",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Brazil",
  "Mexico",
  "Argentina",
  "Türkiye",
  "Other",
];

const PERKS = [
  "Manual deposits reviewed by a real operations team",
  "Live markets, AI signals and portfolio analytics",
  "No minimum balance to open an account",
];

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    phone: "",
    acceptTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const strength = passwordStrength(form.password);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const { user } = await api<{ user: PublicUser }>("/api/auth/signup", {
        method: "POST",
        body: { ...form },
      });
      toast({
        title: `Welcome to Quantix, ${user.name.split(" ")[0]}`,
        description: "Your account is ready — make your first deposit to start trading.",
        variant: "success",
      });
      router.replace("/deposits?welcome=1");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("We could not create your account. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for trading, funding and analytics. Verification takes less than a minute."
      footer={
        <div className="space-y-4">
          <AuthSwitchHint text="Already registered?" linkLabel="Sign in instead" href="/login" />
          <p className="text-center text-[10.5px] leading-relaxed text-faint">
            By creating an account you agree to the Quantix terms of service and privacy policy.
            Quantix is a demonstration platform — no real funds are held or moved.
          </p>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
        noValidate
      >
        {error && (
          <Alert variant="error" title="We could not create your account">
            {error}
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Alex Moreau"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.name)}
            className={fields.name ? "border-negative/60" : undefined}
          />
          {fields.name && <p className="text-[11px] font-medium text-negative">{fields.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Email address</Label>
          <Input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.email)}
            className={fields.email ? "border-negative/60" : undefined}
          />
          {fields.email && <p className="text-[11px] font-medium text-negative">{fields.email}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Password"
            value={form.password}
            onChange={(v) => set("password", v)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={fields.password}
            strength={strength}
            disabled={submitting}
          />
          <PasswordField
            label="Confirm password"
            value={form.confirmPassword}
            onChange={(v) => set("confirmPassword", v)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            error={fields.confirmPassword}
            disabled={submitting}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Select
              ariaLabel="Country"
              value={form.country}
              onChange={(v) => set("country", v)}
              options={[
                { value: "", label: "Select your country" },
                ...COUNTRIES.map((c) => ({ value: c, label: c })),
              ]}
              contentClassName="max-h-72"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Phone <span className="text-faint">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 555 0100"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <ul className="space-y-1.5 rounded-xl border border-border bg-fill-1 p-3.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-[12px] text-muted">
              <Check className="mt-0.5 size-3.5 shrink-0 text-positive" aria-hidden />
              {perk}
            </li>
          ))}
        </ul>

        <Checkbox
          id="terms"
          checked={form.acceptTerms}
          onCheckedChange={(v) => set("acceptTerms", v)}
          label={
            <>
              I agree to the{" "}
              <Link href="/support" className="font-medium text-accent underline-offset-2 hover:underline">
                terms of service
              </Link>{" "}
              and privacy policy
            </>
          }
        />
        {fields.acceptTerms && (
          <p className="-mt-2 text-[11px] font-medium text-negative">{fields.acceptTerms}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin-slow" aria-hidden />
              Creating your account…
            </>
          ) : (
            <>
              <UserPlus className="size-4" aria-hidden />
              Create account
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
