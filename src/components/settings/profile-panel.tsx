"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Globe2,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useSession } from "@/components/providers/session-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { useToast } from "@/components/providers/toast-provider";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/lib/types/platform";

const KYC_LABEL: Record<PublicUser["kycStatus"], string> = {
  unverified: "Identity not verified",
  pending: "Verification under review",
  verified: "Identity verified",
  rejected: "Verification rejected",
};

const KYC_STYLE: Record<PublicUser["kycStatus"], string> = {
  verified: "border-positive/25 bg-positive/10 text-positive",
  pending: "border-warning/30 bg-warning/10 text-warning",
  rejected: "border-negative/25 bg-negative/10 text-negative",
  unverified: "border-border bg-fill-2 text-muted",
};

/** Editable account profile, synced with the server-side session. */
export function ProfilePanel() {
  const { user, refresh } = useSession();
  const { settings, update } = useSettings();
  const { toast } = useToast();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [country, setCountry] = useState(user.country ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone ?? "");
    setCountry(user.country ?? "");
  }, [user.name, user.phone, user.country]);

  const dirty =
    name.trim() !== user.name || phone.trim() !== (user.phone ?? "") || country.trim() !== (user.country ?? "");

  async function save() {
    if (name.trim().length < 2) {
      setFieldErrors({ name: "Enter your full name." });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api<{ user: PublicUser }>("/api/auth/account", {
        method: "POST",
        body: {
          intent: "profile",
          name: name.trim(),
          phone: phone.trim(),
          country: country.trim(),
        },
      });
      await refresh();
      update({
        profile: {
          name: name.trim(),
          email: user.email,
          phone: phone.trim(),
          country: country.trim(),
        },
      });
      toast({
        title: "Profile updated",
        description: "Your details are saved to your account.",
        variant: "success",
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError("Could not save your profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Profile</h2>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          These details appear on your funding requests and support tickets.
        </p>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
            <UserAvatar user={user} size={64} />
            <div className="sm:text-center">
              <p className="text-[12.5px] font-semibold text-foreground">{user.name}</p>
              <p className="text-[11px] text-faint">
                Member since {formatDateTime(user.createdAt)}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((p) => ({ ...p, name: "" }));
                  }}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-negative">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email address</Label>
                <Input id="profile-email" value={user.email} readOnly className="opacity-70" />
                <p className="text-[11px] text-faint">
                  Contact support to change the email on your account.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Phone number</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 801 234 5678"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-country">Country of residence</Label>
                <Input
                  id="profile-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Nigeria"
                  autoComplete="country-name"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void save()} disabled={!dirty || saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin-slow" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                Save profile
              </Button>
              {dirty && !saving && (
                <span className="text-[11.5px] text-warning">You have unsaved changes.</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">Verification status</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {KYC_LABEL[user.kycStatus]}.
              {user.kycStatus === "verified"
                ? " You can deposit and withdraw without extra checks."
                : " Some funding limits apply until your identity is verified."}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              KYC_STYLE[user.kycStatus]
            )}
          >
            <BadgeCheck className="size-3.5" aria-hidden />
            {user.kycStatus}
          </span>
        </div>

        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
          <Fact icon={Mail} label="Email" value={user.email} />
          <Fact icon={Phone} label="Phone" value={user.phone || settings.profile.phone || "Not provided"} />
          <Fact icon={Globe2} label="Country" value={user.country || settings.profile.country || "Not provided"} />
        </div>

        {user.role === "admin" && (
          <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-[11.5px] text-accent">
            <ShieldCheck className="size-3.5" aria-hidden />
            This account has administrator access —{" "}
            <a href="/admin" className="underline underline-offset-2">
              open the control centre
            </a>
            .
          </p>
        )}
      </Card>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card px-5 py-3.5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-faint">
        <Icon className="size-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 truncate text-[12.5px] text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}
