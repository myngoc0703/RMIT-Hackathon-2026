import { NextRequest } from "next/server";
import { SIMULATED_TIDE } from "@/lib/authMode";
import { completePasskey } from "@/lib/sim/tidecloak";

// Simulated TideCloak post-login passkey step: exchanges a sign-in ticket, once, for an access token.
export async function POST(req: NextRequest) {
  if (!SIMULATED_TIDE) return Response.json({ error: "Not available" }, { status: 404 });
  const { ticket } = await req.json().catch(() => ({}));
  const r = await completePasskey(String(ticket ?? ""));
  return "error" in r ? Response.json(r, { status: 401 }) : Response.json(r);
}
