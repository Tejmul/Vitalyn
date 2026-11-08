"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; username: string; phone?: string; password: string; consent: boolean }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Restore the session from a saved token, if any.
    const restore = tokenStore.get()
      ? api<{ user: User }>("/auth/me")
          .then((r) => setUser(r.user))
          .catch(() => tokenStore.clear())
      : Promise.resolve();
    restore.finally(() => setReady(true));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { identifier, password } });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (data: Parameters<AuthState["register"]>[0]) => {
    const r = await api<{ token: string; user: User }>("/auth/register", { method: "POST", body: data });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
