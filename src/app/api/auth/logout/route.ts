import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit";
import { sameOriginUrl } from "@/lib/request-url";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.SESSION_SECRET;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = secret && token ? await readSessionToken(token, secret) : null;
  const response = NextResponse.redirect(sameOriginUrl(request, "/login"), 303);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 0,
  });

  if (session) {
    try {
      await recordAudit({
        action: "auth.logout",
        entity: "User",
        entityId: session.sub,
      });
    } catch (error) {
      console.error("No se pudo registrar el cierre de sesión.", error);
    }
  }

  return response;
}
