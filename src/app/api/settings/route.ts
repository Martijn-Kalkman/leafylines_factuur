import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel } from "@/lib/db/models/Setting";
import { defaultSettingsData } from "@/lib/db/defaultSettings";
import { requireAuth } from "@/lib/security/authz";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`settings:get:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many settings requests." }, { status: 429 });

  await connectToDatabase();
  const settings = await SettingModel.findOne({ key: "global" }).lean();

  return NextResponse.json({
    documents: settings.documents ?? [],
    team: settings.team ?? [],
    company: settings.company ?? {},
    clientNotes: settings.clientNotes ?? [],
    lineTemplates: settings.lineTemplates ?? [],
    emailIntegration: settings.emailIntegration ?? {},
  });
}

export async function PUT(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  // Autosave from the client can burst while users type in settings forms.
  // Keep this limit comfortably above the autosave cadence to prevent silent drop-offs.
  const rate = await checkRateLimit(`settings:put:${user.id}`, 600, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many settings updates." }, { status: 429 });

  const payload = await request.json();
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 2_000_000) {
    return NextResponse.json({ error: "Settings payload too large." }, { status: 413 });
  }

  await connectToDatabase();
  const existing = await SettingModel.findOne({ key: "global" }).lean();
  const merged = {
    key: "global",
    documents: payload.documents ?? existing?.documents ?? defaultSettingsData.documents,
    team: payload.team ?? existing?.team ?? defaultSettingsData.team,
    company: payload.company ?? existing?.company ?? defaultSettingsData.company,
    clientNotes: payload.clientNotes ?? existing?.clientNotes ?? defaultSettingsData.clientNotes,
    lineTemplates: payload.lineTemplates ?? existing?.lineTemplates ?? defaultSettingsData.lineTemplates,
    emailIntegration: payload.emailIntegration ?? existing?.emailIntegration ?? defaultSettingsData.emailIntegration,
  };
  await SettingModel.findOneAndUpdate(
    { key: "global" },
    { $set: merged },
    { upsert: true },
  );

  await appendAuditLog(user.id, "settings.sync", { payloadSize });
  return NextResponse.json({ ok: true });
}
