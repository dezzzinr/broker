"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { PublicUser } from "@/lib/types/platform";

/**
 * Client-side view of the server session.
 *
 * The signed-in user is resolved on the server (RSC guard) and handed to this
 * provider, so client components never have to fetch it to render. `refresh()`
 * re-reads `/api/auth/me` after profile or balance changes.
 */

interface MeResponse {
  user: PublicUser;
  unreadNotifications: number;
  sessions: number;
  pendingReviews: number | null;
}

interface SessionApi {
  user: PublicUser;
  isAdmin: boolean;
  firstName: string;
  unreadNotifications: number;
  pendingReviews: number;
  setUnread: (value: number) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  signingOut: boolean;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({
  user: initialUser,
  pendingReviews: initialPending = 0,
  unread: initialUnread = 0,
  children,
}: {
  user: PublicUser;
  pendingReviews?: number;
  unread?: number;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  const [unread, setUnread] = useState(initialUnread);
  const [pending, setPending] = useState(initialPending);
  const [signingOut, setSigningOut] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api<MeResponse>("/api/auth/me");
      setUser(data.user);
      setUnread(data.unreadNotifications);
      setPending(data.pendingReviews ?? 0);
    } catch {
      // A failed refresh must never log the user out of the UI.
    }
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      // Full navigation so every server component re-renders unauthenticated.
      window.location.href = "/login?signedOut=1";
    }
  }, []);

  const value = useMemo<SessionApi>(
    () => ({
      user,
      isAdmin: user.role === "admin",
      firstName: user.name.split(" ")[0] || user.name,
      unreadNotifications: unread,
      pendingReviews: pending,
      setUnread,
      refresh,
      signOut,
      signingOut,
    }),
    [user, unread, pending, refresh, signOut, signingOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Safe variant for components that may render outside an authenticated shell. */
export function useOptionalSession(): SessionApi | null {
  return useContext(SessionContext);
}
