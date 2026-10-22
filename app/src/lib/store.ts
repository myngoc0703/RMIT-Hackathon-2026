// In-memory demo store (resets when the server restarts): uploaded artworks and their originals,
// view log, view counts and licence requests.
//
// Access model (no admin role): whoever uploads an artwork with their Tide identity owns it, and
// only that identity (the token's `sub`) can approve, reject or revoke access to it.
import { createHash } from "crypto";
import { ARTISTS, ARTWORKS, type Artist, type Artwork } from "./gallery";

export type ViewRecord = { code: number; artworkId: string; viewer: string; signedIn: boolean; at: string };
export type LicenceRequest = {
  id: string;
  artworkId: string;
  requester: string; // Tide-verified username
  requesterSub: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  at: string;
};

type Store = {
  views: ViewRecord[];
  counts: Record<string, number>;
  requests: LicenceRequest[];
  next: number;
  uploads: Artwork[];
  uploadArtists: Artist[];
  owners: Record<string, string>; // artworkId -> owner's Tide sub
  originals: Record<string, string>; // artworkId -> full-quality original (data URL), never public
};
const g = globalThis as unknown as { __w2w?: Store };
const s: Store = (g.__w2w ??= {
  views: [],
  counts: Object.fromEntries(ARTWORKS.map((a) => [a.id, a.baseViews])),
  requests: [],
  next: 4821,
  uploads: [],
  uploadArtists: [],
  owners: {},
  originals: {},
});
s.uploads ??= [];
s.uploadArtists ??= [];
s.owners ??= {};
s.originals ??= {};

// Public listings never include owners or originals.
export const allArtworks = (): Artwork[] => [...s.uploads, ...ARTWORKS];
export const allArtists = (): Artist[] => [...s.uploadArtists, ...ARTISTS];
export const findArtwork = (id: string) => allArtworks().find((a) => a.id === id);
export const isOwner = (artworkId: string, sub: string) => !!sub && s.owners[artworkId] === sub;
export const ownedBy = (sub: string) => s.uploads.filter((a) => s.owners[a.id] === sub);
export const originalOf = (artworkId: string) => s.originals[artworkId];
export const artistIdFor = (sub: string) => `m-${createHash("sha256").update(sub).digest("hex").slice(0, 10)}`;

export function addUpload(
  sub: string,
  username: string,
  input: { title: string; category: Artwork["category"]; licence: boolean; ratio: number; display: string; original: string }
): Artwork {
  const artistId = artistIdFor(sub);
  if (!s.uploadArtists.some((a) => a.id === artistId)) {
    s.uploadArtists.unshift({ id: artistId, name: username, city: "W2W member", bio: "Uploads sealed by their own Tide identity.", wall: "paper", layout: "grid" });
  }
  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "artwork";
  const id = `${slug}-${Date.now().toString(36)}`;
  const art: Artwork = {
    id, title: input.title, artistId, category: input.category, year: new Date().getFullYear(),
    bg: "#2340c7", shapes: [], ratio: input.ratio, baseViews: 0, licence: input.licence, image: input.display,
  };
  s.uploads.unshift(art);
  s.owners[id] = sub;
  s.originals[id] = input.original;
  s.counts[id] = 0;
  return art;
}

export function recordView(artworkId: string, viewer: string | null): ViewRecord {
  const code = s.next++;
  const rec = { code, artworkId, viewer: viewer ?? `visitor #${code}`, signedIn: !!viewer, at: new Date().toISOString() };
  s.views.unshift(rec);
  s.counts[artworkId] = (s.counts[artworkId] ?? 0) + 1;
  return rec;
}

export const findView = (code: number) => s.views.find((v) => v.code === code);
export const viewCount = (id: string) => s.counts[id] ?? 0;
export const requests = () => s.requests;
export const hasApproval = (artworkId: string, sub: string) =>
  s.requests.some((r) => r.artworkId === artworkId && r.requesterSub === sub && r.status === "approved");

export function addRequest(artworkId: string, requester: string, requesterSub: string) {
  const existing = s.requests.find(
    (r) => r.artworkId === artworkId && r.requesterSub === requesterSub && (r.status === "pending" || r.status === "approved")
  );
  if (existing) return existing;
  const r: LicenceRequest = { id: `req-${s.requests.length + 1}`, artworkId, requester, requesterSub, status: "pending", at: new Date().toISOString() };
  s.requests.unshift(r);
  return r;
}

export function setRequestStatus(id: string, status: LicenceRequest["status"]) {
  const r = s.requests.find((x) => x.id === id);
  if (r) r.status = status;
  return r;
}

// Social: who follows whom, and counters for accomplishments. Keyed by Tide `sub`.
type Social = { follows: Record<string, string[]>; names: Record<string, string>; leaksTraced: Record<string, number> };
const gs = globalThis as unknown as { __w2wSocial?: Social };
const social: Social = (gs.__w2wSocial ??= { follows: {}, names: {}, leaksTraced: {} });

export const rememberName = (sub: string, name: string) => { social.names[sub] = name; };
export const following = (sub: string) => social.follows[sub] ?? [];

export function setFollow(sub: string, artistId: string, on: boolean) {
  const list = new Set(following(sub));
  if (on) list.add(artistId); else list.delete(artistId);
  social.follows[sub] = [...list];
  return social.follows[sub];
}

// Members following this artist (real follows only; seeded artists also show a synthetic count).
export const followersOf = (artistId: string) =>
  Object.entries(social.follows).filter(([, ids]) => ids.includes(artistId)).map(([sub]) => social.names[sub] ?? "member");

export const countLeakTraced = (sub: string) => { social.leaksTraced[sub] = (social.leaksTraced[sub] ?? 0) + 1; };

export function profileOf(sub: string) {
  const works = ownedBy(sub);
  const views = works.reduce((n, a) => n + viewCount(a.id), 0);
  const approvedForMe = requests().filter((r) => r.requesterSub === sub && r.status === "approved").length;
  const approvedByMe = requests().filter((r) => isOwner(r.artworkId, sub) && r.status === "approved").length;
  const followers = followersOf(artistIdFor(sub));
  const traced = social.leaksTraced[sub] ?? 0;
  const badges = [
    { id: "first-upload", label: "First upload", hint: "Upload one artwork", earned: works.length >= 1 },
    { id: "gallery-five", label: "Gallery of five", hint: "Upload five artworks", earned: works.length >= 5 },
    { id: "hundred-views", label: "100 marked views", hint: "Get 100 views on your work", earned: views >= 100 },
    { id: "first-collector", label: "First collector", hint: "Approve someone's request", earned: approvedByMe >= 1 },
    { id: "collector", label: "Collector", hint: "Get an original approved for you", earned: approvedForMe >= 1 },
    { id: "rising", label: "Rising artist", hint: "Reach three followers", earned: followers.length >= 3 },
    { id: "leak-hunter", label: "Leak hunter", hint: "Trace a leaked copy", earned: traced >= 1 },
  ];
  return {
    artistId: artistIdFor(sub),
    stats: { works: works.length, views, approvedByMe, approvedForMe, followers: followers.length, following: following(sub).length, traced },
    badges,
    followers,
    following: following(sub).map((id) => allArtists().find((a) => a.id === id)).filter(Boolean),
  };
}
