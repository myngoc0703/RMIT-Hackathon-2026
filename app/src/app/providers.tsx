"use client";

import { useEffect, useState } from "react";
import { TideCloakProvider } from "@tidecloak/nextjs";
import { SimAuthProvider, StaticAuth, TideBridge } from "@/lib/auth/client";

// Playbook: add-auth-nextjs-fresh Step 4a
// The adapter is fetched at runtime from /api/config (data/tidecloak.json, never committed), so a
// fresh clone without TideCloak still starts, in guest mode, instead of failing the build.
// useDPoP goes inside config object (not as a separate JSX prop).
// Enables client-side DPoP proof generation (required for secureFetch).
export function Providers({ children }: { children: React.ReactNode }) {
  const [tcConfig, setTcConfig] = useState<Record<string, unknown> | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setTcConfig(c && (c.jwk || c.simulated) ? c : null))
      .catch(() => setTcConfig(null));
  }, []);

  if (tcConfig === undefined) return <StaticAuth mode="loading">{children}</StaticAuth>;
  if (tcConfig === null) return <StaticAuth mode="guest">{children}</StaticAuth>;
  // Simulated TideCloak (W2W_AUTH_MODE is not "tide"): sign-in, roles and checks run locally.
  if (tcConfig.simulated) return <SimAuthProvider>{children}</SimAuthProvider>;
  return (
    <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}>
      <TideBridge>{children}</TideBridge>
    </TideCloakProvider>
  );
}
