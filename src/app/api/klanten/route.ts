import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { KlantModel } from "@/lib/db/models/Klant";
import { requireAuth } from "@/lib/security/authz";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";

type PersistedClient = {
  id: string;
  company: string;
  contactName: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
  recurringInvoice?: unknown;
};

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sanitizeClientRecord(input: Record<string, unknown>): PersistedClient {
  return {
    id: toSafeString(input.id).trim(),
    company: toSafeString(input.company),
    contactName: toSafeString(input.contactName),
    address: toSafeString(input.address),
    city: toSafeString(input.city),
    country: toSafeString(input.country),
    email: toSafeString(input.email),
    phone: toSafeString(input.phone),
    notes: toSafeString(input.notes),
    recurringInvoice: input.recurringInvoice ?? null,
  };
}

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  const rate = await checkRateLimit(`klanten:get:${user.id}`, 120, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many klanten requests." }, { status: 429 });

  await connectToDatabase();
  const clients = await KlantModel.find()
    .sort({ company: 1 })
    .select("id company contactName address city country email phone notes recurringInvoice -_id")
    .lean();
  return NextResponse.json({ clients });
}

export async function PUT(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  // Autosave can trigger frequent client sync requests during active editing/imports.
  const rate = await checkRateLimit(`klanten:put:${user.id}`, 600, 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many klanten updates." }, { status: 429 });

  const payload = (await request.json()) as { clients?: Array<Record<string, unknown>> };
  if (!Array.isArray(payload.clients)) {
    return NextResponse.json({ error: "Invalid clients payload." }, { status: 400 });
  }
  const clients = payload.clients.map((client) => sanitizeClientRecord(client));
  const seenIds = new Set<string>();
  for (const client of clients) {
    const id = typeof client.id === "string" ? client.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Each client requires a non-empty id." }, { status: 400 });
    }
    if (seenIds.has(id)) {
      return NextResponse.json({ error: `Duplicate client id detected: ${id}` }, { status: 400 });
    }
    seenIds.add(id);
  }
  const payloadSize = JSON.stringify(clients).length;
  if (payloadSize > 2_000_000) {
    return NextResponse.json({ error: "Clients payload too large." }, { status: 413 });
  }

  await connectToDatabase();
  if (clients.length === 0) {
    await KlantModel.deleteMany({});
  } else {
    await KlantModel.bulkWrite(
      clients.map((client) => ({
        updateOne: {
          filter: { id: client.id },
          update: { $set: client },
          upsert: true,
        },
      })),
      { ordered: true },
    );
    const incomingIds = new Set(clients.map((client) => client.id));
    const existingClients = await KlantModel.find()
      .select("id -_id")
      .lean<{ id?: string }[]>();
    const idsToDelete = existingClients
      .map((client) => (typeof client.id === "string" ? client.id : ""))
      .filter((id) => id && !incomingIds.has(id));
    if (idsToDelete.length > 0) {
      await Promise.all(idsToDelete.map((id) => KlantModel.deleteOne({ id })));
    }
  }
  await appendAuditLog(user.id, "klanten.sync", { payloadSize, count: clients.length });
  return NextResponse.json({ ok: true });
}
