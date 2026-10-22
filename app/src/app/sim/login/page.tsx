"use client";

import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { setSimToken } from "@/lib/auth/client";

// Simulated TideCloak sign-in. Mirrors the real flow: Tide account (sign in or create) → TideCloak's
// post-login passkey step → a signed access token for W2W. Labelled as a simulation on screen.
type Step = { kind: "form" } | { kind: "passkey"; ticket: string; registered: boolean; username: string };

const DEMO = [
  { username: "artist", password: "w2w-demo-2026", label: "Artist" },
  { username: "collector", password: "w2w-demo-2026", label: "Collector" },
];

export default function SimLoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState("/");

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);

  async function post(path: string, body: object) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function submit(e?: React.FormEvent, override?: { username: string; password: string; tryBoth?: boolean }) {
    e?.preventDefault();
    setError(null);
    const u = (override?.username ?? username).trim().toLowerCase();
    const p = override?.password ?? password;
    if (!u) return setError("Enter your username.");
    if (p.length < 8) return setError("Enter a password of at least 8 characters.");
    setBusy(true);
    try {
      let r = await post(mode === "signup" && !override ? "/api/sim/signup" : "/api/sim/signin", { username: u, password: p });
      if (!r.ok && override?.tryBoth) r = await post("/api/sim/signup", { username: u, password: p });
      if (!r.ok) return setError(r.data.error ?? "Something went wrong. Try again.");
      setStep({ kind: "passkey", ticket: r.data.ticket, registered: r.data.passkeyRegistered, username: u });
    } finally {
      setBusy(false);
    }
  }

  async function usePasskey() {
    if (step.kind !== "passkey") return;
    setError(null);
    if (!browserSupportsWebAuthn()) return setError("This browser doesn't support passkeys. Use Chrome, Safari, Edge or Firefox on localhost.");
    setBusy(true);
    try {
      const o = await post("/api/sim/passkey/options", { ticket: step.ticket });
      if (!o.ok) {
        setStep({ kind: "form" });
        return setError(o.data.error ?? "Sign-in expired. Try again.");
      }
      // Opens the device's real passkey prompt: Touch ID, Windows Hello, a phone or a security key.
      const response =
        o.data.mode === "register"
          ? await startRegistration({ optionsJSON: o.data.options })
          : await startAuthentication({ optionsJSON: o.data.options });
      const v = await post("/api/sim/passkey/verify", { ticket: step.ticket, mode: o.data.mode, response });
      if (!v.ok) {
        setStep({ kind: "form" });
        return setError(v.data.error ?? "Your passkey couldn't be checked. Sign in again.");
      }
      setSimToken(v.data.token);
      window.location.assign(next);
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "The passkey prompt was closed or timed out. Try again."
          : name === "InvalidStateError"
            ? "This device already has a passkey for this account. Use it to sign in."
            : name === "SecurityError"
              ? "Passkeys only work on localhost or HTTPS. Open W2W at http://localhost:3000 on this computer."
              : "The passkey didn't work. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="tide-sim">
      <div className="tide-card">
        <p className="tide-sim-tag">Simulated TideCloak · demo only</p>
        <div className="tide-logo" aria-hidden>Tide</div>

        {step.kind === "form" ? (
          <>
            <h1>{mode === "signin" ? "Sign in" : "Create an account"}</h1>
            <p className="tide-switch">
              {mode === "signin" ? "New user? " : "Already have one? "}
              <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}>
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
            {error && <p className="tide-error" role="alert">{error}</p>}
            <form onSubmit={submit} className="tide-form">
              <label>
                <span>Username</span>
                <input id="sim-username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-username" />
              </label>
              <label>
                <span>Password</span>
                <input id="sim-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <button className="tide-primary" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
            </form>
            <div className="tide-demo">
              <span>Demo accounts</span>
              {DEMO.map((d) => (
                <button key={d.username} type="button" disabled={busy} onClick={() => submit(undefined, { ...d, tryBoth: true })}>{d.label}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1>{step.registered ? "Use your passkey" : "Register a passkey"}</h1>
            <p className="tide-copy">
              Hi <b>{step.username}</b>. {step.registered ? "Confirm it's you with your passkey." : "W2W asks for a passkey after every sign-in. Set one up now with Touch ID, Windows Hello, your phone or a security key."}
            </p>
            <button className="tide-passkey" onClick={usePasskey} disabled={busy} aria-label={step.registered ? "Use passkey" : "Register passkey"}>
              <span aria-hidden>◉</span>
              {busy ? "Waiting for your passkey…" : step.registered ? "Use passkey" : "Register passkey"}
            </button>
            {error && <p className="tide-error" role="alert">{error}</p>}
          </>
        )}

        <p className="tide-foot">Secured by <b>Tide</b> <span>(simulated)</span></p>
      </div>
    </main>
  );
}
