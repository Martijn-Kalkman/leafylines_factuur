import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/lib/db/models/User";
import { requireAdmin } from "@/lib/security/authz";
import { usersInviteSchema } from "@/lib/security/validation";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";

export const runtime = "nodejs";

type Provider = "resend" | "sendgrid" | "gmail";

function getInviteBaseUrl(request: Request): string {
  const configured = (process.env.AUTH_URL || "").trim();
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      throw new Error("AUTH_URL is invalid.");
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.trim() || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

async function sendInviteEmail(to: string, inviteUrl: string): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER || "gmail") as Provider;
  const fromEmail = (process.env.EMAIL_FROM || "").trim();
  const providerApiKey =
    provider === "gmail"
      ? process.env.GMAIL_APP_PASSWORD
      : provider === "resend"
        ? process.env.RESEND_API_KEY
        : process.env.SENDGRID_API_KEY;

  if (!fromEmail) throw new Error("Missing env EMAIL_FROM.");

  const subject = "LeafyLines account activatie";
  const text =
    `Je bent uitgenodigd voor LeafyLines.\n\n` +
    `Klik op deze link om je account te activeren en je wachtwoord in te stellen:\n${inviteUrl}\n\n` +
    `Deze link is 24 uur geldig.`;

  if (provider === "gmail") {
    if (!providerApiKey) throw new Error("GMAIL_APP_PASSWORD not configured.");
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: { user: fromEmail, pass: providerApiKey },
    });
    await transporter.sendMail({ from: fromEmail, to, subject, text });
    return;
  }

  if (provider === "resend") {
    if (!providerApiKey) throw new Error("RESEND_API_KEY not configured.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to: [to], subject, text }),
    });
    if (!response.ok) throw new Error(`Resend failed: ${await response.text()}`);
    return;
  }

  if (!providerApiKey) throw new Error("SENDGRID_API_KEY not configured.");
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!response.ok) throw new Error(`SendGrid failed: ${await response.text()}`);
}

export async function POST(request: Request) {
  try {
    const originGuard = requireSameOrigin(request);
    if (originGuard) return originGuard;
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const rate = await checkRateLimit(`users:invite:${admin.id}`, 30, 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

    const parsed = usersInviteSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Ongeldige uitnodigingsgegevens." }, { status: 400 });

    const email = parsed.data.email.toLowerCase();
    const name = parsed.data.name.trim();
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const inviteUrl = new URL(`/register?token=${token}`, getInviteBaseUrl(request)).toString();

    await connectToDatabase();
    const existing = await UserModel.findOne({ email });
    if (existing && existing.inviteAcceptedAt && existing.passwordHash) {
      return NextResponse.json({ error: "Gebruiker bestaat al en is al geactiveerd." }, { status: 409 });
    }

    const placeholderPasswordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
    await UserModel.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          name,
          role: "user",
          passwordHash: existing?.passwordHash || placeholderPasswordHash,
          inviteTokenHash: tokenHash,
          inviteTokenExpiresAt: expiresAt,
        },
        $setOnInsert: {
          inviteAcceptedAt: null,
        },
      },
      { upsert: true },
    );

    await sendInviteEmail(email, inviteUrl);
    await appendAuditLog(admin.id, "admin.user.invite", { email, role: "user", expiresAt: expiresAt.toISOString() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uitnodiging versturen mislukt.";
    return NextResponse.json(
      { error: `Uitnodiging versturen mislukt: ${message}` },
      { status: 500 },
    );
  }
}
