import { ARTWORKS, ARTISTS } from "@/lib/gallery";
import { viewCount } from "@/lib/store";

// Public: the gallery is open to everyone. Only display data is served; there is no original file here.
export async function GET() {
  return Response.json({
    artists: ARTISTS,
    artworks: ARTWORKS.map((a) => ({ ...a, views: viewCount(a.id) })),
  });
}
