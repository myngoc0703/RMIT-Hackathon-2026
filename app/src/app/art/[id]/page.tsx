"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import Nav from "@/components/Nav";
import ArtCanvas from "@/components/ArtCanvas";
import { artistById, artworkById } from "@/lib/gallery";
import { useApi } from "@/lib/useApi";
import EmailGate from "@/components/EmailGate";

type Mark = { code: number; label: string };

// One artwork, open to everyone. Each visit gets its own watermark code from the server,
// so any copy of this screen can be traced back to this view.
export default function ArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const art = artworkById(id);
  const artist = art && artistById(art.artistId);
  const { guest, authenticated, isInitializing, login } = useAuth();
  const api = useApi();
  const [mark, setMark] = useState<Mark | null>(null);
  const [request, setRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!art || isInitializing) return;
    api("/api/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artworkId: art.id }) })
      .then((r) => r.json())
      .then((d) => setMark({ code: d.code, label: d.viewer }));
  }, [art, isInitializing, api]);

  useEffect(() => {
    if (!art || !authenticated) return;
    api("/api/requests").then((r) => (r.ok ? r.json() : { requests: [] })).then((d) => {
      const mine = d.requests.find((r: { artworkId: string }) => r.artworkId === art.id);
      if (mine) setRequest(mine.status);
    });
  }, [art, authenticated, api]);

  async function ask() {
    setError(null);
    const res = await api("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artworkId: art!.id }) });
    const d = await res.json();
    if (!res.ok) return setError(d.error ?? "Couldn't send the request. Try again.");
    setRequest(d.request.status);
  }

  if (!art || !artist) return <main className="page"><Nav /><p className="muted">This artwork doesn't exist.</p></main>;

  return (
    <main className="page">
      <Nav />
      <div className="view">
        <div style={{ position: "relative" }}>
          {mark ? <ArtCanvas art={art} width={1100} mark={mark} /> : <div style={{ aspectRatio: `1 / ${art.ratio}`, background: "var(--panel)", borderRadius: 6 }} />}
          <span className="badge">⛨ Protected</span>
        </div>
        <aside className="side">
          <div>
            <h1 className="serif" style={{ fontSize: 30, margin: 0 }}>{art.title}</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              <a href={`/artist/${artist.id}`} style={{ color: "var(--soft)" }}>{artist.name}</a> · {art.category}, {art.year}
            </p>
          </div>

          <div className="box">
            <h2>This copy is marked for you</h2>
            <ul className="list">
              <li>Visible mark: <span style={{ color: "var(--text)" }}>{mark?.label ?? "…"}</span></li>
              <li>Hidden mark in the pixels: code {mark?.code ?? "…"}</li>
              <li>No file to save. Right-click and drag are off.</li>
            </ul>
          </div>

          <div className="box">
            <h2>The original stays with {artist.name.split(" ")[0]}</h2>
            {!art.licence ? (
              <p className="muted small" style={{ margin: 0 }}>This artist doesn&apos;t offer the original or a licence for this work.</p>
            ) : guest ? (
              <p className="muted small" style={{ margin: 0 }}>Sign-in is off on this computer (guest mode), so requests are unavailable here.</p>
            ) : !authenticated ? (
              <>
                <p className="muted small" style={{ margin: "0 0 10px" }}>Sign in to ask the artist for the full-quality original or a print licence.</p>
                <button className="pill solid" onClick={login}>Sign in with Tide</button>
              </>
            ) : (
              <EmailGate>
              {request ? (
              <p className="small" style={{ margin: 0 }}>
                Your request is <b className={request === "approved" ? "ok" : request === "pending" ? "" : "bad"}>{request}</b>.
                {request === "pending" && " The artist decides."}
              </p>
            ) : (
              <>
                <p className="muted small" style={{ margin: "0 0 10px" }}>Only the artist can approve who gets it.</p>
                <button className="pill solid" onClick={ask}>Request original or licence</button>
              </>
            )}
              </EmailGate>
            )}
            {error && <p className="bad small" style={{ margin: "8px 0 0" }}>{error}</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}
