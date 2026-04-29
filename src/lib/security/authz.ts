import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieName, verifyAuthToken } from "@/lib/security/jwt";

export interface AuthorizedUser {
  id: string;
  role: "user" | "admin";
  email?: string | null;
}

export async function requireAuth(): Promise<AuthorizedUser | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyAuthToken(token);
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return {
    id: payload.sub,
    role: payload.role || "user",
    email: payload.email,
  };
}

export async function requireAdmin(): Promise<AuthorizedUser | NextResponse> {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}
