"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { useStore, Client } from "@/store/useStore";
import { Plus, Trash2, X, Check, Building2, Upload, Download } from "lucide-react";

function uid() { return Math.random().toString(36).slice(2, 9); }

const empty = (): Client => ({
  id: uid(), company: "", contactName: "", address: "",
  city: "", country: "Nederland", email: "", phone: "", notes: "",
  supportHoursRemaining: 4,
  supportCycleStart: new Date().toISOString().slice(0, 10),
});

const lbl: React.CSSProperties = { fontSize: 12, color: "var(--gray3)", display: "block", marginBottom: 4 };
const fld: React.CSSProperties = { marginBottom: 12 };

function SupportHoursBar({ remaining, total }: { remaining: number; total: number }) {
  const safeTotal = Math.max(1, total);
  const pct = Math.max(0, Math.min(100, (remaining / safeTotal) * 100));
  const color = pct > 50 ? "#27AE50" : pct > 20 ? "#E2B928" : "#E85757";
  return (
    <div>
      <div style={{ height: 8, width: 180, background: "#edf1f6", borderRadius: 999 }}>
        <div style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 999, transition: "width .2s ease" }} />
      </div>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────
function validateClient(c: Client): string[] {
  const errs: string[] = [];
  if (!c.company.trim())     errs.push("Bedrijfsnaam is verplicht.");
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
    errs.push("E-mailadres is ongeldig.");
  return errs;
}

