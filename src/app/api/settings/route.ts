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
  let settings = await SettingModel.findOne({ key: "global" }).lean();
  if (!settings) {
    settings = await SettingModel.create({
      key: "global",
      documents: defaultSettingsData.documents,
      team: defaultSettingsData.team,
      company: defaultSettingsData.company,
      projects: defaultSettingsData.projects,
      clientNotes: defaultSettingsData.clientNotes,
      lineTemplates: defaultSettingsData.lineTemplates,
      emailIntegration: defaultSettingsData.emailIntegration,
      supportPolicy: defaultSettingsData.supportPolicy,
    });
    settings = settings.toObject();
  }

  return NextResponse.json({
    documents: settings.documents ?? [],
    team: settings.team ?? [],
    company: settings.company ?? {},
    projects: settings.projects ?? [],
    clientNotes: settings.clientNotes ?? [],
    lineTemplates: settings.lineTemplates ?? [],
    emailIntegration: settings.emailIntegration ?? {},
    supportPolicy: settings.supportPolicy ?? {},
  });
}

export async function PUT(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`settings:put:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many settings updates." }, { status: 429 });

  const payload = await request.json();
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 2_000_000) {
    return NextResponse.json({ error: "Settings payload too large." }, { status: 413 });
  }

  await connectToDatabase();
  await SettingModel.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        documents: payload.documents ?? [],
        team: payload.team ?? [],
        company: payload.company ?? {},
        projects: payload.projects ?? [],
        clientNotes: payload.clientNotes ?? [],
        lineTemplates: payload.lineTemplates ?? [],
        emailIntegration: payload.emailIntegration ?? {},
        supportPolicy: payload.supportPolicy ?? {},
      },
    },
    { upsert: true },
  );

  await appendAuditLog(user.id, "settings.sync", { payloadSize });
  return NextResponse.json({ ok: true });
}
