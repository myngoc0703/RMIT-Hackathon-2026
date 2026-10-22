import Nav from "@/components/Nav";

export const metadata = { title: "Join · W2W" };

// Sign-up help. Accounts are created on Tide's own page (registration is on for this realm);
// W2W never creates accounts or handles passwords itself.
export default function JoinPage() {
  return (
    <main className="page">
      <Nav />
      <h1 className="serif" style={{ fontSize: 40, margin: "0 0 8px" }}>Join W2W</h1>
      <p className="muted" style={{ margin: "0 0 26px", maxWidth: 640 }}>
        There are no passwords on W2W itself: you create your own Tide account, and it&apos;s yours alone.
      </p>
      <section className="safe" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        <div><span className="step serif">1</span><h3>Click Sign up</h3><p>It opens Tide&apos;s secure page. Choose <b>New user? Create an account</b>.</p></div>
        <div><span className="step serif">2</span><h3>Create your Tide account</h3><p>Pick a username and a password only you know. W2W never sees it.</p></div>
        <div><span className="step serif">3</span><h3>Add your passkey</h3><p>On your first sign-in, register Touch ID or a security key. It&apos;s asked for every time after.</p></div>
        <div><span className="step serif">4</span><h3>Verify your email</h3><p>Confirm the 6-digit code we email you. Then upload your art, follow artists and request originals.</p></div>
      </section>
      <div className="box" style={{ marginTop: 26, maxWidth: 680 }}>
        <h2>Already have an account?</h2>
        <p className="muted small" style={{ margin: 0 }}>Use <b>Sign in with Tide</b> at the top of the page.</p>
      </div>
      <div className="box" style={{ marginTop: 16, maxWidth: 680 }}>
        <h2>Seeing &ldquo;Error creating user account&rdquo;?</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Your browser is blocking Tide&apos;s sign-up page from reaching this W2W server. In Chrome, open the site settings on the Tide
          page and allow <b>Local network access</b>, turn off ad blockers for that page, then try again.
        </p>
      </div>
    </main>
  );
}
