import { NextRequest } from "next/server";
import { verifyTideJWT, hasRole, extractToken } from "./tideJWT";
import { verifyDpop } from "./verifyDpop";
import type { JWTPayload } from "jose";

// Playbook: verify-jwt-server-side Step 5
type AuthHandler = (req: NextRequest, jwt: JWTPayload) => Promise<Response>;

export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest) => {
    try {
      const token = extractToken(req.headers.get("authorization"));
      const jwt = await verifyTideJWT(token);
      // The signature alone is not enough. This realm issues sender-constrained tokens (cnf.jkt),
      // and without checking the DPoP proof a stolen token replays as a plain `Bearer` and passes
      // (AP-43). verifyDpop rejects an unbound token, a Bearer-scheme replay, a proof signed by a
      // different key, and a proof for another URL or method. It throws; the catch below answers 401.
      await verifyDpop(req, token, jwt as { cnf?: { jkt?: string } });
      return handler(req, jwt);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Unauthorized" },
        { status: 401 }
      );
    }
  };
}

export function withRole(role: string, handler: AuthHandler) {
  return withAuth(async (req, jwt) => {
    if (!hasRole(jwt, role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, jwt);
  });
}

// For public routes that behave differently for signed-in users: returns the verified token or null.
// A present-but-invalid token is treated as signed out, never as a partial identity.
export async function optionalAuth(req: NextRequest): Promise<JWTPayload | null> {
  const header = req.headers.get("authorization");
  if (!header) return null;
  try {
    const token = extractToken(header);
    const jwt = await verifyTideJWT(token);
    await verifyDpop(req, token, jwt as { cnf?: { jkt?: string } });
    return jwt;
  } catch {
    return null;
  }
}

// Second layer: the Tide identity must also have confirmed a Gmail code (see lib/emailVerify).
async function emailCheck(jwt: JWTPayload): Promise<Response | null> {
  const { verifiedEmail } = await import("../emailVerify");
  return verifiedEmail(String(jwt.sub))
    ? null
    : Response.json({ error: "Verify your email first", needsEmail: true }, { status: 403 });
}

export function withVerified(handler: AuthHandler) {
  return withAuth(async (req, jwt) => (await emailCheck(jwt)) ?? handler(req, jwt));
}

export function withVerifiedRole(role: string, handler: AuthHandler) {
  return withRole(role, async (req, jwt) => (await emailCheck(jwt)) ?? handler(req, jwt));
}
