"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordField } from "./password-field";
import { AuthShell, AuthSwitchHint } from "./auth-shell";
import { useToast } from "@/components/providers/toast-provider";
import type { PublicUser } from "@/lib/types/platform";

const SAFE_NEXT = /^\/(?!\/)[a-z0-9\-_/]*$/i;

function isSafeNext(value: string | null): value is string {
  return Boolean(value && SAFE_NEXT.test(value) && !value.startsWith("/login"));
}

/** Demo accounts seeded on first run — one tap fills the form. */
const DEMO_ACCOUNTS = [
  {
    label: "Trader",
    email: "jason@quantix.app",
    password: "Demo@12345",
    description: "Full trading account with an open deposit",
  },
  {
    label: "Administrator",
    email: "admin@quantix.app",
    password: "Admin@12345",
    description: "Control panel: users, reviews, activity",
  },
];

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const next = params.get("next");
  const reason = params.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const destination = isSafeNext(next) ? next : "/dashboard";

  async function submit(overrideEmail = email, overridePassword = password) {
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const { user, home } = await api<{ user: PublicUser; home: string }>("/api/auth/login", {
        method: "POST",
        body: {
          email: overrideEmail,
          password: overridePassword,
          remember,
        },
      });
      toast({
        title: `Welcome back, ${user.name.split(" ")[0]}`,
        description:
          user.role === "admin"
            ? "Signed in with administrator access."
            : "Signed in to your trading account.",
        variant: "success",
      });
      router.replace(user.role === "admin" && !isSafeNext(next) ? home : destination);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to Quantix"
      subtitle={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-accent underline-offset-4 hover:underline">
            Create an account
          </Link>{" "}
          in under a minute.
        </>
      }
      footer={
        <div className="space-y-4">
          <AuthSwitchHint text="No account yet?" linkLabel="Sign up free" href="/signup" />

          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              <Sparkles className="size-3.5 text-accent" aria-hidden />
              Demo accounts
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    void submit(account.email, account.password);
                  }}
                  className="group rounded-xl border border-border bg-fill-1 p-3 text-left transition-all hover:border-accent/40 hover:bg-accent-soft disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                    <ShieldCheck className="size-3.5 text-accent" aria-hidden />
                    {account.label}
                    <ArrowRight
                      className="ml-auto size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block font-mono text-[10.5px] text-muted">
                    {account.email}
                  </span>
                  <span className="mt-1 block text-[10.5px] leading-relaxed text-faint">
                    {account.description}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
              Tap a card to sign in instantly. Credentials are seeded on first run — change them
              from Settings before deploying anywhere real.
            </p>
          </div>
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
        {reason === "forbidden" && (
          <Alert variant="warning" title="Administrator access required">
            The control panel is limited to accounts with the administrator role.
          </Alert>
        )}
        {reason === "suspended" && (
          <Alert variant="error" title="Account suspended">
            Contact support@quantix.app to restore access.
          </Alert>
        )}
        {error && !reason && (
          <Alert variant="error" title="Sign-in failed">
            {error}
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
            aria-invalid={Boolean(fields.email)}
            className={fields.email ? "border-negative/60" : undefined}
          />
          {fields.email && <p className="text-[11px] font-medium text-negative">{fields.email}</p>}
        </div>

        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          error={fields.password}
          disabled={submitting}
          hint={
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "Password resets are handled by our team",
                  description:
                    "Message support@quantix.app from your registered address and an administrator will reset it for you.",
                  variant: "info",
                })
              }
              className="text-[11px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Forgot password?
            </button>
          }
        />

        <div className="flex items-center justify-between gap-4 pt-0.5">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={setRemember}
            label="Keep me signed in"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin-slow" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="size-4" aria-hidden />
              Sign in
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
