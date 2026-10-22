"use client";

import { useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import { useApi } from "@/lib/useApi";

// Second sign-in layer. Renders children once the signed-in Tide identity has confirmed a Gmail code;
// until then it shows the send-code / enter-code form. The server enforces the same check.
export default function EmailGate({ children }: { children: React.ReactNode }) {
  const { authenticated } = useTideCloak();
  const api = useApi();
  const [status, setStatus] = useState<{ verified: boolean; configured: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    api("/api/verify").then((r) => r.json()).then(setStatus).catch(() => setStatus({ verified: false, configured: false }));
  }, [authenticated, api]);

  async function post(path: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Something went wrong. Try again.");
      return res.ok;
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated || !status) return null;
  if (status.verified) return <>{children}</>;

  return (
    <div className="box">
      <h2>Step 2 of 2: verify your email</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        You&apos;re signed in with Tide and your passkey. Confirm a code sent to your Gmail to finish.
      </p>
      {!status.configured && <p className="bad small">Email sending isn&apos;t set up on this server yet.</p>}
      {!sent ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.trim()) return setError("Enter your email address.");
            if (await post("/api/verify/start", { email })) setSent(true);
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <label className="search" style={{ margin: 0, flex: 1 }}>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="you@gmail.com" aria-label="Email address" />
          </label>
          <button className="pill solid" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code from the email.");
            if (await post("/api/verify/confirm", { code })) setStatus({ ...status, verified: true });
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <label className="search" style={{ margin: 0, flex: 1 }}>
            <input inputMode="numeric" value={code} onChange={(e) => { setCode(e.target.value); setError(null); }} placeholder="123456" aria-label="6-digit code" />
          </label>
          <button className="pill solid" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
          <button type="button" className="pill" onClick={() => { setSent(false); setCode(""); }}>Use another email</button>
          <p className="muted small" style={{ width: "100%", margin: 0 }}>Code sent to {email}. It expires in 10 minutes.</p>
        </form>
      )}
      {error && <p className="bad small" style={{ margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}
