import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/protect";
import { emailConfigured, startVerification } from "@/lib/emailVerify";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends a 6-digit code to the address the signed-in Tide user gives.
export const POST = withAuth(async (req: NextRequest, jwt) => {
  if (!emailConfigured()) return Response.json({ error: "Email sending isn't set up yet (GMAIL_USER / GMAIL_APP_PASSWORD)." }, { status: 503 });
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !EMAIL.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    await startVerification(String(jwt.sub), email.trim().toLowerCase());
  } catch (e) {
    console.error("verify/start: send failed", e);
    return Response.json({ error: "Couldn't send the code. Check the Gmail app password and try again." }, { status: 502 });
  }
  return Response.json({ sent: true });
});
