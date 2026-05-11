import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ensureUserRoleField, UserModel } from "@/lib/db/models/User";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { getClientAddress, requireSameOrigin } from "@/lib/security/requestGuards";
import { getAuthCookieMaxAgeSeconds, getAuthCookieName, signAuthToken } from "@/lib/security/jwt";

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const clientAddress = getClientAddress(request);
  const rate = await checkRateLimit(`login:${clientAddress}:${email}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
  }

  await connectToDatabase();
  await ensureUserRoleField();
  const userDoc = await UserModel.findOne({ email });
  if (!userDoc) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  // Allow login even when ADMIN_EMAILS is missing; this only disables automatic role elevation.
  if (adminEmails.length > 0 && adminEmails.includes(email) && userDoc.role !== "admin") {
    userDoc.role = "admin";
    await userDoc.save();
  }
  const user = userDoc.toObject();
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const validPassword = await bcrypt.compare(password, String(user.passwordHash));
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = await signAuthToken({
    sub: String(user._id),
    email: user.email,
    role: user.role === "admin" ? "admin" : "user",
    name: user.name || undefined,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAuthCookieName(),
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getAuthCookieMaxAgeSeconds(),
  });
  return response;
}