// ── Form ──────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel }: {
  initial: Client;
  onSave: (c: Client) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Client>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: keyof Client, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const errs = validateClient(form);
    if (errs.length) { setErrors(errs); return; }
    onSave(form);
  };

  return (
    <div>
      {errors.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          {errors.map((e, i) => (
            <p key={i} style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>• {e}</p>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <div style={fld}>
          <label style={lbl}>Bedrijfsnaam *</label>
          <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme BV"
            style={{ borderColor: errors.some(e => e.includes("Bedrijf")) ? "var(--error)" : undefined }} />
        </div>
        <div style={fld}>
          <label style={lbl}>Naam contactpersoon</label>
          <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Jan de Vries" />
        </div>
        <div style={fld}>
          <label style={lbl}>E-mailadres</label>
          <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="info@bedrijf.nl"
            style={{ borderColor: errors.some(e => e.includes("E-mail")) ? "var(--error)" : undefined }} />
        </div>
        <div style={fld}>
          <label style={lbl}>Telefoonnummer</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+31 6 ..." />
        </div>
        <div style={fld}>
          <label style={lbl}>Straat + huisnummer</label>
          <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Keizersgracht 1" />
        </div>
        <div style={fld}>
          <label style={lbl}>Postcode + plaats</label>
          <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="1015 CN Amsterdam" />
        </div>
        <div style={fld}>
          <label style={lbl}>Land</label>
          <input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Nederland" />
        </div>
      </div>
      <div style={fld}>
        <label style={lbl}>Notities</label>
        <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Extra informatie..." />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button className="btn-outline" onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <X size={13} /> Annuleren
        </button>
        <button className="btn-primary" onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={13} /> Opslaan
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function Klanten() {
  const { clients: raw, documents, supportPolicy, addClient, deleteClient, updateClientSupportHours, resetClientSupportHoursIfNeeded } = useStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [adding, setAdding]     = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Wait for zustand persist to rehydrate
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated) resetClientSupportHoursIfNeeded();
  }, [hydrated, resetClientSupportHoursIfNeeded]);
  const clients = hydrated ? (raw ?? []) : [];

  // ── Export JSON ───────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(clients, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "leafylines-klanten.json"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import JSON ───────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null); setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      setImportError("Alleen .json bestanden worden ondersteund."); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Bestand moet een array zijn.");
        let count = 0;
        for (const item of parsed) {
          if (typeof item.company !== "string" || !item.company.trim())
            throw new Error(`Item mist een geldige 'company' veld.`);
          const client: Client = {
            id:          uid(),
            company:     item.company     ?? "",
            contactName: item.contactName ?? "",
            address:     item.address     ?? "",
            city:        item.city        ?? "",
            country:     item.country     ?? "Nederland",
            email:       item.email       ?? "",
            phone:       item.phone       ?? "",
            notes:       item.notes       ?? "",
            supportHoursRemaining: Number(item.supportHoursRemaining ?? supportPolicy.hoursPerCycle),
            supportCycleStart: item.supportCycleStart ?? new Date().toISOString().slice(0, 10),
          };
          addClient(client);
          count++;
        }
        setImportSuccess(`${count} klant${count !== 1 ? "en" : ""} geïmporteerd.`);
        showToast(`${count} klant${count !== 1 ? "en" : ""} geïmporteerd.`, "success");
      } catch (err: unknown) {
        setImportError(`Import mislukt: ${err instanceof Error ? err.message : "Onbekende fout."}`);
        showToast("Import mislukt. Controleer het JSON-bestand.", "error");
      }
    };
    reader.onerror = () => setImportError("Bestand kon niet worden gelezen.");
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32, background: "#f5f6fa" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--gray1)", marginBottom: 2 }}>Klanten</h1>
            <p style={{ fontSize: 13, color: "var(--gray3)" }}>
              {hydrated ? `${clients.length} klant${clients.length !== 1 ? "en" : ""} opgeslagen` : "Laden..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {clients.length > 0 && (
              <button className="btn-outline" onClick={handleExport}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Download size={14} /> Exporteren
              </button>
            )}
            <label className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <Upload size={14} /> Importeren
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </label>
            {!adding && (
              <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => { setAdding(true); }}>
                <Plus size={14} /> Nieuwe klant
              </button>
            )}
          </div>
        </div>

        {/* Import feedback */}
        {importError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--error)" }}>
            ⚠ {importError}
          </div>
        )}
        {importSuccess && (
          <div style={{ background: "#e6f4ec", border: "1px solid #a7d7b8", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#1a6e37" }}>
            ✓ {importSuccess}
          </div>
        )}

        {/* Add form */}
        {adding && (
          <div className="card" style={{ marginBottom: 20, borderColor: "var(--primary-dark)", borderWidth: 1.5 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--gray2)", marginBottom: 16 }}>Nieuwe klant toevoegen</p>
            <ClientForm
              initial={empty()}
              onSave={(c) => { addClient(c); setAdding(false); showToast("Klant toegevoegd.", "success"); }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {/* List */}
        {!hydrated ? (
          <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--gray4)" }}>
            <p style={{ fontSize: 14 }}>Laden...</p>
          </div>
        ) : clients.length === 0 && !adding ? (
          <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--gray4)" }}>
            <Building2 size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 14, marginBottom: 8 }}>Nog geen klanten. Voeg je eerste klant toe!</p>
            <p style={{ fontSize: 12 }}>Je kunt ook een JSON-bestand importeren via de knop rechtsboven.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clients.map((c) => (
              <div key={c.id} className="card" style={{
                borderColor: "#f0f0f0",
                borderWidth: 1,
                cursor: "pointer",
              }} onClick={() => router.push(`/klanten/${c.id}`)}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, background: "var(--primary)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Building2 size={18} color="#1a6b61" />
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--gray1)", marginBottom: 2 }}>{c.company}</p>
                        {c.contactName && <p style={{ fontSize: 13, color: "var(--gray3)", marginBottom: 2 }}>Contact: {c.contactName}</p>}
                        <p style={{ fontSize: 12, color: "var(--gray4)", marginBottom: 2 }}>
                          Omzet: € {documents.filter((d) => d.client === c.company && d.type === "factuur" && d.status === "betaald").reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.price, 0), 0).toFixed(2)}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "var(--gray3)" }}>Support uren over:</span>
                          <input
                            type="number"
                            min={0}
                            max={supportPolicy.hoursPerCycle}
                            value={c.supportHoursRemaining}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); updateClientSupportHours(c.id, Number(e.target.value) || 0); }}
                            style={{ width: 72, fontSize: 12, padding: "4px 6px" }}
                          />
                          <span style={{ fontSize: 12, color: "var(--gray4)" }}>/ {supportPolicy.hoursPerCycle} uur</span>
                        </div>
                        <SupportHoursBar remaining={c.supportHoursRemaining} total={supportPolicy.hoursPerCycle} />
                        <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                          {c.email   && <span style={{ fontSize: 12, color: "var(--accent)" }}>{c.email}</span>}
                          {c.phone   && <span style={{ fontSize: 12, color: "var(--gray3)" }}>{c.phone}</span>}
                          {c.city    && <span style={{ fontSize: 12, color: "var(--gray3)" }}>{c.city}</span>}
                          {c.country && <span style={{ fontSize: 12, color: "var(--gray3)" }}>{c.country}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteClientId(c.id); }} className="icon-btn-danger">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
        <ConfirmModal
          open={Boolean(deleteClientId)}
          title="Klant verwijderen"
          message={`Weet je zeker dat je deze klant wilt verwijderen?`}
          confirmLabel="Ja, verwijderen"
          onCancel={() => setDeleteClientId(null)}
          onConfirm={() => {
            if (deleteClientId) {
              deleteClient(deleteClientId);
              showToast("Klant verwijderd.", "success");
            }
            setDeleteClientId(null);
          }}
        />
      </main>
    </div>
  );
}