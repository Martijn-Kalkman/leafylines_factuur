import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ensureUserRoleField, UserModel } from "@/lib/db/models/User";
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
    const email = parsed.data.email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || "kalkmanwm@gmail.com")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const password = parsed.data.password;
    const name = parsed.data.name.trim();

    await connectToDatabase();
    await ensureUserRoleField();
    const existingUser = await UserModel.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json({ error: "Dit e-mailadres is al geregistreerd." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const createdUser = await UserModel.create({ email, passwordHash, name, role: adminEmails.includes(email) ? "admin" : "user" });
    await appendAuditLog(String(createdUser._id), "register", { email, role: createdUser.role });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registratie mislukt.";
    return NextResponse.json({ error: `Registratie mislukt: ${message}` }, { status: 500 });
  }
}
