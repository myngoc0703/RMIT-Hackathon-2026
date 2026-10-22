"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

// One sign-in hook for every page. With TideCloak set up it is the real Tide session; without an
// adapter (a fresh clone with no data/tidecloak.json) the app runs in guest mode: browsing and
// watermarks work, and sign-in is unavailable. Guest mode grants nothing: protected APIs still
// require a verified Tide token on the server.
export type Auth = {
  guest: boolean;
  simulated?: boolean;
  authenticated: boolean;
  isInitializing: boolean;
  login: () => void;
  logout: () => void;
  secureFetch: (url: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>;
  hasRealmRole: (role: string) => boolean;
  getValueFromIdToken: (key: string) => unknown;
};

const AuthContext = createContext<Auth | null>(null);

const signedOut = {
  authenticated: false,
  logout: () => {},
  secureFetch: (url: string | URL | RequestInfo, init?: RequestInit) => fetch(url, init),
  hasRealmRole: () => false,
  getValueFromIdToken: () => undefined,
};

export const guestAuth: Auth = {
  ...signedOut,
  guest: true,
  isInitializing: false,
  login: () =>
    window.alert("Sign-in isn't available here: TideCloak isn't set up on this computer. See the README's Setup section."),
};

const loadingAuth: Auth = { ...signedOut, guest: false, isInitializing: true, login: () => {} };

export function TideBridge({ children }: { children: React.ReactNode }) {
  const t = useTideCloak();
  const value: Auth = {
    guest: false,
    authenticated: t.authenticated,
    isInitializing: t.isInitializing,
    login: t.login,
    logout: t.logout,
    secureFetch: t.secureFetch,
    hasRealmRole: t.hasRealmRole,
    getValueFromIdToken: t.getValueFromIdToken,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function StaticAuth({ mode, children }: { mode: "guest" | "loading"; children: React.ReactNode }) {
  return <AuthContext.Provider value={mode === "guest" ? guestAuth : loadingAuth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext) ?? guestAuth;

// Simulated TideCloak session: the access token from /sim/login, kept for this tab only.
const SIM_KEY = "w2w.simToken";

export function setSimToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(SIM_KEY, token);
    else sessionStorage.removeItem(SIM_KEY);
  } catch {}
}

function readSimToken(): { token: string; claims: Record<string, unknown> } | null {
  try {
    const token = sessionStorage.getItem(SIM_KEY);
    if (!token) return null;
    const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(SIM_KEY);
      return null;
    }
    return { token, claims };
  } catch {
    return null;
  }
}

export function SimAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ReturnType<typeof readSimToken> | undefined>(undefined);
  useEffect(() => setSession(readSimToken()), []);
  const claims = session?.claims ?? {};
  const roles = ((claims.realm_access as { roles?: string[] } | undefined)?.roles ?? []) as string[];
  const value: Auth = {
    guest: false,
    simulated: true,
    authenticated: !!session,
    isInitializing: session === undefined,
    login: () => window.location.assign(`/sim/login?next=${encodeURIComponent(window.location.pathname + window.location.hash)}`),
    logout: () => {
      setSimToken(null);
      window.location.assign("/");
    },
    secureFetch: (url, init) => {
      const headers = new Headers(init?.headers);
      if (session) headers.set("Authorization", `Bearer ${session.token}`);
      return fetch(url, { ...init, headers });
    },
    hasRealmRole: (role) => roles.includes(role),
    getValueFromIdToken: (key) => claims[key],
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
