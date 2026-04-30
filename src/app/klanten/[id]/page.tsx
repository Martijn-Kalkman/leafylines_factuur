"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { useStore } from "@/store/useStore";
import { ArrowLeft, Pencil } from "lucide-react";

function uid() { return Math.random().toString(36).slice(2, 9); }

function defaultRecurringInvoice(clientName: string) {
  return {
    enabled: false,
    frequency: "yearly" as const,
    amount: 0,
    description: `Jaarlijkse servicekosten voor ${clientName || "klant"}`,
    nextDate: new Date().toISOString().slice(0, 10),
    nextTime: "09:00",
    autoSend: false,
  };
}

export default function KlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clients, documents, clientNotes, updateClient, addClientNote, deleteClientNote } = useStore();
  const [noteText, setNoteText] = useState("");
  const [editingClient, setEditingClient] = useState(false);
  const [saveClientOpen, setSaveClientOpen] = useState(false);
  const { showToast } = useToast();

  const client = clients.find((c) => c.id === id);
  const clientFacturen = useMemo(
    () => documents.filter((d) => d.client === client?.company && d.type === "factuur").sort((a, b) => b.date.localeCompare(a.date)),
    [documents, client?.company]
  );
  const clientOffertes = useMemo(
    () => documents.filter((d) => d.client === client?.company && d.type === "offerte").sort((a, b) => b.date.localeCompare(a.date)),
    [documents, client?.company]
  );
  const notes = useMemo(() => clientNotes.filter((n) => n.clientId === id), [clientNotes, id]);
  const [clientDraft, setClientDraft] = useState({
    company: client?.company ?? "",
    contactName: client?.contactName ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    country: client?.country ?? "",
    notes: client?.notes ?? "",
    recurringInvoice: client?.recurringInvoice ?? defaultRecurringInvoice(client?.company ?? ""),
  });

  useEffect(() => {
    if (!client) return;
    setClientDraft({
      company: client.company ?? "",
      contactName: client.contactName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      city: client.city ?? "",
      country: client.country ?? "",
      notes: client.notes ?? "",
      recurringInvoice: client.recurringInvoice ?? defaultRecurringInvoice(client.company ?? ""),
    });
  }, [client?.id]);

  if (!client) return <div className="app-fallback">Klant niet gevonden.</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <div className="flex items-center gap-3 mb-6">
          <button className="btn-outline flex items-center gap-2" onClick={() => router.push("/klanten")}>
            <ArrowLeft size={14} /> Terug
          </button>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--gray1)" }}>{client.company}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--gray1)" }}>Contactinformatie</h2>
              {!editingClient ? (
                <button className="btn-outline flex items-center gap-2" onClick={() => {
                  setClientDraft({
                    company: client.company ?? "",
                    contactName: client.contactName ?? "",
                    email: client.email ?? "",
                    phone: client.phone ?? "",
                    address: client.address ?? "",
                    city: client.city ?? "",
                    country: client.country ?? "",
                    notes: client.notes ?? "",
                    recurringInvoice: client.recurringInvoice ?? defaultRecurringInvoice(client.company ?? ""),
                  });
                  setEditingClient(true);
                }}>
                  <Pencil size={12} /> Bewerken
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={() => setSaveClientOpen(true)}>Opslaan</button>
                  <button className="btn-outline" onClick={() => setEditingClient(false)}>Annuleren</button>
                </div>
              )}
            </div>
            {editingClient ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input value={clientDraft.company} onChange={(e) => setClientDraft((s) => ({ ...s, company: e.target.value }))} placeholder="Bedrijfsnaam" />
                <input value={clientDraft.contactName} onChange={(e) => setClientDraft((s) => ({ ...s, contactName: e.target.value }))} placeholder="Contactpersoon" />
                <input value={clientDraft.email} onChange={(e) => setClientDraft((s) => ({ ...s, email: e.target.value }))} placeholder="E-mail" />
                <input value={clientDraft.phone} onChange={(e) => setClientDraft((s) => ({ ...s, phone: e.target.value }))} placeholder="Telefoon" />
                <input value={clientDraft.address} onChange={(e) => setClientDraft((s) => ({ ...s, address: e.target.value }))} placeholder="Adres" />
                <input value={clientDraft.city} onChange={(e) => setClientDraft((s) => ({ ...s, city: e.target.value }))} placeholder="Postcode + plaats" />
                <input value={clientDraft.country} onChange={(e) => setClientDraft((s) => ({ ...s, country: e.target.value }))} placeholder="Land" />
                <input value={clientDraft.notes} onChange={(e) => setClientDraft((s) => ({ ...s, notes: e.target.value }))} placeholder="Notities" />
              </div>
            ) : (
              <div className="text-xs" style={{ color: "var(--gray3)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>Contact: {client.contactName || "-"}</span>
                <span>E-mail: {client.email || "-"}</span>
                <span>Telefoon: {client.phone || "-"}</span>
                <span>Adres: {client.address || "-"}, {client.city || "-"}, {client.country || "-"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card mt-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--gray1)" }}>Notities tijdlijn</h2>
          <div className="flex flex-col gap-2 mb-3">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center justify-between text-xs" style={{ color: "var(--gray3)" }}>
                <span>{n.createdAt} - {n.text}</span>
                <button onClick={() => { deleteClientNote(n.id); showToast("Notitie verwijderd.", "success"); }} className="icon-btn-danger">x</button>
              </div>
            ))}
            {notes.length === 0 && <p className="text-xs" style={{ color: "var(--gray4)" }}>Nog geen notities.</p>}
          </div>
          <div className="flex gap-2">
            <input
              placeholder='Notitie, bijv. "1.5 uur support gebruikt voor mailbox issue"'
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={() => {
                const text = noteText.trim();
                if (!text) return;
                addClientNote({ id: uid(), clientId: client.id, text, createdAt: new Date().toISOString().slice(0, 10), author: "Team" });
                setNoteText("");
                showToast("Notitie opgeslagen.", "success");
              }}
            >
              Opslaan
            </button>
          </div>
        </div>
        <div className="card mt-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--gray1)" }}>Automatische factuur</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label className="text-xs" style={{ color: "var(--gray3)", display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(clientDraft.recurringInvoice.enabled)}
                onChange={(e) => setClientDraft((s) => ({
                  ...s,
                  recurringInvoice: { ...s.recurringInvoice, enabled: e.target.checked },
                }))}
              />
              Actief
            </label>
            <div>
              <label className="text-xs" style={{ color: "var(--gray3)" }}>Frequentie</label>
              <select
                value={clientDraft.recurringInvoice.frequency}
                onChange={(e) => setClientDraft((s) => ({
                  ...s,
                  recurringInvoice: {
                    ...s.recurringInvoice,
                    frequency: e.target.value as "monthly" | "quarterly" | "yearly",
                  },
                }))}
              >
                <option value="monthly">Maandelijks</option>
                <option value="quarterly">Per kwartaal</option>
                <option value="yearly">Jaarlijks</option>
              </select>
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--gray3)" }}>Volgende factuurdatum</label>
              <input
                type="date"
                value={clientDraft.recurringInvoice.nextDate}
                onChange={(e) => setClientDraft((s) => ({
                  ...s,
                  recurringInvoice: { ...s.recurringInvoice, nextDate: e.target.value },
                }))}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--gray3)" }}>Verzendtijd</label>
              <input
                type="time"
                value={clientDraft.recurringInvoice.nextTime || "09:00"}
                onChange={(e) => setClientDraft((s) => ({
                  ...s,
                  recurringInvoice: { ...s.recurringInvoice, nextTime: e.target.value || "09:00" },
                }))}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--gray3)" }}>Bedrag excl. BTW (€)</label>
              <input
                type="number"
                min={0}
                value={clientDraft.recurringInvoice.amount}
                onChange={(e) => setClientDraft((s) => ({
                  ...s,
                  recurringInvoice: { ...s.recurringInvoice, amount: Number(e.target.value) || 0 },
                }))}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label className="text-xs" style={{ color: "var(--gray3)" }}>Omschrijving regel</label>
              <input
                value={clientDraft.recurringInvoice.description}
                onChange={(e) => setClientDraft((s) => ({
                  ...s,
                  recurringInvoice: { ...s.recurringInvoice, description: e.target.value },
                }))}
                placeholder="Jaarlijkse onderhoudskosten"
              />
            </div>
          </div>
          <label className="text-xs mt-3" style={{ color: "var(--gray3)", display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(clientDraft.recurringInvoice.autoSend)}
              onChange={(e) => setClientDraft((s) => ({
                ...s,
                recurringInvoice: { ...s.recurringInvoice, autoSend: e.target.checked },
              }))}
            />
            Automatisch e-mailen bij aanmaken (via ingestelde provider)
          </label>
          <div className="mt-3">
            <button
              className="btn-primary"
              onClick={() => {
                updateClient(client.id, { recurringInvoice: clientDraft.recurringInvoice });
                showToast("Automatische factuurinstellingen opgeslagen.", "success");
              }}
            >
              Instellingen opslaan
            </button>
          </div>
        </div>
        <div className="card mt-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--gray1)" }}>Facturen</h2>
          <div className="flex flex-col gap-2">
            {clientFacturen.map((d) => (
              <button key={d.id} className="btn-outline text-left" onClick={() => router.push(`/documenten/${d.id}`)}>
                {d.id} - {d.date} - {d.status}
              </button>
            ))}
            {clientFacturen.length === 0 && <p className="text-xs" style={{ color: "var(--gray4)" }}>Nog geen facturen.</p>}
          </div>
          <h3 className="text-xs font-semibold mt-4 mb-2" style={{ color: "var(--gray2)" }}>Offertes</h3>
          <div className="flex flex-col gap-2">
            {clientOffertes.map((d) => (
              <button key={d.id} className="btn-outline text-left" onClick={() => router.push(`/documenten/${d.id}`)}>
                {d.id} - {d.date} - {d.status}
              </button>
            ))}
            {clientOffertes.length === 0 && <p className="text-xs" style={{ color: "var(--gray4)" }}>Nog geen offertes.</p>}
          </div>
        </div>
        <ConfirmModal
          open={saveClientOpen}
          title="Clientgegevens opslaan"
          message="Weet je zeker dat je de clientgegevens wilt wijzigen?"
          confirmLabel="Ja, opslaan"
          confirmVariant="primary"
          onCancel={() => setSaveClientOpen(false)}
          onConfirm={() => {
            updateClient(client.id, clientDraft);
            setSaveClientOpen(false);
            setEditingClient(false);
            showToast("Clientgegevens bijgewerkt.", "success");
          }}
        />
      </main>
    </div>
  );
}
