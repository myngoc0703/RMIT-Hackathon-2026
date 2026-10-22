[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

# W2W

_An open art gallery where every view is watermarked with the name of the person looking._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

## Project overview

### The insight

Artists need to be seen, but anything seen can be screenshotted. Hiding work only hurts the artist. WaveToWin accepts that copies will be made and changes what a copy is: **every copy carries the name of the person it was shown to**, so it is never anonymous and never loses the artist's attribution.

### 1. Vision & originality: a different watermark for every viewer

Each visit gets its own watermark, in two layers:

- **Visible:** faint diagonal text across the whole image, `WaveToWin · <viewer> · <date>`. Survives phone photos and resizing.
- **Hidden:** a server-issued view code written into the pixels as tiny brightness changes, repeated across the image. Survives screenshots, crops and light compression.

The art is drawn on a canvas (no image file to save), and a side panel tells the viewer **"This copy is marked for you"** with their label and code. Even an unlocked original is drawn with the collector's own mark.

### 2. Trust constraint insight

Artists today choose between posting openly and being copied without a trace, or hiding their work. A watermark only helps if the name in it can be trusted and the artist, not the platform, controls the original. WaveToWin gives the artist:

- **Control:** visitors get a marked display copy; only the artist can approve, reject or revoke access to the original.
- **Evidence:** every view is logged with its code, viewer and time.
- **A response:** the studio's leak checker reads the hidden mark from a suspected copy and shows who it was shown to and when.

### 3. Value & impact

An illustrator in Saigon can show her full portfolio worldwide instead of blurred previews. Anyone who screenshots it sees their own name on it first. If a copy turns up on a print shop, she drops it into the leak checker, finds the view it came from, revokes that access and has a specific record to back a takedown.

### 4. Why TideCloak matters

A per-viewer watermark is only as good as the identity written into it.

- **Verified names:** for signed-in viewers, the name in the mark comes from a Tide token verified on the server, not from anything the viewer types.
- **No token replay:** tokens are DPoP-bound, and every protected route checks the proof came from the same browser key, so a stolen token is refused.
- **Ownership by identity:** uploading makes your Tide identity the owner. Only that identity can approve originals or trace leaks.
- **No passwords stored:** sign-in goes through TideCloak.

### 5. In the demo (`demo.mp4`)

1. Browse Explore: art is open to everyone.
2. Open an artwork: your name is across it and your hidden code is shown beside it.
3. Request the original, approve it in the artist's studio, unlock it still marked.
4. Crop a screenshot, drop it into the leak checker, and see it name the viewer.

## Honest limits

- Screenshots and phone photos can't be stopped; the aim is traceable copies, not impossible ones.
- The hidden mark doesn't survive heavy resizing, filters or a phone photo, and the visible mark can be painted out.
- Marks are added in the browser, so someone using developer tools could pull the unmarked image. Marking on the server is the next step.
- A trace names the view a copy came from, not necessarily who posted it. Signed-out visitors are only a number.
- Views, requests and email codes are kept in memory for the demo; all art and people are synthetic.

## Setup

**Guest mode** (no TideCloak; gallery and watermarks work, sign-in is off):

```bash
cd app && npm install && npm run dev   # http://localhost:3000
```

**Full setup** (Tide sign-in, studio, leak checker). Needs Docker Desktop, Node.js 20+, `curl`, `jq`.

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
