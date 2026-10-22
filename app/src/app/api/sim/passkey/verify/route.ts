import { NextRequest } from "next/server";
import { SIMULATED_TIDE } from "@/lib/authMode";
import { passkeyVerify } from "@/lib/sim/tidecloak";

// Passkey step, part 2: verify the browser's WebAuthn response, then exchange the ticket for a token.
export async function POST(req: NextRequest) {
  if (!SIMULATED_TIDE) return Response.json({ error: "Not available" }, { status: 404 });
  const { ticket, mode, response } = await req.json().catch(() => ({}));
  if ((mode !== "register" && mode !== "authenticate") || !response) return Response.json({ error: "Missing passkey response." }, { status: 400 });
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const r = await passkeyVerify(String(ticket ?? ""), origin, req.nextUrl.hostname, { mode, response });
  return "error" in r ? Response.json(r, { status: 401 }) : Response.json(r);
}
