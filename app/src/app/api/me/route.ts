import { withVerified } from "@/lib/auth/protect";
import { profileOf, rememberName } from "@/lib/store";

// The signed-in member's own profile: accomplishments, who they follow, who follows them.
export const GET = withVerified(async (_req, jwt) => {
  const sub = String(jwt.sub);
  rememberName(sub, String(jwt.preferred_username ?? "member"));
  return Response.json({ username: jwt.preferred_username ?? "member", ...profileOf(sub) });
});
