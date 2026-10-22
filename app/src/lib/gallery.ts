// Synthetic artists and artworks. Each artwork is a small vector "painting" drawn on canvas,
// so the demo needs no image files and the original only ever exists inside ArtCanvas.

export type Shape =
  | { k: "rect"; x: number; y: number; w: number; h: number; c: string; r?: number; rot?: number }
  | { k: "circle"; x: number; y: number; r: number; c: string };

export type Artwork = {
  id: string;
  title: string;
  artistId: string;
  category: "painting" | "illustration" | "photography";
  year: number;
  bg: string;
  shapes: Shape[]; // coordinates are fractions of width/height (0..1)
  ratio: number; // height / width
  baseViews: number;
  licence: boolean;
  image?: string; // uploaded works: the low-resolution display copy (data URL)
};

export type Artist = {
  id: string;
  name: string;
  city: string;
  bio: string;
  wall: "velvet" | "paper" | "concrete";
  layout: "grid" | "salon" | "spotlight";
};

export const ARTISTS: Artist[] = [
  { id: "linh-tran", name: "Linh Tran", city: "Saigon", bio: "Painting light after rain.", wall: "velvet", layout: "spotlight" },
  { id: "duc-le", name: "Duc Le", city: "Hanoi", bio: "Old streets, new colours.", wall: "concrete", layout: "salon" },
  { id: "mai-ho", name: "Mai Ho", city: "Hanoi", bio: "Paper, folds and festivals.", wall: "paper", layout: "grid" },
  { id: "ana-souza", name: "Ana Souza", city: "Lisbon", bio: "Gardens by the sea.", wall: "paper", layout: "salon" },
  { id: "lea-martin", name: "Léa Martin", city: "Lyon", bio: "Quiet hours, blue light.", wall: "velvet", layout: "grid" },
  { id: "sam-ito", name: "Sam Ito", city: "Melbourne", bio: "Lines and tide pools.", wall: "concrete", layout: "grid" },
];

