import { NextRequest } from "next/server";
import { withVerified } from "@/lib/auth/protect";
import { addUpload } from "@/lib/store";

const CATEGORIES = ["painting", "illustration", "photography"] as const;
const IMAGE = /^data:image\/(png|jpeg|webp);base64,/;

// Members (Tide sign-in + passkey + verified email) upload their own work and become its owner.
export const POST = withVerified(async (req: NextRequest, jwt) => {
  const b = await req.json().catch(() => ({}));
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  if (!title) return Response.json({ error: "Give your artwork a title." }, { status: 400 });
  if (!CATEGORIES.includes(b.category)) return Response.json({ error: "Choose a category." }, { status: 400 });
  if (typeof b.display !== "string" || !IMAGE.test(b.display) || typeof b.original !== "string" || !IMAGE.test(b.original))
    return Response.json({ error: "Upload a PNG, JPEG or WebP image." }, { status: 400 });
  if (b.original.length > 12_000_000) return Response.json({ error: "That image is too large (max about 8 MB)." }, { status: 413 });
  const ratio = Number(b.ratio);
  const art = addUpload(String(jwt.sub), String(jwt.preferred_username ?? "member"), {
    title, category: b.category, licence: !!b.licence, ratio: ratio > 0.2 && ratio < 5 ? ratio : 1, display: b.display, original: b.original,
  });
  return Response.json({ artwork: art });
});
