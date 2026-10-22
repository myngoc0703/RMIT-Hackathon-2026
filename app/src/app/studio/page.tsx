"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import Nav from "@/components/Nav";
import EmailGate from "@/components/EmailGate";
import ArtCanvas from "@/components/ArtCanvas";
import type { Artwork } from "@/lib/gallery";
import { useApi } from "@/lib/useApi";
import { extract } from "@/lib/watermark";

type Req = { id: string; artworkId: string; title: string; requester: string; status: string; at: string; mine: boolean; forMyArt: boolean };
type Found = { view: { viewer: string; signedIn: boolean; at: string; code: number }; artwork: string };

const DISPLAY_MAX = 1000;

// Makes the public display copy in the browser: at most 1000px wide, with the artist's name
// burned in faintly. The full-quality original is sent separately and only served to its owner
// and approved collectors.
async function makeDisplayCopy(file: File, artist: string) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, DISPLAY_MAX / bmp.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(12, Math.round(c.width / 40))}px system-ui, sans-serif`;
  ctx.fillText(`© ${artist} · W2W`, 14, c.height - 14);
  return { display: c.toDataURL("image/jpeg", 0.82), ratio: bmp.height / bmp.width };
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// Studio. Every member has one: uploading a work makes you its owner, and you can only decide on
// access to works you own. The server checks ownership against the Tide token on every action.
export default function StudioPage() {
  const { authenticated, isInitializing, login, guest, getValueFromIdToken } = useAuth();
  const api = useApi();
  const [mine, setMine] = useState<Artwork[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [form, setForm] = useState({ title: "", category: "painting", licence: true });
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<{ busy: boolean; error?: string; done?: string }>({ busy: false });
  const [leak, setLeak] = useState<{ state: "idle" | "reading" | "none" | "found" | "unknown" | "denied"; found?: Found; code?: number; msg?: string }>({ state: "idle" });

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([api("/api/requests"), api("/api/my")]);
    if (r1.ok) setReqs((await r1.json()).requests);
    if (r2.ok) setMine((await r2.json()).artworks);
  }, [api]);

  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);

  async function act(id: string, action: "approve" | "reject" | "revoke") {
    await api(`/api/requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    load();
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setUpload({ busy: false, error: "Give your artwork a title." });
    if (!file) return setUpload({ busy: false, error: "Choose an image to upload." });
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setUpload({ busy: false, error: "Use a PNG, JPEG or WebP image." });
    if (file.size > 8_000_000) return setUpload({ busy: false, error: "That image is over 8 MB. Use a smaller file." });
    setUpload({ busy: true });
    try {
      const artist = String(getValueFromIdToken("preferred_username") ?? "artist");
      const [{ display, ratio }, original] = await Promise.all([makeDisplayCopy(file, artist), readAsDataUrl(file)]);
      const res = await api("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, display, original, ratio }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setUpload({ busy: false, error: d.error ?? "Upload failed. Try again." });
      setUpload({ busy: false, done: d.artwork.id });
      setForm({ title: "", category: "painting", licence: true });
      setFile(null);
      load();
    } catch {
      setUpload({ busy: false, error: "Couldn't read that image. Try another file." });
    }
  }

  async function check(f: File) {
    setLeak({ state: "reading" });
    const bmp = await createImageBitmap(f);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0);
    const code = extract(ctx.getImageData(0, 0, c.width, c.height));
    if (code === null) return setLeak({ state: "none" });
    const res = await api(`/api/leak?code=${code}`);
    if (res.status === 403) return setLeak({ state: "denied", code, msg: (await res.json()).error });
    if (!res.ok) return setLeak({ state: "unknown", code });
    setLeak({ state: "found", found: await res.json(), code });
  }

  if (isInitializing) return <main className="page"><Nav /><p className="muted">Loading…</p></main>;
  if (!authenticated)
    return (
      <main className="page">
        <Nav />
        <div className="box" style={{ maxWidth: 480 }}>
          <h2>My studio</h2>
          <p className="muted small">
            {guest ? "Sign-in is off on this computer (guest mode)." : "Sign in with Tide to upload your art, manage requests and check leaks."}
          </p>
          {!guest && <button className="pill solid" onClick={login}>Sign in with Tide</button>}
        </div>
      </main>
    );

  const incoming = reqs.filter((r) => r.forMyArt);
  const outgoing = reqs.filter((r) => r.mine);

  return (
    <main className="page">
      <Nav />
      <h1 className="serif" style={{ fontSize: 34, margin: "0 0 20px" }}>My studio</h1>
      <EmailGate>
        <div className="view">
          <div className="side">
            <section className="box" id="upload">
              <h2>Upload your artwork</h2>
              <p className="muted small" style={{ marginTop: 0 }}>You become its owner. Only you can approve who gets the original.</p>
              <form onSubmit={submitUpload} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label className="search" style={{ margin: 0 }}>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rain over Hoi An" aria-label="Title" />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["painting", "illustration", "photography"].map((c) => (
                    <button type="button" key={c} className={`pill ${form.category === c ? "on" : ""}`} onClick={() => setForm({ ...form, category: c })}>{c}</button>
                  ))}
                </div>
                <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={form.licence} onChange={(e) => setForm({ ...form, licence: e.target.checked })} />
                  Collectors can request the original or a licence
                </label>
                <label className="drop" style={{ padding: 16 }}>
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {file ? file.name : "Choose an image (PNG, JPEG or WebP, up to 8 MB)"}
                </label>
                <button className="pill solid" disabled={upload.busy} style={{ alignSelf: "flex-start" }}>{upload.busy ? "Sealing…" : "Upload and seal"}</button>
                {upload.error && <p className="bad small" style={{ margin: 0 }}>{upload.error}</p>}
                {upload.done && <p className="ok small" style={{ margin: 0 }}>Uploaded. <a href={`/art/${upload.done}`} style={{ textDecoration: "underline" }}>See it in the gallery</a></p>}
              </form>
            </section>

            <section className="box">
              <h2>My artworks ({mine.length})</h2>
              {mine.length === 0 && <p className="muted small" style={{ margin: 0 }}>Nothing yet. Upload your first piece above.</p>}
              <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
                {mine.map((a) => (
                  <a key={a.id} href={`/art/${a.id}`}>
                    <div className="frame"><ArtCanvas art={a} width={240} /></div>
                    <p className="name" style={{ fontSize: 13 }}>{a.title}</p>
                  </a>
                ))}
              </div>
            </section>
          </div>

          <div className="side">
            <section className="box">
              <h2>Requests for my art</h2>
              {incoming.length === 0 && <p className="muted small" style={{ margin: 0 }}>No requests yet. They appear here when a collector asks for one of your works.</p>}
              {incoming.map((r) => (
                <div key={r.id} className="row">
                  <span style={{ flex: 1 }}>
                    <b>{r.requester}</b> wants <span className="serif">{r.title}</span>
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
              <h2>My requests</h2>
              {outgoing.length === 0 && <p className="muted small" style={{ margin: 0 }}>You haven&apos;t asked for any originals yet.</p>}
              {outgoing.map((r) => (
                <a key={r.id} href={`/art/${r.artworkId}`} className="row">
                  <span style={{ flex: 1 }} className="serif">{r.title}</span>
                  <span className="status">{r.status}</span>
                </a>
              ))}
            </section>

            <section className="box">
              <h2>Leak checker</h2>
              <p className="muted small" style={{ marginTop: 0 }}>Found a copy of one of your works online? Drop it here to read its hidden mark.</p>
              <label className="drop">
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && check(e.target.files[0])} />
                {leak.state === "reading" ? "Reading the hidden mark…" : "Choose an image"}
              </label>
              {leak.state === "none" && <p className="bad small">No W2W mark found. The copy may be resized or photographed; check the visible mark instead.</p>}
              {leak.state === "unknown" && <p className="small">Mark {leak.code} found, but there&apos;s no matching view on record.</p>}
              {leak.state === "denied" && <p className="bad small">{leak.msg}</p>}
              {leak.state === "found" && leak.found && (
                <div style={{ marginTop: 12 }}>
                  <p className="small" style={{ margin: 0 }}>Mark {leak.code}: <span className="serif">{leak.found.artwork}</span></p>
                  <p style={{ margin: "4px 0 0", fontSize: 18 }} className="serif">Shown to {leak.found.view.viewer}</p>
                  <p className="meta">{new Date(leak.found.view.at).toLocaleString()} · {leak.found.view.signedIn ? "signed in with Tide" : "not signed in"}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </EmailGate>
    </main>
  );
}
