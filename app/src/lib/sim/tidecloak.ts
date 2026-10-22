// Simulated TideCloak (server only). Stands in for the real realm while the Tide network is
// unavailable: accounts, a post-login passkey step, and TideCloak-shaped access tokens signed with
// a local ES256 key and verified on every protected route. In memory; resets on restart.
//
// The passkey step is real: WebAuthn (Touch ID, Windows Hello, a security key) via @simplewebauthn.
// Browsers only allow it on localhost or HTTPS, so each laptop runs its own copy on localhost.
//
// What it does NOT simulate: Tide's threshold keys (PRISM/ORKs), DPoP proof binding and IGA quorum.
// Those come back when W2W_AUTH_MODE=tide.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { SignJWT, exportJWK, generateKeyPair, jwtVerify, type JWTPayload } from "jose";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";

export const SIM_ISSUER = "http://localhost:3000/sim-tidecloak/realms/w2w";
export const SIM_CLIENT = "w2w-client";
const DEFAULT_ROLES = ["appUser", "_tide_enabled", "default-roles-w2w"];

type SimUser = { sub: string; username: string; salt: string; hash: string; passkey: boolean; credentials: WebAuthnCredential[] };
type Ticket = { sub: string; expires: number; challenge?: string };
type State = { keys?: { privateKey: CryptoKey; publicKey: CryptoKey }; users: Record<string, SimUser>; tickets: Record<string, Ticket> };
const g = globalThis as unknown as { __w2wSimTide?: State };
const s: State = (g.__w2wSimTide ??= { users: {}, tickets: {} });

async function keys() {
  s.keys ??= await generateKeyPair("ES256");
  return s.keys;
}

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 32).toString("hex");
export const USERNAME = /^[a-z0-9][a-z0-9._-]{2,23}$/;

function newTicket(sub: string) {
  const id = randomBytes(18).toString("base64url");
  s.tickets[id] = { sub, expires: Date.now() + 5 * 60_000 };
  return id;
}

export function signUp(username: string, password: string) {
  if (s.users[username]) return { error: "That username is taken. Choose another, or sign in." } as const;
  const salt = randomBytes(16).toString("hex");
  const sub = randomBytes(16).toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4-");
  s.users[username] = { sub, username, salt, hash: hashPassword(password, salt), passkey: false, credentials: [] };
  return { ticket: newTicket(sub), passkeyRegistered: false } as const;
}

export function signIn(username: string, password: string) {
  const u = s.users[username];
  const ok = !!u && timingSafeEqual(Buffer.from(hashPassword(password, u.salt), "hex"), Buffer.from(u.hash, "hex"));
  if (!u || !ok) return { error: "Wrong username or password." } as const;
  return { ticket: newTicket(u.sub), passkeyRegistered: (u.credentials ?? []).length > 0 } as const;
}

// The post-login passkey step (TideCloak flow `wavetowin-passkey`). A fresh sign-in ticket must be
// paired with a verified WebAuthn ceremony before it can be exchanged, once, for a token.
function liveTicket(ticketId: string) {
  const t = s.tickets[ticketId];
  if (!t || Date.now() > t.expires) return null;
  const u = Object.values(s.users).find((x) => x.sub === t.sub);
  return u ? { t, u } : null;
}

const EXPIRED = { error: "Your sign-in expired. Sign in again." } as const;

export async function passkeyOptions(ticketId: string, rpID: string) {
  const live = liveTicket(ticketId);
  if (!live) return EXPIRED;
  const { t, u } = live;
  u.credentials ??= [];
  if (u.credentials.length === 0) {
    const options = await generateRegistrationOptions({
      rpName: "W2W",
      rpID,
      userName: u.username,
      userID: new TextEncoder().encode(u.sub),
      attestationType: "none",
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });
    t.challenge = options.challenge;
    return { mode: "register" as const, options };
  }
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: u.credentials.map((c) => ({ id: c.id, transports: c.transports })),
  });
  t.challenge = options.challenge;
  return { mode: "authenticate" as const, options };
}

export async function passkeyVerify(
  ticketId: string,
  origin: string,
  rpID: string,
  body: { mode: "register"; response: RegistrationResponseJSON } | { mode: "authenticate"; response: AuthenticationResponseJSON }
) {
  const live = liveTicket(ticketId);
  if (!live || !live.t.challenge) return EXPIRED;
  const { t, u } = live;
  const expected = { expectedChallenge: t.challenge!, expectedOrigin: origin, expectedRPID: rpID };
  try {
    if (body.mode === "register") {
      const r = await verifyRegistrationResponse({ response: body.response, ...expected });
      if (!r.verified || !r.registrationInfo) return { error: "Your passkey couldn't be registered. Try again." } as const;
      u.credentials.push(r.registrationInfo.credential);
    } else {
      const cred = u.credentials.find((c) => c.id === body.response.id);
      if (!cred) return { error: "That passkey isn't registered for this account." } as const;
      const r = await verifyAuthenticationResponse({ response: body.response, ...expected, credential: cred });
      if (!r.verified) return { error: "Your passkey couldn't be verified. Try again." } as const;
      cred.counter = r.authenticationInfo.newCounter;
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Passkey check failed." } as const;
  }
  delete s.tickets[ticketId];
  u.passkey = true;
  return { token: await issueToken(u) } as const;
}

async function issueToken(u: SimUser) {
  const vuid = createHash("sha256").update("vuid:" + u.sub).digest("hex");
  const { privateKey } = await keys();
  return new SignJWT({
    preferred_username: u.username,
    azp: SIM_CLIENT,
    realm_access: { roles: DEFAULT_ROLES },
    vuid,
    tideuserkey: createHash("sha256").update("key:" + u.sub).digest("hex").slice(0, 64),
    amr: ["tide", "passkey"],
  })
    .setProtectedHeader({ alg: "ES256", kid: "sim-tidecloak" })
    .setIssuer(SIM_ISSUER)
    .setSubject(u.sub)
    .setAudience(SIM_CLIENT)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

// Same checks as verifyTideJWT for the real realm: signature, issuer, audience/azp, expiry.
export async function verifySimToken(token: string): Promise<JWTPayload> {
  const { publicKey } = await keys();
  const { payload } = await jwtVerify(token, publicKey, { issuer: SIM_ISSUER, audience: SIM_CLIENT });
  if (payload.azp !== SIM_CLIENT) throw new Error("Token azp does not match client");
  return payload;
}

export async function simJwks() {
  const { publicKey } = await keys();
  return { keys: [{ ...(await exportJWK(publicKey)), kid: "sim-tidecloak", alg: "ES256", use: "sig" }] };
}
