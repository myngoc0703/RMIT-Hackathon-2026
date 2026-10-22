// Second sign-in layer: a 6-digit code sent from Gmail to the user's address. The pending code and
// the verified address are keyed by the Tide token's `sub`, so a code only ever unlocks the Tide
// identity that asked for it. In memory for the demo (verification resets when the server restarts).
import { createHash, randomInt, timingSafeEqual } from "crypto";
import nodemailer from "nodemailer";

type Pending = { email: string; hash: string; expires: number; tries: number };
type State = { pending: Record<string, Pending>; verified: Record<string, string> };
const g = globalThis as unknown as { __w2wVerify?: State };
const s: State = (g.__w2wVerify ??= { pending: {}, verified: {} });

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
export const verifiedEmail = (sub: string) => s.verified[sub] ?? null;
export const emailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

export async function startVerification(sub: string, email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  s.pending[sub] = { email, hash: sha(code), expires: Date.now() + 10 * 60_000, tries: 0 };
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({
    from: `WaveToWin <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Your WaveToWin code: ${code}`,
    text: `Your WaveToWin verification code is ${code}. It expires in 10 minutes.\nIf you didn't try to sign in, ignore this email.`,
  });
}

export function confirmVerification(sub: string, code: string): "ok" | "expired" | "wrong" | "locked" | "none" {
  const p = s.pending[sub];
  if (!p) return "none";
  if (Date.now() > p.expires) { delete s.pending[sub]; return "expired"; }
  if (p.tries >= 5) { delete s.pending[sub]; return "locked"; }
  p.tries++;
  const a = Buffer.from(sha(code.trim())), b = Buffer.from(p.hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "wrong";
  s.verified[sub] = p.email;
  delete s.pending[sub];
  return "ok";
}
