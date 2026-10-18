import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "./db";
import { readSessionToken, SESSION_COOKIE } from "./session";

export type CurrentUser = {
  id: string;
  username: string;
  name: string;
  title: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return null;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = await readSessionToken(token, secret);
  if (!session) {
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true, name: true, title: true },
  });
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
