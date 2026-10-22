import Nav from "@/components/Nav";

const ROWS = [
  {
    role: "Visitor",
    how: "Not signed in",
    can: ["Browse the gallery", "View watermarked display copies"],
    cant: ["Request originals", "See anything private"],
    enforced: "Only public routes answer; everything else returns 401.",
  },
  {
    role: "Member",
    how: "Tide sign-in + passkey + Gmail code",
    can: ["Request originals or licences", "Upload their own art, which makes them its artist"],
    cant: ["Touch anyone else's art or requests"],
    enforced: "The server checks the DPoP-bound Tide token and the verified email on every call.",
  },
  {
    role: "Licensed collector",
    how: "Approved by the artist",
    can: ["Unlock the original of the one artwork they were approved for"],
    cant: ["Other artworks", "Reshare without their mark on the copy"],
    enforced: "Approval is per artwork and per Tide identity, and the artist can revoke it at any time.",
  },
  {
    role: "Artist (owner)",
    how: "Uploaded the work with their Tide identity",
    can: ["Approve, reject or revoke requests for their own artworks", "Trace leaks of their own artworks"],
    cant: ["See or approve other artists' works"],
    enforced: "Ownership is bound to the uploader's Tide identity. There is no admin who can override it.",
  },
];

export const metadata = { title: "Access rights · WaveToWin" };

export default function AccessPage() {
  return (
    <main className="page">
      <Nav />
      <h1 className="serif" style={{ fontSize: 40, margin: "0 0 8px" }}>Who can do what</h1>
      <p className="muted" style={{ margin: "0 0 26px", maxWidth: 640 }}>
        There is no admin and no master key. Your Tide identity decides what you can do, and only an artwork&apos;s owner decides who gets its original.
      </p>
      <section className="safe" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
        {ROWS.map((r, i) => (
          <div key={r.role}>
            <span className="step serif">{i + 1}</span>
            <h3>{r.role}</h3>
            <p style={{ marginBottom: 10 }}><i>{r.how}</i></p>
            <p className="meta" style={{ color: "var(--ink)" }}>CAN</p>
            <ul className="list" style={{ marginBottom: 10 }}>{r.can.map((c) => <li key={c}>✓ {c}</li>)}</ul>
            <p className="meta" style={{ color: "var(--ink)" }}>CAN&apos;T</p>
            <ul className="list" style={{ marginBottom: 10 }}>{r.cant.map((c) => <li key={c}>✗ {c}</li>)}</ul>
            <p style={{ fontSize: 12 }}>{r.enforced}</p>
          </div>
        ))}
      </section>
      <p className="muted small" style={{ marginTop: 26 }}>
        TideCloak has a technical operator for running the server, but it isn&apos;t a role in WaveToWin and can&apos;t approve access to anyone&apos;s art.
      </p>
    </main>
  );
}
