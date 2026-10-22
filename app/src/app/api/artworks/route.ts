import { allArtists, allArtworks, viewCount } from "@/lib/store";

// Public: the gallery is open to everyone. Only display data is served: no owners, no originals.
export async function GET() {
  return Response.json({
    artists: allArtists(),
    artworks: allArtworks().map((a) => ({ ...a, views: viewCount(a.id) })),
  });
}
