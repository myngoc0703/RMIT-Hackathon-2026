"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { ARTIST_ROLE } from "@/lib/roles";

export default function Nav() {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken, hasRealmRole } = useTideCloak();
  return (
    <header className="nav">
      <a href="/" className="brand serif">WaveToWin</a>
      <a href="/" className="navlink">Explore</a>
      <a href="/#artists" className="navlink">Artists</a>
      <span className="spacer" />
      {!isInitializing && authenticated && hasRealmRole(ARTIST_ROLE) && <a href="/studio" className="pill">Studio</a>}
      {!isInitializing && authenticated ? (
        <>
          <span className="muted small">{getValueFromIdToken("preferred_username")}</span>
          <button className="pill" onClick={logout}>Sign out</button>
        </>
      ) : (
        <button className="pill solid" onClick={login} disabled={isInitializing}>Sign in with Tide</button>
      )}
    </header>
  );
}
