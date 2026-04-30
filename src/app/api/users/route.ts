import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ensureUserRoleField, UserModel } from "@/lib/db/models/User";
import { requireAdmin } from "@/lib/security/authz";
import { usersDeleteSchema, usersPatchSchema } from "@/lib/security/validation";
import { appendAuditLog } from "@/lib/security/auditLog";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { requireSameOrigin } from "@/lib/security/requestGuards";

export async function GET() {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;
  const rate = await checkRateLimit(`users:get:${adminId.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  await connectToDatabase();
  await ensureUserRoleField();
  const users = await UserModel.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    users: users.map((user) => ({
      id: String(user._id),
      email: user.email,
      name: user.name || "",
      role: user.role || "user",
      createdAt: user.createdAt,
    })),
  });
}

export async function PATCH(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;
  const rate = await checkRateLimit(`users:patch:${adminId.id}`, 60, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = usersPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid users patch payload." }, { status: 400 });
  const body = parsed.data;

  const updates: Record<string, unknown> = {};
  if (body.role) updates.role = body.role;
  if (typeof body.name === "string") updates.name = body.name.trim();

  await connectToDatabase();
  await UserModel.findByIdAndUpdate(body.id, { $set: updates });
  await appendAuditLog(adminId.id, "admin.user.update", { targetUserId: body.id, updates });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;
  const rate = await checkRateLimit(`users:delete:${adminId.id}`, 30, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const parsed = usersDeleteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid users delete payload." }, { status: 400 });

  const body = parsed.data;
  await connectToDatabase();
  const targetUser = await UserModel.findById(body.id).lean();
  if (!targetUser) return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });

  if (String(targetUser._id) === adminId.id) {
    return NextResponse.json({ error: "Je kunt je eigen account niet verwijderen." }, { status: 400 });
  }

  const adminCount = await UserModel.countDocuments({ role: "admin" });
  if (targetUser.role === "admin" && adminCount <= 1) {
    return NextResponse.json({ error: "Laatste admin kan niet worden verwijderd." }, { status: 400 });
  }

  await UserModel.findByIdAndDelete(body.id);
  await appendAuditLog(adminId.id, "admin.user.delete", {
    targetUserId: body.id,
    targetEmail: targetUser.email,
    targetRole: targetUser.role,
  });
  return NextResponse.json({ ok: true });
}
