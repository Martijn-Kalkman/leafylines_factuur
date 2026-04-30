import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EmailLogModel } from "@/lib/db/models/EmailLog";
import { requireAuth } from "@/lib/security/authz";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`emails:get:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  await connectToDatabase();
  const logs = await EmailLogModel.find().sort({ sentAt: -1, createdAt: -1 }).limit(2000).lean();
  return NextResponse.json({
    emailLogs: logs.map((log) => ({
      id: String(log._id),
      createdAt: log.createdAt,
      sentAt: (log as { sentAt?: string }).sentAt || log.createdAt,
      subject: log.subject,
      to: log.to,
      kind: log.kind,
      status: log.status,
      error: log.error || "",
      sentBy: log.sentBy || "",
    })),
  });
}
