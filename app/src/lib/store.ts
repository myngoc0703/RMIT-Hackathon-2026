// In-memory demo store (resets when the server restarts): view log, view counts and licence requests.
import { ARTWORKS } from "./gallery";

export type ViewRecord = { code: number; artworkId: string; viewer: string; signedIn: boolean; at: string };
export type LicenceRequest = {
  id: string;
  artworkId: string;
  requester: string; // Tide-verified username
  requesterSub: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  at: string;
};

type Store = { views: ViewRecord[]; counts: Record<string, number>; requests: LicenceRequest[]; next: number };
const g = globalThis as unknown as { __w2w?: Store };
const s: Store = (g.__w2w ??= {
  views: [],
  counts: Object.fromEntries(ARTWORKS.map((a) => [a.id, a.baseViews])),
  requests: [],
  next: 4821,
});

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

export function addRequest(artworkId: string, requester: string, requesterSub: string) {
  const existing = s.requests.find((r) => r.artworkId === artworkId && r.requesterSub === requesterSub && r.status === "pending");
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
