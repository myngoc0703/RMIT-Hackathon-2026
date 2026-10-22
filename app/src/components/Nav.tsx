"use client";

import { useAuth } from "@/lib/auth/client";

export default function Nav() {
  const { guest, simulated, authenticated, isInitializing, login, logout, getValueFromIdToken } = useAuth();
  return (
    <header className="nav">
      <a href="/" className="brand serif">W2W</a>
      <a href="/" className="navlink">Explore</a>
      <a href="/#artists" className="navlink">Artists</a>
      <a href="/access" className="navlink">Access rights</a>
      <span className="spacer" />
      {simulated && <span className="sim-chip" title="Sign-in, roles and access checks are simulated until TideCloak is connected">Simulated TideCloak</span>}
      <a href="/studio#upload" className="pill">＋ Upload your art</a>
      {!isInitializing && authenticated && <a href="/studio" className="pill">My studio</a>}
      {!isInitializing && authenticated ? (
        <>
          <a href="/me" className="user-chip" title="My profile">
            <span className="user-avatar" aria-hidden>{String(getValueFromIdToken("preferred_username") ?? "?").charAt(0).toUpperCase()}</span>
            <span className="user-name">{String(getValueFromIdToken("preferred_username") ?? "")}</span>
          </a>
          <button className="signout" onClick={logout}>Sign out</button>
        </>
      ) : (
        guest ? (
          <button className="pill" onClick={login} title="TideCloak isn't set up on this computer">Guest mode · sign-in off</button>
        ) : (
          <>
            <button className="pill" onClick={login} disabled={isInitializing} title="Opens Tide: choose “New user? Create an account”">Sign up</button>
            <button className="pill solid" onClick={login} disabled={isInitializing}>Sign in with Tide</button>
          </>
        )
      )}
    </header>
  );
}
