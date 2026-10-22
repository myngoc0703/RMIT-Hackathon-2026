import { ARTIST_FOLLOWERS } from "@/lib/gallery";
import { allArtists, allArtworks, followersOf, viewCount } from "@/lib/store";

// Public: the gallery is open to everyone. Only display data is served: no owners, no originals.
export async function GET() {
  return Response.json({
    artists: allArtists().map((a) => ({ ...a, followers: (ARTIST_FOLLOWERS[a.id] ?? 0) + followersOf(a.id).length })),
    artworks: allArtworks().map((a) => ({ ...a, views: viewCount(a.id) })),
  });
}
