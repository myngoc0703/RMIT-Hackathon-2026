import { NextRequest } from "next/server";
import { SIMULATED_TIDE } from "@/lib/authMode";
import { passkeyOptions } from "@/lib/sim/tidecloak";

// Passkey step, part 1: WebAuthn options to register a new passkey, or to use an existing one.
export async function POST(req: NextRequest) {
  if (!SIMULATED_TIDE) return Response.json({ error: "Not available" }, { status: 404 });
  const { ticket } = await req.json().catch(() => ({}));
  const r = await passkeyOptions(String(ticket ?? ""), req.nextUrl.hostname);
  return "error" in r ? Response.json(r, { status: 401 }) : Response.json(r);
}
