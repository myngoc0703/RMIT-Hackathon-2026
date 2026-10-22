import { NextRequest } from "next/server";
import { SIMULATED_TIDE } from "@/lib/authMode";
import { USERNAME, signUp } from "@/lib/sim/tidecloak";

// Simulated TideCloak: create an account. Returns a short-lived ticket for the passkey step.
export async function POST(req: NextRequest) {
  if (!SIMULATED_TIDE) return Response.json({ error: "Not available" }, { status: 404 });
  const { username, password } = await req.json().catch(() => ({}));
  const u = String(username ?? "").trim().toLowerCase();
  if (!USERNAME.test(u)) return Response.json({ error: "Use 3–24 letters, numbers, dots, dashes or underscores." }, { status: 400 });
  if (typeof password !== "string" || password.length < 8) return Response.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  const r = signUp(u, password);
  return "error" in r ? Response.json(r, { status: 409 }) : Response.json(r);
}
