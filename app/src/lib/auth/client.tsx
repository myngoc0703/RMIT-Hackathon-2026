"use client";

import { createContext, useContext } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

// One sign-in hook for every page. With TideCloak set up it is the real Tide session; without an
// adapter (a fresh clone with no data/tidecloak.json) the app runs in guest mode: browsing and
// watermarks work, and sign-in is unavailable. Guest mode grants nothing: protected APIs still
// require a verified Tide token on the server.
export type Auth = {
  guest: boolean;
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
