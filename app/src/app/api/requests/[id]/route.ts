import { NextRequest } from "next/server";
import { withVerifiedRole } from "@/lib/auth/protect";
import { ARTIST_ROLE } from "@/lib/roles";
import { setRequestStatus } from "@/lib/store";

const ACTIONS = { approve: "approved", reject: "rejected", revoke: "revoked" } as const;

// Artists only: approve, reject or revoke a collector's access to an original.
export const POST = withVerifiedRole(ARTIST_ROLE, async (req: NextRequest) => {
  const id = req.nextUrl.pathname.split("/").pop() ?? "";
  const body = await req.json().catch(() => ({}));
  const status = ACTIONS[body.action as keyof typeof ACTIONS];
  if (!status) return Response.json({ error: "Unknown action" }, { status: 400 });
  const r = setRequestStatus(id, status);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ request: r });
});
