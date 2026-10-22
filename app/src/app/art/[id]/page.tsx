"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import Nav from "@/components/Nav";
import ArtCanvas from "@/components/ArtCanvas";
import EmailGate from "@/components/EmailGate";
import type { Artist, Artwork } from "@/lib/gallery";
import { useApi } from "@/lib/useApi";

type Mark = { code: number; label: string };

// One artwork, open to everyone. Each visit gets its own watermark code from the server, so any
// copy of this screen can be traced back to this view. The owner and approved collectors can also
// open the full-quality original, which is drawn with their own mark too.
export default function ArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const { guest, authenticated, isInitializing, login } = useAuth();
  const api = useApi();
  const [art, setArt] = useState<Artwork | null | undefined>(undefined);
  const [artist, setArtist] = useState<Artist | undefined>();
  const [mark, setMark] = useState<Mark | null>(null);
  const [request, setRequest] = useState<string | null>(null);
  const [owner, setOwner] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/artworks").then((r) => r.json()).then((d) => {
      const a = (d.artworks as Artwork[]).find((x) => x.id === id) ?? null;
      setArt(a);
      setArtist((d.artists as Artist[]).find((p) => p.id === a?.artistId));
    });
  }, [id]);

  useEffect(() => {
    if (!art || isInitializing) return;
    api("/api/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artworkId: art.id }) })
      .then((r) => r.json())
      .then((d) => setMark({ code: d.code, label: d.viewer }));
  }, [art, isInitializing, api]);

  // Ownership and this member's request status. Both need the verified email, so 403 just means "not yet".
  const refresh = () => {
    if (!art || !authenticated) return;
    api("/api/my").then((r) => (r.ok ? r.json() : { artworks: [] })).then((d) => setOwner(d.artworks.some((a: Artwork) => a.id === art.id)));
    api("/api/requests").then((r) => (r.ok ? r.json() : { requests: [] })).then((d) => {
      const mine = d.requests.find((r: { artworkId: string; mine: boolean }) => r.artworkId === art.id && r.mine);
      setRequest(mine ? mine.status : null);
    });
  };
  useEffect(refresh, [art, authenticated, api]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ask() {
    setError(null);
    const res = await api("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artworkId: art!.id }) });
    const d = await res.json();
    if (!res.ok) return setError(d.error ?? "Couldn't send the request. Try again.");
    setRequest(d.request.status);
  }

  async function openOriginal() {
    setError(null);
    const res = await api(`/api/original/${art!.id}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOriginal(null);
      refresh();
      return setError(d.error ?? "Couldn't open the original.");
    }
    setOriginal(d.original);
  }

  function downloadMarked() {
    const canvas = document.querySelector<HTMLCanvasElement>(".view canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `${art!.id}-marked-for-${mark?.label ?? "you"}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  if (art === undefined) return <main className="page"><Nav /><p className="muted">Loading…</p></main>;
  if (!art) return <main className="page"><Nav /><p className="muted">This artwork doesn&apos;t exist.</p></main>;
  const canOpen = owner || request === "approved";
  const first = artist?.name.split(" ")[0] ?? "the artist";

  return (
    <main className="page">
      <Nav />
      <div className="view">
        <div style={{ position: "relative" }}>
          {mark ? <ArtCanvas art={art} width={1100} mark={mark} src={original ?? undefined} /> : <div style={{ aspectRatio: `1 / ${art.ratio}`, background: "var(--panel)", borderRadius: 6 }} />}
          <span className="badge">{original ? "◆ Original · marked for you" : "⛨ Protected"}</span>
        </div>
        <aside className="side">
          <div>
            <h1 className="serif" style={{ margin: 0 }}>{art.title}</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              <a href={`/artist/${art.artistId}`} style={{ color: "var(--soft)" }}>{artist?.name ?? "Artist"}</a> · {art.category}, {art.year}
            </p>
          </div>

          <div className="box">
            <h2>This copy is marked for you</h2>
            <ul className="list">
              <li>Visible mark: <span style={{ color: "var(--text)" }}>{mark?.label ?? "…"}</span></li>
              <li>Hidden mark in the pixels: code {mark?.code ?? "…"}</li>
              <li>{original ? "Full-quality original, still carrying your mark." : "Display copy only. Right-click and drag are off."}</li>
            </ul>
          </div>

          <div className="box">
            <h2>{owner ? "You own this artwork" : `The original stays with ${first}`}</h2>
            {guest ? (
              <p className="muted small" style={{ margin: 0 }}>Sign-in is off on this computer (guest mode), so requests are unavailable here.</p>
            ) : !authenticated ? (
              <>
                <p className="muted small" style={{ margin: "0 0 10px" }}>Sign in to ask the artist for the full-quality original or a licence.</p>
                <button className="pill solid" onClick={login}>Sign in with Tide</button>
              </>
            ) : (
              <EmailGate>
                {canOpen ? (
                  <>
                    <p className="small" style={{ margin: "0 0 10px" }}>
                      {owner ? "Only you decide who else can open it. Manage requests in your studio." : <>The artist <b className="ok">approved</b> you. You can open the original.</>}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!original && <button className="pill solid" onClick={openOriginal}>Unlock original</button>}
                      {original && <button className="pill solid" onClick={downloadMarked}>Download marked copy</button>}
                      {owner && <a className="pill" href="/studio">Open my studio</a>}
                    </div>
                  </>
                ) : !art.licence ? (
                  <p className="muted small" style={{ margin: 0 }}>This artist doesn&apos;t offer the original or a licence for this work.</p>
                ) : request ? (
                  <p className="small" style={{ margin: 0 }}>
                    Your request is <b className={request === "pending" ? "" : "bad"}>{request}</b>.
                    {request === "pending" && " The artist decides."}
                    {request === "revoked" && " The artist took back your access."}
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
