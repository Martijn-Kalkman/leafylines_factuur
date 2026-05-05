import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/lib/db/models/User";
import { requireAuth } from "@/lib/security/authz";
import { profileUpdateSchema } from "@/lib/security/validation";
import { appendAuditLog } from "@/lib/security/auditLog";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { requireSameOrigin } from "@/lib/security/requestGuards";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`profile:get:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  await connectToDatabase();
  const dbUser = await UserModel.findById(user.id).lean();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    id: String(dbUser._id),
    email: dbUser.email,
    name: dbUser.name || "",
    role: dbUser.role || "user",
    invoiceEmail: dbUser.invoiceEmail || dbUser.email || "",
    invoicePhone: dbUser.invoicePhone || "",
    themePreference: dbUser.themePreference || "system",
  });
}

export async function PUT(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`profile:put:${user.id}`, 30, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = profileUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  const body = parsed.data;
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    updates.name = body.name.trim();
    updates.invoiceName = body.name.trim();
  }
  if (typeof body.invoiceEmail === "string") updates.invoiceEmail = body.invoiceEmail.trim().toLowerCase();
  if (typeof body.invoicePhone === "string") updates.invoicePhone = body.invoicePhone.trim();
  if (typeof body.themePreference === "string") updates.themePreference = body.themePreference;
  if (typeof body.password === "string") {
    updates.passwordHash = await bcrypt.hash(body.password, 12);
  }

  await connectToDatabase();
  await UserModel.findByIdAndUpdate(user.id, { $set: updates });
  await appendAuditLog(user.id, "profile.update", { changedFields: Object.keys(updates) });
  return NextResponse.json({ ok: true });
}