export const ARTWORKS: Artwork[] = [
  { id: "monsoon-dusk", title: "Monsoon Dusk", artistId: "linh-tran", category: "painting", year: 2026, bg: "#2B3A4A", ratio: 0.62, baseViews: 12400, licence: true,
    shapes: [{ k: "rect", x: 0, y: 0.55, w: 1, h: 0.45, c: "#1F2B38" }, { k: "rect", x: 0, y: 0.6, w: 1, h: 0.08, c: "#3E5568" }, { k: "circle", x: 0.72, y: 0.3, r: 0.12, c: "#E8A65C" }] },
  { id: "old-quarter", title: "Old Quarter", artistId: "duc-le", category: "painting", year: 2025, bg: "#6B3A2E", ratio: 0.75, baseViews: 9800, licence: true,
    shapes: [{ k: "rect", x: 0.15, y: 0.25, w: 0.7, h: 0.5, c: "#D9B48A" }, { k: "rect", x: 0.42, y: 0.45, w: 0.16, h: 0.3, c: "#6B3A2E" }] },
  { id: "salt-garden", title: "Salt Garden", artistId: "ana-souza", category: "painting", year: 2026, bg: "#D8D2C4", ratio: 0.8, baseViews: 7100, licence: false,
    shapes: [{ k: "circle", x: 0.3, y: 0.5, r: 0.2, c: "#5E7B5C" }, { k: "circle", x: 0.65, y: 0.62, r: 0.1, c: "#8FA889" }] },
  { id: "paper-cranes", title: "Paper Cranes", artistId: "mai-ho", category: "illustration", year: 2026, bg: "#B9433A", ratio: 0.7, baseViews: 5600, licence: true,
    shapes: [{ k: "rect", x: 0.3, y: 0.3, w: 0.4, h: 0.3, c: "#F1E6D6", rot: -12 }, { k: "rect", x: 0.55, y: 0.6, w: 0.2, h: 0.14, c: "#F1E6D6", rot: 18 }] },
  { id: "blue-hour", title: "Blue Hour", artistId: "lea-martin", category: "photography", year: 2025, bg: "#1E3A5F", ratio: 0.66, baseViews: 4200, licence: false,
    shapes: [{ k: "rect", x: 0, y: 0.65, w: 1, h: 0.35, c: "#4A6E95" }, { k: "circle", x: 0.2, y: 0.25, r: 0.05, c: "#EDE9E3" }] },
  { id: "lotus-field", title: "Lotus Field", artistId: "linh-tran", category: "painting", year: 2026, bg: "#3D4F3A", ratio: 1.1, baseViews: 3100, licence: true,
    shapes: [{ k: "circle", x: 0.5, y: 0.5, r: 0.3, c: "#E3C77A" }, { k: "circle", x: 0.5, y: 0.5, r: 0.12, c: "#C9785A" }] },
  { id: "night-market", title: "Night Market", artistId: "duc-le", category: "painting", year: 2026, bg: "#4A2E4D", ratio: 1.25, baseViews: 2400, licence: true,
    shapes: [{ k: "rect", x: 0, y: 0.5, w: 1, h: 0.5, c: "#8C4F6E" }, { k: "circle", x: 0.3, y: 0.35, r: 0.05, c: "#F2C14E" }, { k: "circle", x: 0.6, y: 0.3, r: 0.05, c: "#F2C14E" }] },
  { id: "tide-pools", title: "Tide Pools", artistId: "sam-ito", category: "photography", year: 2025, bg: "#2F6F73", ratio: 0.9, baseViews: 1700, licence: false,
    shapes: [{ k: "rect", x: 0.6, y: 0.62, w: 0.25, h: 0.25, c: "#F2D7B6", r: 0.02 }, { k: "circle", x: 0.3, y: 0.4, r: 0.12, c: "#4E9A9E" }] },
  { id: "red-lantern", title: "Red Lantern", artistId: "mai-ho", category: "illustration", year: 2026, bg: "#8E2F2A", ratio: 1.0, baseViews: 1200, licence: true,
    shapes: [{ k: "rect", x: 0.4, y: 0.25, w: 0.2, h: 0.4, c: "#F2C14E", r: 0.08 }, { k: "rect", x: 0.48, y: 0.12, w: 0.04, h: 0.13, c: "#2C2A28" }] },
  { id: "line-study", title: "Line Study", artistId: "sam-ito", category: "illustration", year: 2026, bg: "#E6DDD0", ratio: 0.75, baseViews: 980, licence: false,
    shapes: [{ k: "rect", x: 0.1, y: 0.4, w: 0.8, h: 0.03, c: "#2C2A28" }, { k: "rect", x: 0.25, y: 0.15, w: 0.03, h: 0.7, c: "#2C2A28" }] },
  { id: "harvest", title: "Harvest", artistId: "ana-souza", category: "painting", year: 2025, bg: "#C98E3E", ratio: 0.85, baseViews: 860, licence: true,
    shapes: [{ k: "rect", x: 0, y: 0, w: 1, h: 0.4, c: "#F0D9A8" }, { k: "circle", x: 0.8, y: 0.2, r: 0.08, c: "#E8A65C" }] },
  { id: "morning-ferry", title: "Morning Ferry", artistId: "lea-martin", category: "photography", year: 2026, bg: "#8FA6B8", ratio: 0.6, baseViews: 640, licence: true,
    shapes: [{ k: "rect", x: 0, y: 0.7, w: 1, h: 0.3, c: "#4C6478" }, { k: "rect", x: 0.35, y: 0.58, w: 0.3, h: 0.12, c: "#EDE9E3" }] },
];

export const artistById = (id: string) => ARTISTS.find((a) => a.id === id);
export const artworkById = (id: string) => ARTWORKS.find((a) => a.id === id);

// Search tags and trending topics (synthetic).
export const ARTWORK_TAGS: Record<string, string[]> = {
  "monsoon-dusk": ["rain", "dusk", "seascape"],
  "old-quarter": ["street", "architecture"],
  "salt-garden": ["garden", "botanical"],
  "paper-cranes": ["festival", "origami"],
  "blue-hour": ["night", "seascape"],
  "lotus-field": ["botanical", "watercolour"],
  "night-market": ["night", "street", "festival"],
  "tide-pools": ["seascape", "ocean"],
  "red-lantern": ["festival", "ink"],
  "line-study": ["ink", "minimal"],
  "harvest": ["botanical", "watercolour"],
  "morning-ferry": ["seascape", "travel"],
};
export const TRENDING = ["seascape", "festival", "watercolour", "night", "ink", "Saigon"];
export const ARTIST_FOLLOWERS: Record<string, number> = {
  "linh-tran": 4820, "duc-le": 3110, "mai-ho": 2650, "ana-souza": 1980, "lea-martin": 1430, "sam-ito": 960,
};
