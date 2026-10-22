import { withVerified } from "@/lib/auth/protect";
import { ownedBy, viewCount } from "@/lib/store";

// The signed-in member's own artworks.
export const GET = withVerified(async (_req, jwt) =>
  Response.json({ artworks: ownedBy(String(jwt.sub)).map((a) => ({ ...a, views: viewCount(a.id) })) })
);
