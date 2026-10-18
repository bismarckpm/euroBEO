import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { sameOriginUrl } from "@/lib/request-url";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function failed(request: Request): NextResponse {
  return NextResponse.redirect(sameOriginUrl(request, "/login?error=credenciales"), 303);
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "La aplicación no está configurada." }, { status: 500 });
  }

  const form = await request.formData();
  const parsed = loginSchema.safeParse({
    username: form.get("username"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    return failed(request);
  }

  const user = await getPrisma().user.findUnique({
    where: { username: parsed.data.username },
  });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
  if (!user || !valid) {
    return failed(request);
  }

  await recordAudit({
    action: "auth.login",
    entity: "User",
    entityId: user.id,
    after: { username: user.username },
  });

  const token = await createSessionToken(user.id, secret);
  const response = NextResponse.redirect(sameOriginUrl(request, "/"), 303);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
