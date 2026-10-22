import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { allArtists, artistIdFor, rememberName, setFollow } from "@/lib/store";

// Members follow or unfollow an artist. You can't follow yourself.
export const POST = withVerified(async (req: NextRequest, jwt) => {
  const { artistId, follow } = await req.json().catch(() => ({}));
  const sub = String(jwt.sub);
  if (!allArtists().some((a) => a.id === artistId)) return Response.json({ error: "Not found" }, { status: 404 });
  if (artistId === artistIdFor(sub)) return Response.json({ error: "You can't follow yourself." }, { status: 400 });
  rememberName(sub, String(jwt.preferred_username ?? "member"));
  return Response.json({ following: setFollow(sub, artistId, !!follow) });
});
