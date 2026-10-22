"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import Nav from "@/components/Nav";
import EmailGate from "@/components/EmailGate";
import type { Artist } from "@/lib/gallery";
import { useApi } from "@/lib/useApi";

type Badge = { id: string; label: string; hint: string; earned: boolean };
type Me = {
  username: string;
  artistId: string;
  stats: { works: number; views: number; approvedByMe: number; approvedForMe: number; followers: number; following: number; traced: number };
  badges: Badge[];
  followers: string[];
  following: Artist[];
};

// My profile: accomplishments, who I follow and who follows me. Built from the server's view of
// this Tide identity, so nobody can see or edit another member's profile here.
export default function ProfilePage() {
  const { authenticated, isInitializing, login, guest } = useAuth();
  const api = useApi();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (authenticated) api("/api/me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, [authenticated, api]);

  if (isInitializing) return <main className="page"><Nav /><p className="muted">Loading…</p></main>;
  if (!authenticated)
    return (
      <main className="page">
        <Nav />
        <div className="box" style={{ maxWidth: 480 }}>
          <h2>My profile</h2>
          <p className="muted small">{guest ? "Sign-in is off on this computer (guest mode)." : "Sign in with Tide to see your accomplishments and followers."}</p>
          {!guest && <button className="pill solid" onClick={login}>Sign in with Tide</button>}
        </div>
      </main>
    );

  const stats = me?.stats;
  return (
    <main className="page">
      <Nav />
      <EmailGate>
        {!me ? (
          <p className="muted">Loading your profile…</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <span className="avatar" style={{ width: 64, height: 64, background: "var(--pink)" }} />
              <div style={{ flex: 1 }}>
                <h1 className="serif" style={{ fontSize: 36, margin: 0 }}>{me.username}</h1>
                <p className="meta">{stats!.followers} followers · {stats!.following} following</p>
              </div>
              <a className="pill" href={`/artist/${me.artistId}`}>View my public page</a>
              <a className="pill solid" href="/studio#upload">＋ Upload your art</a>
            </div>

            <p className="sec">My accomplishments</p>
            <section className="stats-grid">
              <div><b>{stats!.works}</b><span>works uploaded</span></div>
              <div><b>{stats!.views}</b><span>marked views</span></div>
              <div><b>{stats!.approvedByMe}</b><span>collectors approved</span></div>
              <div><b>{stats!.approvedForMe}</b><span>originals collected</span></div>
              <div><b>{stats!.traced}</b><span>leaks traced</span></div>
            </section>
            <section className="badges">
              {me.badges.map((b) => (
                <span key={b.id} className={`badge-card ${b.earned ? "earned" : ""}`} title={b.hint}>
                  <b>{b.earned ? "★" : "☆"} {b.label}</b>
                  <span>{b.earned ? "Earned" : b.hint}</span>
                </span>
              ))}
            </section>

            <div className="view" style={{ marginTop: 34 }}>
              <section className="box">
                <h2>Following ({me.following.length})</h2>
                {me.following.length === 0 && <p className="muted small" style={{ margin: 0 }}>You don&apos;t follow anyone yet. <a href="/#artists" style={{ textDecoration: "underline" }}>Find artists to follow</a></p>}
                {me.following.map((a) => (
                  <a key={a.id} href={`/artist/${a.id}`} className="row">
                    <span className="avatar" style={{ width: 30, height: 30, background: "var(--yellow)" }} />
                    <span style={{ flex: 1 }} className="serif">{a.name}</span>
                    <span className="meta">{a.city}</span>
                  </a>
                ))}
              </section>
              <section className="box">
                <h2>Followers ({me.followers.length})</h2>
                {me.followers.length === 0 && <p className="muted small" style={{ margin: 0 }}>No followers yet. Upload your work and share your page.</p>}
                {me.followers.map((name, i) => (
                  <div key={`${name}-${i}`} className="row">
                    <span className="avatar" style={{ width: 30, height: 30, background: "var(--paper2)" }} />
                    <span style={{ flex: 1 }}>{name}</span>
                  </div>
                ))}
              </section>
            </div>
          </>
        )}
      </EmailGate>
    </main>
  );
}
