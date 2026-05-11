import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel } from "@/lib/db/models/Setting";
import { defaultSettingsData } from "@/lib/db/defaultSettings";
import { requireAuth } from "@/lib/security/authz";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";
import { settingsPayloadSchema } from "@/lib/security/validation";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`settings:get:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many settings requests." }, { status: 429 });

  await connectToDatabase();
  const settings = await SettingModel.findOne({ key: "global" }).lean();
  const emailIntegration = settings?.emailIntegration ?? {};
  const sanitizedEmailIntegration = user.role === "admin"
    ? emailIntegration
    : {
        ...emailIntegration,
        apiKey: "",
      };

  return NextResponse.json({
    documents: settings?.documents ?? [],
    team: settings?.team ?? [],
    company: settings?.company ?? {},
    clientNotes: settings?.clientNotes ?? [],
    lineTemplates: settings?.lineTemplates ?? [],
    emailIntegration: sanitizedEmailIntegration,
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

  const parsedPayload = settingsPayloadSchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    const firstIssue = parsedPayload.error.issues[0];
    return NextResponse.json(
      {
        error: "Invalid settings payload.",
        detail: firstIssue
          ? `${firstIssue.path.join(".") || "payload"}: ${firstIssue.message}`
          : "Schema validation failed.",
      },
      { status: 400 },
    );
  }
  const payload = parsedPayload.data;
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 8_000_000) {
    return NextResponse.json({ error: "Settings payload too large." }, { status: 413 });
  }

  try {
    await connectToDatabase();
    const existing = await SettingModel.findOne({ key: "global" }).lean();
    const emailIntegrationPayload = payload.emailIntegration;
    const mergedEmailIntegration = emailIntegrationPayload
      ? {
          ...(existing?.emailIntegration ?? defaultSettingsData.emailIntegration),
          ...emailIntegrationPayload,
          ...(user.role === "admin"
            ? {}
            : { apiKey: (existing?.emailIntegration?.apiKey ?? defaultSettingsData.emailIntegration.apiKey) }),
        }
      : existing?.emailIntegration ?? defaultSettingsData.emailIntegration;
    const merged = {
      key: "global",
      documents: payload.documents ?? existing?.documents ?? defaultSettingsData.documents,
      team: payload.team ?? existing?.team ?? defaultSettingsData.team,
      company: payload.company ?? existing?.company ?? defaultSettingsData.company,
      clientNotes: payload.clientNotes ?? existing?.clientNotes ?? defaultSettingsData.clientNotes,
      lineTemplates: payload.lineTemplates ?? existing?.lineTemplates ?? defaultSettingsData.lineTemplates,
      emailIntegration: mergedEmailIntegration,
    };
    const persisted = await SettingModel.findOneAndUpdate(
      { key: "global" },
      { $set: merged },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    if (!persisted) {
      throw new Error("Settings update did not persist.");
    }

    // Never block workspace persistence on telemetry/audit failures.
    try {
      await appendAuditLog(user.id, "settings.sync", { payloadSize });
    } catch (auditError) {
      console.warn("settings.sync audit log failed", auditError);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("settings.sync failed", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
