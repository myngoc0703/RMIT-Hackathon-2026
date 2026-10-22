import { withAuth } from "@/lib/auth/protect";
import { emailConfigured, verifiedEmail } from "@/lib/emailVerify";
import { SIMULATED_TIDE } from "@/lib/authMode";

// Signed-in user's second-layer status.
export const GET = withAuth(async (_req, jwt) =>
  Response.json({ verified: !!verifiedEmail(String(jwt.sub)), email: verifiedEmail(String(jwt.sub)), configured: emailConfigured() || SIMULATED_TIDE, simulatedInbox: SIMULATED_TIDE && !emailConfigured() })
);
