import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/lib/db/models/User";
import { registerSchema } from "@/lib/security/validation";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { getClientAddress, requireSameOrigin } from "@/lib/security/requestGuards";

export async function POST(request: Request) {
  try {
    const originGuard = requireSameOrigin(request);
    if (originGuard) return originGuard;
    const rate = await checkRateLimit(`register:${getClientAddress(request)}`, 10, 15 * 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many registration attempts." }, { status: 429 });
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Ongeldige registratiegegevens." }, { status: 400 });
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const password = parsed.data.password;
    const name = parsed.data.name.trim();

    await connectToDatabase();
    const userDoc = await UserModel.findOne({ inviteTokenHash: tokenHash });
    const inviteExpiresAt = userDoc?.inviteTokenExpiresAt ? new Date(userDoc.inviteTokenExpiresAt).getTime() : 0;
    if (!userDoc || !Number.isFinite(inviteExpiresAt) || inviteExpiresAt <= Date.now()) {
      return NextResponse.json({ error: "Uitnodigingslink is ongeldig of verlopen." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    userDoc.passwordHash = passwordHash;
    userDoc.name = name || userDoc.name || "";
    userDoc.inviteTokenHash = "";
    userDoc.inviteTokenExpiresAt = null;
    userDoc.inviteAcceptedAt = new Date();
    userDoc.role = userDoc.role === "admin" ? "admin" : "user";
    await userDoc.save();
    await appendAuditLog(String(userDoc._id), "user.activate", {
      email: userDoc.email,
      role: userDoc.role,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registratie mislukt.";
    return NextResponse.json({ error: `Registratie mislukt: ${message}` }, { status: 500 });
  }
}
