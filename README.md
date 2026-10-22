[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

# W2W

_An open art gallery where every view is watermarked with the name of the person looking._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

## Project overview

### The insight

Anything seen can be screenshotted, so W2W changes what a copy is: **every copy carries the name of the person it was shown to**.

### 1. Vision & originality: a different watermark for every viewer

Each visit gets its own watermark:

- **Visible:** faint diagonal text, `W2W · <viewer> · <date>`; survives phone photos.
- **Hidden:** a server-issued view code in the pixels; survives screenshots and crops.

Art is drawn on a canvas with no file to save; unlocked originals are marked too.

### 2. Trust constraint insight

Artists either post openly and get copied untraced, or hide their work. W2W gives them:

- **Control:** only the artist can approve, reject or revoke access to originals.
- **Evidence:** every view is logged with code, viewer and time.
- **A response:** the leak checker reads a copy's hidden mark and names who saw it.

### 3. Value & impact

An illustrator in Saigon shows her full portfolio, not blurred previews. When a copy turns up at a print shop, she finds its view, revokes access and has a takedown record.

### 4. Why TideCloak matters

A watermark is only as good as the identity in it.

- **Verified names:** a signed-in viewer's mark comes from a server-verified Tide token.
- **No token replay:** DPoP-bound tokens are checked on every protected route.
- **Ownership by identity:** only the uploader's Tide identity approves originals or traces leaks.
- **No passwords stored.**

### 5. Prototype & storytelling: the demo (`demo.mp4`)

1. Explore: art is open to everyone.
2. Open an artwork: your name is across it.
3. Request the original, approve it in the studio, unlock it still marked.
4. Drop a cropped screenshot into the leak checker; it names the viewer.

## Honest limits

- During the hackathon the Tide network failed account creation, so the demo runs on a **simulated TideCloak**: the same sign-in steps, token claims and server-side checks, with a local signing key instead of Tide's threshold keys and no DPoP binding. `W2W_AUTH_MODE=tide` switches to the real realm.
- Screenshots and phone photos can't be stopped; the aim is traceable copies, not impossible ones.
- The hidden mark doesn't survive heavy resizing, filters or a phone photo, and the visible mark can be painted out.
- Marks are added in the browser, so someone using developer tools could pull the unmarked image. Marking on the server is the next step.
- A trace names the view a copy came from, not necessarily who posted it. Signed-out visitors are only a number.
- Views, requests and email codes are kept in memory for the demo; all art and people are synthetic.

## Setup

**Quick start** (simulated TideCloak; every flow works, no Docker needed). Sign in with the demo accounts on the simulated TideCloak page:

```bash
cd app && npm install && npm run dev   # http://localhost:3000
```

**Real TideCloak** (`W2W_AUTH_MODE=tide` in `app/.env`). Needs Docker Desktop, Node.js 20+, `curl`, `jq`. See [docs/TIDECLOAK_PLAN.md](docs/TIDECLOAK_PLAN.md) for where TideCloak fits.

```bash
cd app
npm install
cp .env.example .env
# Set KC_BOOTSTRAP_ADMIN_PASSWORD, TIDE_LICENSE_EMAIL, and TIDE_TERMS_ACCEPTED=yes if you agree to https://tide.org/legal
# For the email-code step also set GMAIL_USER and GMAIL_APP_PASSWORD
npm run init   # starts TideCloak on :8080 and prints an invite link; complete Tide enrolment
npm run dev
```

Originals, the studio and the leak checker also need a 6-digit Gmail code, checked by our server (TideCloak 26.7 has no built-in email-code step).

**Key files:** `app/src/lib/watermark.ts` (hidden mark), `app/src/components/ArtCanvas.tsx` (drawing both marks), `app/src/app/studio` (approvals and leak checker), `app/src/app/api` (protected routes).
