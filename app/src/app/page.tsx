"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import ArtCanvas from "@/components/ArtCanvas";
import { ARTIST_FOLLOWERS, ARTWORK_TAGS, TRENDING, type Artist, type Artwork } from "@/lib/gallery";

type Listed = Artwork & { views: number };
type Period = "today" | "week" | "all";
const CATS = [
  { id: "all", label: "All" },
  { id: "painting", label: "Painting" },
  { id: "illustration", label: "Illustration" },
  { id: "photography", label: "Photography" },
];
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// Stable pseudo-random numbers per artwork, so the synthetic stats don't jump between renders.
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const frac = (s: string) => (hash(s) % 1000) / 1000;
const periodViews = (a: Listed, p: Period) => {
  if (p === "all") return a.views;
  const week = Math.round(a.views * (0.25 + 0.35 * frac(a.id)));
  return p === "week" ? week : Math.round(week * (0.1 + 0.15 * frac(a.id + "d")));
};
const likes = (a: Listed) => Math.round(a.views * (0.04 + 0.04 * frac(a.id + "l")));

// Explore: the open gallery everyone lands on. No sign-in needed to look.
export default function ExplorePage() {
  const [art, setArt] = useState<Listed[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<Period>("week");
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/artworks").then((r) => r.json()).then((d) => { setArt(d.artworks); setArtists(d.artists); });
  }, []);

  const byId = useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a])), [artists]);
  const top = useMemo(() => [...art].sort((a, b) => periodViews(b, period) - periodViews(a, period)).slice(0, 5), [art, period]);
  // "Last period" ranking, to show which pieces are climbing.
  const lastRank = useMemo(() => {
    const order = [...art].sort((a, b) => periodViews(b, period) * (0.7 + 0.6 * frac(b.id + period)) - periodViews(a, period) * (0.7 + 0.6 * frac(a.id + period)));
    return Object.fromEntries(order.map((a, i) => [a.id, i + 1]));
  }, [art, period]);
  const totalViews = art.reduce((n, a) => n + a.views, 0);

  const shown = art.filter((a) => {
    const t = q.trim().toLowerCase().replace(/^#/, "");
    const p = byId[a.artistId];
    const hay = `${a.title} ${p?.name ?? ""} ${p?.city ?? ""} ${a.category} ${(ARTWORK_TAGS[a.id] ?? []).join(" ")}`.toLowerCase();
    return (cat === "all" || a.category === cat) && (!t || hay.includes(t));
  });

  const Delta = ({ id, rank }: { id: string; rank: number }) => {
    const d = (lastRank[id] ?? rank) - rank;
    return <span className={`delta ${d > 0 ? "up" : d < 0 ? "down" : ""}`}>{d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : "–"}</span>;
  };

  return (
    <main className="page">
      <Nav />
      <div className="wave" aria-hidden />

      <section className="banner">
        <div style={{ flex: 1 }}>
          <h1 className="serif">Show your art to everyone. Let no one steal it.</h1>
          <p>Every view carries the viewer&apos;s mark. Every original stays with the artist.</p>
          <a href="/studio#upload" className="pill solid" style={{ display: "inline-block", marginTop: 14, background: "var(--yellow)", color: "var(--ink)", borderColor: "var(--ink)" }}>＋ Upload your artwork</a>
          <div className="stats">
            <span><b>{artists.length}</b> artists</span>
            <span><b>{art.length}</b> works</span>
            <span><b>{fmt(totalViews)}</b> marked views</span>
            <span><b>100%</b> of originals released by artists only</span>
          </div>
        </div>
        <span className="shield" aria-hidden>⛨</span>
      </section>

      <div className="filters" style={{ marginBottom: 12 }}>
        {CATS.map((c) => (
          <button key={c.id} className={`pill ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.label}</button>
        ))}
        <label className="search">
          <span aria-hidden className="muted">⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search art, artists, cities, tags" aria-label="Search" />
          {q && <button className="clear" onClick={() => setQ("")} aria-label="Clear search">×</button>}
        </label>
      </div>
      <div className="tags">
        <span className="muted small">Trending</span>
        {TRENDING.map((t) => (
          <button key={t} className={`tag ${q.toLowerCase() === t.toLowerCase() ? "on" : ""}`} onClick={() => setQ(t)}>#{t}</button>
        ))}
      </div>

      {top.length > 0 && (
        <>
          <div className="sec-row">
            <p className="sec" style={{ margin: 0 }}>Most viewed</p>
            <div className="seg">
              {PERIODS.map((p) => (
                <button key={p.id} className={period === p.id ? "on" : ""} onClick={() => setPeriod(p.id)}>{p.label}</button>
              ))}
            </div>
          </div>
          <section className="board">
            <a href={`/art/${top[0].id}`} className="rank-big">
              <div style={{ position: "relative" }}>
                <ArtCanvas art={top[0]} width={720} />
                <span className="rank-num serif">1</span>
                <span className="badge">⛨ Protected</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <p className="name" style={{ fontSize: 19 }}>{top[0].title}</p>
                <Delta id={top[0].id} rank={1} />
              </div>
              <p className="meta">
                {byId[top[0].artistId]?.name} · {byId[top[0].artistId]?.city} · {fmt(periodViews(top[0], period))} views · ♥ {fmt(likes(top[0]))}
              </p>
            </a>
            <div className="rank-list">
              {top.slice(1).map((a, i) => (
                <a key={a.id} href={`/art/${a.id}`} className="rank-row">
                  <span className="n serif">{i + 2}</span>
                  <span className="thumb"><ArtCanvas art={a} width={160} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <p className="name" style={{ margin: 0 }}>{a.title}</p>
                    <p className="meta">{byId[a.artistId]?.name} · {fmt(periodViews(a, period))} views</p>
                    <span className="bar"><span style={{ width: `${Math.round((100 * periodViews(a, period)) / periodViews(top[0], period))}%` }} /></span>
                  </span>
                  <Delta id={a.id} rank={i + 2} />
                </a>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="sec-row">
        <p className="sec" style={{ margin: 0 }}>Discover</p>
        <span className="muted small">{shown.length} of {art.length} works</span>
      </div>
      <section className="masonry">
        {shown.map((a) => {
          const p = byId[a.artistId];
          return (
            <a key={a.id} href={`/art/${a.id}`} className="card">
              <div className="frame">
                <ArtCanvas art={a} width={440} />
                <span className="badge quiet">◉ {fmt(a.views)}</span>
                <div className="hover">
                  <span className="chip-mini">{a.licence ? "Original on request" : "View only"}</span>
                  <span className="hover-tags">{(ARTWORK_TAGS[a.id] ?? []).map((t) => `#${t}`).join("  ")}</span>
                </div>
              </div>
              <div className="card-row">
                <span style={{ minWidth: 0 }}>
                  <p className="name">{a.title}</p>
                  <p className="meta">{p?.name} · {CATS.find((c) => c.id === a.category)?.label}, {a.year}</p>
                </span>
                <button
                  className={`heart ${liked[a.id] ? "on" : ""}`}
                  aria-label={liked[a.id] ? "Unlike" : "Like"}
                  onClick={(e) => { e.preventDefault(); setLiked((l) => ({ ...l, [a.id]: !l[a.id] })); }}
                >
                  ♥ {fmt(likes(a) + (liked[a.id] ? 1 : 0))}
                </button>
              </div>
            </a>
          );
        })}
      </section>
      {art.length > 0 && shown.length === 0 && (
        <p className="empty">No art matches “{q}”. Try an artist&apos;s name, a city or a tag like #seascape.</p>
      )}

      <p className="sec" style={{ marginTop: 40 }}>How your art stays safe</p>
      <section className="safe">
        <div><span className="step serif">1</span><h3>Open to view</h3><p>Anyone can see the work, drawn on a canvas with no file to save.</p></div>
        <div><span className="step serif">2</span><h3>Marked for every viewer</h3><p>Each view hides that viewer&apos;s code in the pixels, plus a faint visible name.</p></div>
        <div><span className="step serif">3</span><h3>Originals stay with the artist</h3><p>Only the artist approves who gets the full file, through Tide-verified accounts.</p></div>
        <div><span className="step serif">4</span><h3>Leaks name the viewer</h3><p>Drop a copy into the leak checker and see exactly which view it came from.</p></div>
      </section>

      <p className="sec" id="artists" style={{ marginTop: 40 }}>Artists to follow</p>
      <section className="artists" style={{ marginTop: 0 }}>
        {artists.map((p) => {
          const works = art.filter((a) => a.artistId === p.id);
          return (
            <a key={p.id} href={`/artist/${p.id}`} className="artist-card">
              <div className="artist-thumbs">
                {works.slice(0, 2).map((w) => <span key={w.id}><ArtCanvas art={w} width={200} /></span>)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                <span className="avatar" style={{ background: works[0]?.shapes[works[0].shapes.length - 1]?.c ?? "#555" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <p className="name" style={{ margin: 0 }}>{p.name}</p>
                  <p className="meta">{p.city} · {works.length} works · {fmt(ARTIST_FOLLOWERS[p.id] ?? 0)} followers</p>
                </span>
                <span className="pill">View</span>
              </div>
            </a>
          );
        })}
      </section>

      <footer className="footer-full">
        <div>
          <span className="serif" style={{ fontSize: 20, color: "var(--text)" }}>W2W</span>
          <p className="muted small" style={{ margin: "6px 0 0", maxWidth: 260 }}>An open gallery where every view is traceable and every original stays with its artist.</p>
        </div>
        <div><b>Explore</b><a href="/">Most viewed</a><a href="/#artists">Artists</a></div>
        <div><b>For artists</b><a href="/studio">Studio</a><a href="/studio">Leak checker</a></div>
        <div><b>About</b><span>RMIT Hackathon 2026</span><span>⛨ Secured with TideCloak</span></div>
      </footer>
    </main>
  );
}
