"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { ARTIST_ROLE } from "@/lib/roles";
import { useApi } from "@/lib/useApi";
import { extract } from "@/lib/watermark";
import EmailGate from "@/components/EmailGate";

type Req = { id: string; title: string; requester: string; status: string; at: string };
type Found = { view: { viewer: string; signedIn: boolean; at: string; code: number }; artwork: string };

// Artist studio. The page checks the role only to decide what to show; every action is
// re-checked on the server against the artist role in the Tide-signed token.
export default function StudioPage() {
  const { authenticated, isInitializing, login, hasRealmRole } = useTideCloak();
  const api = useApi();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [leak, setLeak] = useState<{ state: "idle" | "reading" | "none" | "found" | "unknown"; found?: Found; code?: number }>({ state: "idle" });

  const load = useCallback(async () => {
    const res = await api("/api/requests");
    if (res.ok) setReqs((await res.json()).requests);
  }, [api]);

  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);

  async function act(id: string, action: "approve" | "reject" | "revoke") {
    await api(`/api/requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    load();
  }

  async function check(file: File) {
    setLeak({ state: "reading" });
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0);
    const code = extract(ctx.getImageData(0, 0, c.width, c.height));
    if (code === null) return setLeak({ state: "none" });
    const res = await api(`/api/leak?code=${code}`);
    if (!res.ok) return setLeak({ state: "unknown", code });
    setLeak({ state: "found", found: await res.json(), code });
  }

  if (isInitializing) return <main className="page"><Nav /><p className="muted">Loading…</p></main>;
  if (!authenticated)
    return (
      <main className="page">
        <Nav />
        <div className="box" style={{ maxWidth: 460 }}>
          <h2>Artist studio</h2>
          <p className="muted small">Sign in with Tide to manage requests and check leaks.</p>
          <button className="pill solid" onClick={login}>Sign in with Tide</button>
        </div>
      </main>
    );
  if (!hasRealmRole(ARTIST_ROLE))
    return (
      <main className="page">
        <Nav />
        <div className="box" style={{ maxWidth: 520 }}>
          <h2>You&apos;re not an artist here yet</h2>
          <p className="muted small" style={{ margin: 0 }}>
            The <code>{ARTIST_ROLE}</code> role is granted through a TideCloak change request that admins approve in the Tide enclave.
            Nobody, including this platform, can make themselves an artist.
          </p>
        </div>
      </main>
    );

  return (
    <main className="page">
      <Nav />
      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 20px" }}>Studio</h1>
      <EmailGate>
      <div className="view">
        <section className="box">
          <h2>Requests for originals and licences</h2>
          {reqs.length === 0 && <p className="muted small">No requests yet. They appear here when a collector asks.</p>}
          {reqs.map((r) => (
            <div key={r.id} className="row">
              <span style={{ flex: 1 }}>
                <b style={{ fontWeight: 500 }}>{r.requester}</b> wants <span className="serif">{r.title}</span>
                <span className="meta" style={{ display: "block" }}>{new Date(r.at).toLocaleString()}</span>
              </span>
              <span className="status">{r.status}</span>
              {r.status === "pending" && (
                <>
                  <button className="pill" onClick={() => act(r.id, "reject")}>Reject</button>
                  <button className="pill solid" onClick={() => act(r.id, "approve")}>Approve</button>
                </>
              )}
              {r.status === "approved" && <button className="pill" onClick={() => act(r.id, "revoke")}>Revoke</button>}
            </div>
          ))}
        </section>

        <section className="box">
          <h2>Leak checker</h2>
          <p className="muted small" style={{ marginTop: 0 }}>Found a copy of your work online? Drop the image here to read its hidden mark.</p>
          <label className="drop">
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && check(e.target.files[0])} />
            {leak.state === "reading" ? "Reading the hidden mark…" : "Choose an image"}
          </label>
          {leak.state === "none" && <p className="bad small">No WaveToWin mark found. The copy may be resized or photographed; check the visible mark instead.</p>}
          {leak.state === "unknown" && <p className="small">Mark {leak.code} found, but there&apos;s no matching view on record.</p>}
          {leak.state === "found" && leak.found && (
            <div style={{ marginTop: 12 }}>
              <p className="small" style={{ margin: 0 }}>Mark {leak.code}: <span className="serif">{leak.found.artwork}</span></p>
              <p style={{ margin: "4px 0 0", fontSize: 18 }} className="serif">Shown to {leak.found.view.viewer}</p>
              <p className="meta">{new Date(leak.found.view.at).toLocaleString()} · {leak.found.view.signedIn ? "signed in with Tide" : "not signed in"}</p>
            </div>
          )}
        </section>
      </div>
      </EmailGate>
    </main>
  );
}
