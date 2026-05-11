import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { KlantModel } from "@/lib/db/models/Klant";
import { requireAuth } from "@/lib/security/authz";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { appendAuditLog } from "@/lib/security/auditLog";
import { requireSameOrigin } from "@/lib/security/requestGuards";

type KlantPatchPayload = {
  company?: unknown;
  contactName?: unknown;
  address?: unknown;
  city?: unknown;
  country?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
  recurringInvoice?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function createErrorId(): string {
  return `klanten-single-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const rate = await checkRateLimit(`klanten:put-single:${user.id}`, 600, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many klanten updates." }, { status: 429 });
  }

  const { id: rawId } = await context.params;
  const id = normalizeString(rawId).trim();
  if (!id) {
    return NextResponse.json({ error: "Invalid klant id." }, { status: 400 });
  }

  const payload = (await request.json()) as KlantPatchPayload;
  const update = {
    company: normalizeString(payload.company),
    contactName: normalizeString(payload.contactName),
    address: normalizeString(payload.address),
    city: normalizeString(payload.city),
    country: normalizeString(payload.country),
    email: normalizeString(payload.email),
    phone: normalizeString(payload.phone),
    notes: normalizeString(payload.notes),
    recurringInvoice: payload.recurringInvoice ?? null,
  };

  try {
    await connectToDatabase();
    const result = await KlantModel.findOneAndUpdate(
      { id },
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!result) {
      return NextResponse.json({ error: "Klant not found." }, { status: 404 });
    }

    try {
      await appendAuditLog(user.id, "klanten.updateSingle", { id });
    } catch (auditError) {
      console.warn("klanten.updateSingle audit log failed", auditError);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorId = createErrorId();
    console.error(`[${errorId}] klanten.single.put failed`, { error, id });
    return NextResponse.json(
      {
        error: "Failed to save client.",
        detail: error instanceof Error ? error.message : "Unknown error.",
        errorId,
      },
      { status: 500 },
    );
  }
}
