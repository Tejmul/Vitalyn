"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, session } from "./api";
import type { User } from "./types";

type OtpSent = { resendIn: number; expiresInMinutes: number; devCode?: string };
type VerifyResult = { user: User } | { needsProfile: true; signupToken: string };

interface AuthState {
  user: User | null;
  ready: boolean;
  /** True right after the user pressed "Log out" (so pages don't bounce them to the login screen). */
  signedOut: boolean;
  requestOtp: (phone: string) => Promise<OtpSent>;
  verifyOtp: (phone: string, code: string) => Promise<VerifyResult>;
  completeProfile: (data: { signupToken: string; name: string; email?: string; consent: boolean; adult: boolean }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    session.onLost(() => setUser(null));
    // Restore the session from the refresh cookie, if there is one.
    api<{ accessToken: string; user: User }>("/auth/refresh", { method: "POST" })
      .then((r) => {
        session.set(r.accessToken);
        setUser(r.user);
      })
      .catch(() => session.set(null))
      .finally(() => setReady(true));
  }, []);

  const requestOtp = useCallback((phone: string) => api<OtpSent>("/auth/otp/request", { method: "POST", body: { phone } }), []);

  const verifyOtp = useCallback(async (phone: string, code: string): Promise<VerifyResult> => {
    const r = await api<{ accessToken?: string; user?: User; needsProfile?: true; signupToken?: string }>("/auth/otp/verify", { method: "POST", body: { phone, code } });
    if (r.needsProfile && r.signupToken) return { needsProfile: true, signupToken: r.signupToken };
    session.set(r.accessToken!);
    setSignedOut(false);
    setUser(r.user!);
    return { user: r.user! };
  }, []);

  const completeProfile = useCallback(async (data: Parameters<AuthState["completeProfile"]>[0]) => {
    const r = await api<{ accessToken: string; user: User }>("/auth/complete-profile", { method: "POST", body: data });
    session.set(r.accessToken);
    setSignedOut(false);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    session.set(null);
    setSignedOut(true);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signedOut, requestOtp, verifyOtp, completeProfile, logout }),
    [user, ready, signedOut, requestOtp, verifyOtp, completeProfile, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Hospital manager (not reception): can change doctors, schedules, the profile, events and staff. */
export function useIsManager() {
  const { user } = useAuth();
  return user?.role === "HOSPITAL" && user.staffRole === "MANAGER";
}
