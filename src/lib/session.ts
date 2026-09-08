import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "fixflow_session";

// Demo-grade session: the cookie just carries the user id, HttpOnly + SameSite.
// It is not cryptographically signed, so this is not production-ready auth —
// acceptable for a local pitch demo with a single seeded account, not for a
// multi-tenant deployment with real customer data.
export interface Session {
  userId: string;
  businessId: string;
  name: string;
  email: string;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const userId = store.get(COOKIE_NAME)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return {
    userId: user.id,
    businessId: user.businessId,
    name: user.name,
    email: user.email,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
