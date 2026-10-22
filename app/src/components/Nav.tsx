"use client";

import { useAuth } from "@/lib/auth/client";

export default function Nav() {
  const { guest, authenticated, isInitializing, login, logout, getValueFromIdToken } = useAuth();
  return (
    <header className="nav">
      <a href="/" className="brand serif">WaveToWin</a>
      <a href="/" className="navlink">Explore</a>
      <a href="/#artists" className="navlink">Artists</a>
      <a href="/access" className="navlink">Access rights</a>
      <span className="spacer" />
      {!isInitializing && authenticated && <a href="/studio" className="pill">My studio</a>}
      {!isInitializing && authenticated ? (
        <>
          <span className="muted small">{String(getValueFromIdToken("preferred_username") ?? "")}</span>
          <button className="pill" onClick={logout}>Sign out</button>
        </>
      ) : (
        guest ? (
          <button className="pill" onClick={login} title="TideCloak isn't set up on this computer">Guest mode · sign-in off</button>
        ) : (
          <button className="pill solid" onClick={login} disabled={isInitializing}>Sign in with Tide</button>
        )
      )}
    </header>
  );
}
