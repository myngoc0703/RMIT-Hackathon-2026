"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import ArtCanvas from "@/components/ArtCanvas";
import type { Artist, Artwork } from "@/lib/gallery";

// An artist's own page. Wall colour and layout are the artist's choices, and the cover takes its
// colours from their first artwork, so every page looks different.
export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ artists: Artist[]; artworks: Artwork[] } | null>(null);
  useEffect(() => {
    fetch("/api/artworks").then((r) => r.json()).then(setData);
  }, []);
  if (!data) return <main className="page"><Nav /><p className="muted">Loading…</p></main>;
  const artist = data.artists.find((a) => a.id === id);
  const works = data.artworks.filter((a) => a.artistId === id);
  if (!artist) return <main className="page"><Nav /><p className="muted">This artist doesn't exist.</p></main>;

  const palette = works.flatMap((w) => [w.bg, ...w.shapes.map((s) => s.c)]).slice(0, 4);
  if (palette.length < 2) palette.push("#ff4f7b", "#ffd23f");
  // Riso-style cover: hard colour bands from the artist's own palette.
  const cover = `linear-gradient(100deg, ${palette.map((c, i) => `${c} ${(i * 100) / palette.length}% ${((i + 1) * 100) / palette.length}%`).join(", ")})`;

  return (
    <div className={`wall-${artist.wall}`} style={{ minHeight: "100vh" }}>
      <main className="page">
        <Nav />
        <div className="cover" style={{ background: cover }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <span className="avatar" style={{ background: palette[2] ?? palette[0], width: 56, height: 56 }} />
          <div style={{ flex: 1 }}>
            <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>{artist.name}</h1>
            <p className="muted" style={{ margin: 0 }}>{artist.city} · {artist.bio}</p>
          </div>
          <span className="pill">Follow</span>
        </div>

        {artist.layout === "spotlight" && works[0] && (
          <a href={`/art/${works[0].id}`} className="card" style={{ maxWidth: 820, margin: "0 auto 28px" }}>
            <div className="frame"><ArtCanvas art={works[0]} width={900} /></div>
            <p className="name" style={{ fontSize: 18 }}>{works[0].title}</p>
          </a>
        )}
        <section className={artist.layout === "salon" ? "salon" : "grid3"}>
          {(artist.layout === "spotlight" ? works.slice(1) : works).map((a) => (
            <a key={a.id} href={`/art/${a.id}`} className="card">
              <div className="frame"><ArtCanvas art={a} width={480} /></div>
              <p className="name">{a.title}</p>
              <p className="meta">{a.category}, {a.year}{a.licence ? " · original available on request" : ""}</p>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
}
