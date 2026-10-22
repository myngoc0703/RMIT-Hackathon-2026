import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth/protect";
import { confirmVerification } from "@/lib/emailVerify";

const MESSAGES = {
  wrong: "That code isn't right. Check your email and try again.",
  expired: "That code expired. Send a new one.",
  locked: "Too many tries. Send a new code.",
  none: "Send a code first.",
};

export const POST = withAuth(async (req: NextRequest, jwt) => {
  const { code } = await req.json().catch(() => ({}));
  const result = confirmVerification(String(jwt.sub), String(code ?? ""));
  if (result === "ok") return Response.json({ verified: true });
  return Response.json({ error: MESSAGES[result] }, { status: 400 });
});
