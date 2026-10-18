import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { ProfileValidationError, signatureFromProfile, updateSignerProfile } from "@/lib/profile";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json(signatureFromProfile(user));
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const name = typeof body === "object" && body !== null && "name" in body ? String(body.name) : "";
  const title =
    typeof body === "object" && body !== null && "title" in body ? String(body.title) : "";

  try {
    const profile = await updateSignerProfile(user.id, { name, title });
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
