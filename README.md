[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_W2W is an open art gallery where anyone can view an artist's work, but every view is traceable and the original stays in the artist's hands._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

A gallery that doesn't hide art to protect it. Every visitor sees the work, drawn on a canvas with no file to save and marked with that visitor's own visible and invisible watermark. Only the artist decides who gets the full original.

### 2. Trust constraint insight

Today artists must choose: post publicly and get copied, scraped or resold, or hide their work. Platforms hold every original, and whoever runs the backend can hand it out. W2W removes both: copies are traceable, and authority over originals sits with the artist.

### 3. Value & impact

An illustrator in Saigon can show her portfolio worldwide. When a copy appears online, she drops it into the leak checker and sees exactly which view it came from, even after cropping or compression.

### 4. Why TideCloak matters

Every request carries a DPoP-bound Tide token checked on the server. There is no admin role: whoever uploads a work with their Tide identity owns it, and only that identity can approve, reject or revoke access to its original, so neither the platform nor any operator can hand it out.

### 5. Prototype & storytelling

Browse Explore and the most-viewed board, open an artwork and see your mark, request the original, approve it in the studio, then drop a screenshot into the leak checker to name the viewer.

## Setup

### Quick start (guest mode, no TideCloak)

```bash
cd app
npm install
npm run dev      # http://localhost:3000
```

Without `app/data/tidecloak.json` the site runs in guest mode: the gallery, leaderboard, per-viewer watermarks
and artist pages all work, and sign-in is turned off. Protected routes still refuse every request.

### Full setup (Tide sign-in, passkey, studio)

Requirements: Docker Desktop (running), Node.js 20+, `curl`, `jq`.

```bash
cd app
npm install
cp .env.example .env
# In .env set: KC_BOOTSTRAP_ADMIN_PASSWORD (your choice), TIDE_LICENSE_EMAIL (your email),
# and TIDE_TERMS_ACCEPTED=yes only if you agree to https://tide.org/legal
# For the email-code layer also set GMAIL_USER and GMAIL_APP_PASSWORD (a Gmail app password)
npm run init     # starts TideCloak on :8080, creates and licenses the realm, prints an invite link
# open the invite link and complete Tide enrolment; init finishes on its own
npm run dev      # http://localhost:3000
```

## Sign-in layers

1. **Tide sign-in** (TideCloak broker): no password database on our side.
2. **Passkey** (TideCloak post-login flow `wavetowin-passkey`): Touch ID or a security key, registered on first sign-in.
3. **Gmail code** (our server, bound to the Tide token's `sub`): requesting originals, the studio and the leak checker are refused until a 6-digit code sent from Gmail is confirmed.

## Honest limits

- No website can stop a screenshot or a phone photo of the screen. W2W makes copies traceable instead: the hidden mark survives screenshots, crops and light compression, and the visible mark covers phone photos and resizing.
- TideCloak 26.7 has no built-in email-code step, so the Gmail code is enforced by our server rather than inside TideCloak.
- The view log, requests and email verifications are kept in memory for the demo; all art and people are synthetic.

## Repository layout

- `app/`: the W2W Next.js app (from Tide's `nextjs-customer-portal` template)
  - `src/app/page.tsx`: Explore, with search, categories and the most-viewed board
  - `src/app/art/[id]`: artwork view; each visit gets its own watermark code
  - `src/app/studio`: every member's studio: upload, approvals for their own works, and the leak checker
  - `src/app/access`: the access-rights page (visitor, member, licensed collector, artist)
  - `src/lib/watermark.ts`: invisible watermark embed and decode
  - `src/app/api/*`: public gallery routes, and Tide-protected request and leak routes
- `demo.mp4`: two-minute demo video
