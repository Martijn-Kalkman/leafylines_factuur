import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EmailLogModel } from "@/lib/db/models/EmailLog";
import { SettingModel } from "@/lib/db/models/Setting";
import { requireAuth } from "@/lib/security/authz";
import { sendDocumentSchema } from "@/lib/security/validation";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";
import { sanitizeHtmlEmail } from "@/lib/htmlEmail";

export const runtime = "nodejs";

type Provider = "resend" | "sendgrid" | "gmail";

interface SendPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  sendConfirmation?: boolean;
  confirmationText?: string;
  confirmationHtml?: string;
  attachmentBase64?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const originGuard = requireSameOrigin(request);
    if (originGuard) return originGuard;
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;
    const rate = await checkRateLimit(`send-document:${user.id}`, 30, 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many email requests." }, { status: 429 });
    const parsed = sendDocumentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid send-document payload." }, { status: 400 });
    const body = parsed.data as SendPayload;
    const provider = (process.env.EMAIL_PROVIDER || "gmail") as Provider;
    const fromEmail = (process.env.EMAIL_FROM || "").trim();
    const providerApiKey =
      provider === "gmail"
        ? process.env.GMAIL_APP_PASSWORD
        : provider === "resend"
          ? process.env.RESEND_API_KEY
          : process.env.SENDGRID_API_KEY;
    await connectToDatabase();
    const settings = await SettingModel.findOne({ key: "global" }).lean();
    const dbConfirmationRecipients = (settings?.emailIntegration?.confirmationEmails ?? [])
      .map((email: unknown) => String(email || "").trim())
      .filter((email: string) => isEmail(email));
    const envConfirmationRecipients = (process.env.EMAIL_CONFIRMATION_TO || "")
      .split(",")
      .map((email) => email.trim())
      .filter((email) => isEmail(email));
    const confirmationRecipients = Array.from(new Set([...dbConfirmationRecipients, ...envConfirmationRecipients]));
    const addServerEmailLogs = async (entries: Array<{ subject: string; to: string; kind: "document" | "confirmation"; status: "success" | "failed"; error?: string }>) => {
      if (entries.length === 0) return;
      const nowIso = new Date().toISOString();
      await EmailLogModel.insertMany(
        entries.map((entry) => ({
          ...entry,
          error: entry.error || "",
          createdAt: nowIso,
          sentAt: nowIso,
          sentBy: user.email || "",
        })),
      );
    };

    if (!body.to || !body.subject || !body.text) {
      return NextResponse.json({ error: "Missing required payload fields: to, subject, text." }, { status: 400 });
    }
    if (!fromEmail) {
      return NextResponse.json({ error: "Missing env EMAIL_FROM." }, { status: 400 });
    }
    if (!isEmail(body.to) || !isEmail(fromEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    const attachments =
      body.attachmentBase64 && body.attachmentFileName
        ? [
            {
              filename: body.attachmentFileName,
              content: body.attachmentBase64,
              type: body.attachmentMimeType || "application/pdf",
            },
          ]
        : [];
    const sendMailByProvider = async (
      to: string[] | string,
      subject: string,
      text: string,
      html: string | undefined,
      includeAttachments: boolean,
    ) => {
      const scopedAttachments = includeAttachments ? attachments : [];
      const safeHtml = html ? sanitizeHtmlEmail(html) : undefined;
      if (provider === "gmail") {
        const smtpPassword = providerApiKey;
        if (!smtpPassword) throw new Error("GMAIL_APP_PASSWORD not configured.");
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: fromEmail,
            pass: smtpPassword,
          },
        });
        await transporter.sendMail({
          from: fromEmail,
          to,
          subject,
          text,
          html: safeHtml,
          attachments: scopedAttachments.map((file) => ({
            filename: file.filename,
            content: Buffer.from(file.content, "base64"),
            contentType: file.type,
          })),
        });
        return;
      }

      if (provider === "resend") {
        const apiKey = providerApiKey;
        if (!apiKey) throw new Error("RESEND_API_KEY not configured.");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: Array.isArray(to) ? to : [to],
            subject,
            text,
            html: safeHtml,
            attachments: scopedAttachments.map((file) => ({
              filename: file.filename,
              content: file.content,
            })),
          }),
        });
        if (!response.ok) throw new Error(`Resend failed: ${await response.text()}`);
        return;
      }

      const apiKey = providerApiKey;
      if (!apiKey) throw new Error("SENDGRID_API_KEY not configured.");
      const toList = Array.isArray(to) ? to : [to];
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: toList.map((email) => ({ email })) }],
          from: { email: fromEmail },
          subject,
          content: [
            { type: "text/plain", value: text },
            ...(safeHtml ? [{ type: "text/html", value: safeHtml }] : []),
          ],
          attachments: scopedAttachments.map((file) => ({
            content: file.content,
            filename: file.filename,
            type: file.type,
            disposition: "attachment",
          })),
        }),
      });
      if (!response.ok) throw new Error(`SendGrid failed: ${await response.text()}`);
    };

    await sendMailByProvider(body.to, body.subject, body.text, body.html, true);
    const logs: Array<{ subject: string; to: string; kind: "document" | "confirmation"; status: "success" | "failed"; error?: string }> = [
      { subject: body.subject, to: body.to, kind: "document", status: "success" },
    ];
    if (body.sendConfirmation === true && confirmationRecipients.length > 0) {
      await sendMailByProvider(
        confirmationRecipients,
        `Bevestiging: ${body.subject}`,
        body.confirmationText || `Document met onderwerp "${body.subject}" is verzonden naar ${body.to}.`,
        body.confirmationHtml,
        false,
      );
      for (const confirmationTo of confirmationRecipients) {
        logs.push({ subject: `Bevestiging: ${body.subject}`, to: confirmationTo, kind: "confirmation", status: "success" });
      }
    }
    await addServerEmailLogs(logs);
    await appendAuditLog(user.id, "email.send", {
      to: body.to,
      subject: body.subject,
      confirmationRecipients: body.sendConfirmation === true ? confirmationRecipients : [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
