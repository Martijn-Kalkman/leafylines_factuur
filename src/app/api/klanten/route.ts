import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { KlantModel } from "@/lib/db/models/Klant";
import { requireAuth } from "@/lib/security/authz";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`klanten:get:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many klanten requests." }, { status: 429 });

  await connectToDatabase();
  const clients = await KlantModel.find().sort({ company: 1 }).lean();
  return NextResponse.json({ clients });
}

export async function PUT(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`klanten:put:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many klanten updates." }, { status: 429 });

  const payload = (await request.json()) as { clients?: Array<Record<string, unknown>> };
  const clients = Array.isArray(payload.clients) ? payload.clients : [];
  const payloadSize = JSON.stringify(clients).length;
  if (payloadSize > 2_000_000) {
    return NextResponse.json({ error: "Clients payload too large." }, { status: 413 });
  }

  await connectToDatabase();
  await KlantModel.deleteMany({});
  if (clients.length > 0) {
    await KlantModel.insertMany(clients);
  }
  await appendAuditLog(user.id, "klanten.sync", { payloadSize, count: clients.length });
  return NextResponse.json({ ok: true });
}
