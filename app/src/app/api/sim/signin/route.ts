import { NextRequest } from "next/server";
import { SIMULATED_TIDE } from "@/lib/authMode";
import { signIn } from "@/lib/sim/tidecloak";

// Simulated TideCloak: sign in. Returns a short-lived ticket for the passkey step, never a token.
export async function POST(req: NextRequest) {
  if (!SIMULATED_TIDE) return Response.json({ error: "Not available" }, { status: 404 });
  const { username, password } = await req.json().catch(() => ({}));
  const r = signIn(String(username ?? "").trim().toLowerCase(), String(password ?? ""));
  return "error" in r ? Response.json(r, { status: 401 }) : Response.json(r);
}
