"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { useStore, TeamMember, btwPerKwartaal } from "@/store/useStore";
import { Check, Pencil, Trash2, Plus, X, Building2, Users, Download, Mail } from "lucide-react";

function uid() { return Math.random().toString(36).slice(2, 9); }

const lbl: React.CSSProperties = { fontSize: 12, color: "var(--gray3)", display: "block", marginBottom: 4 };
const sec: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "var(--gray1)", marginBottom: 4 };
const sub: React.CSSProperties = { fontSize: 13, color: "var(--gray3)", marginBottom: 20 };

const COLORS = ["#98E5D8","#f5a623","#3F80ED","#27AE50","#E2B928","#E85757","#9b59b6","#1abc9c"];

function Avatar({ m, size = 40 }: { m: TeamMember; size?: number }) {
  if (m.avatarDataUrl) {
    return <img src={m.avatarDataUrl} alt={m.name} style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: m.color, display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700, fontSize: size * 0.35,
      color: "#fff", flexShrink: 0, letterSpacing: 0.5,
    }}>
      {m.initials || m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function MemberForm({ initial, onSave, onCancel }: {
  initial: TeamMember;
  onSave: (m: TeamMember) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TeamMember>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: keyof TeamMember, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Naam is verplicht.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push("Ongeldig e-mailadres.");
    if (errs.length) { setErrors(errs); return; }
    onSave({ ...form, initials: form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() });
  };

  return (
    <div>
      {errors.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          {errors.map((e, i) => <p key={i} style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>• {e}</p>)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        {([["name","Naam *","Jan de Vries"],["role","Functie","Developer"],["email","E-mail","jan@leafylines.nl"],["phone","Telefoon","+31 6 ..."]] as [keyof TeamMember, string, string][]).map(([k, label, ph]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={lbl}>{label}</label>
            <input value={form[k] as string} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Handtekening (tekst)</label>
        <input value={form.signature ?? ""} onChange={(e) => set("signature", e.target.value)} placeholder="Jan de Vries" />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn-outline" onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6 }}><X size={13} /> Annuleren</button>
        <button className="btn-primary" onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={13} /> Opslaan</button>
      </div>
    </div>
  );
}

export default function Instellingen() {
  const { company, updateCompany, team: rawTeam, addTeamMember, updateTeamMember, deleteTeamMember, lineTemplates, addLineTemplate, updateLineTemplate, deleteLineTemplate, documents, supportPolicy, updateSupportPolicy, resetClientSupportHoursIfNeeded, resetClientSupportHoursNow } = useStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const team = hydrated ? (rawTeam ?? []) : [];

  // Company form state
  const [comp, setComp]         = useState(company);
  const [compSaved, setCompSaved] = useState(false);
  const [compErrors, setCompErrors] = useState<string[]>([]);

  useEffect(() => { if (hydrated) setComp(company); }, [hydrated]);

  const saveCompany = () => {
    const errs: string[] = [];
    if (!comp.name.trim())  errs.push("Bedrijfsnaam is verplicht.");
    if (!comp.iban.trim())  errs.push("IBAN is verplicht.");
    if (errs.length) { setCompErrors(errs); return; }
    setCompErrors([]);
    updateCompany(comp);
    setCompSaved(true);
    showToast("Bedrijfsgegevens opgeslagen.", "success");
    setTimeout(() => setCompSaved(false), 2500);
  };

  const [addingMember, setAddingMember]   = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({ title: "", product: "", description: "", price: 0 });
  const { showToast } = useToast();
  const [deleteTeamMemberId, setDeleteTeamMemberId] = useState<string | null>(null);

  const emptyMember = (): TeamMember => ({
    id: uid(), name: "", phone: "", email: "", role: "", initials: "", color: COLORS[team.length % COLORS.length],
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32, background: "#f5f6fa", maxWidth: "calc(100vw - 220px)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--gray1)", marginBottom: 4 }}>Instellingen</h1>
        <p style={{ fontSize: 13, color: "var(--gray3)", marginBottom: 32 }}>Beheer je bedrijfsgegevens en teamleden</p>

        {/* ── Bedrijfsgegevens ───────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Building2 size={18} color="var(--primary-dark)" />
            <p style={sec}>Bedrijfsgegevens</p>
          </div>
          <p style={sub}>Deze gegevens verschijnen op al je facturen en offertes.</p>

          {compErrors.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              {compErrors.map((e, i) => <p key={i} style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>• {e}</p>)}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            {([
              ["name",    "Bedrijfsnaam *",    "LeafyLines"],
              ["address", "Adres",             "Straat 1"],
              ["city",    "Postcode + plaats", "1234 AB Stad"],
              ["country", "Land",              "Nederland"],
              ["kvk",     "KvK nummer",        "12345678"],
              ["btw",     "BTW nummer",        "NL123456789B01"],
              ["iban",    "IBAN *",            "NL00 BANK 0000000000"],
              ["email",   "E-mailadres",       "info@bedrijf.nl"],
              ["phone",   "Telefoonnummer",    "+31 10 ..."],
              ["website", "Website",           "www.leafylines.nl"],
            ] as [Exclude<keyof typeof comp, "signatureLegalText" | "footerText" | "defaultHourlyRate">, string, string][]).map(([k, label, ph]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={lbl}>{label}</label>
                <input
                  value={comp[k]}
                  onChange={(e) => setComp((c) => ({ ...c, [k]: e.target.value }))}
                  placeholder={ph}
                  style={{ borderColor: compErrors.some(e => e.toLowerCase().includes(label.toLowerCase().replace(" *",""))) ? "var(--error)" : undefined }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Standaard uurtarief (€)</label>
            <input
              type="number"
              min={0}
              value={comp.defaultHourlyRate}
              onChange={(e) => setComp((c) => ({ ...c, defaultHourlyRate: Number(e.target.value) || 0 }))}
              placeholder="85"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Footer tekst op factuur/PDF</label>
            <textarea
              rows={3}
              value={comp.footerText}
              onChange={(e) => setComp((c) => ({ ...c, footerText: e.target.value }))}
              placeholder="Gebruik {id} als placeholder voor documentnummer."
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Juridische tekst boven handtekening</label>
            <textarea
              rows={3}
              value={comp.signatureLegalText}
              onChange={(e) => setComp((c) => ({ ...c, signatureLegalText: e.target.value }))}
              placeholder="Tekst die boven de handtekeningregels op facturen verschijnt..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button className="btn-primary" onClick={saveCompany} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={14} /> Opslaan
            </button>
            {compSaved && <span style={{ fontSize: 13, color: "var(--success)" }}>✓ Opgeslagen!</span>}
          </div>
        </div>

        {/* ── Teamleden ──────────────────────────────────────── */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={18} color="var(--primary-dark)" />
              <p style={sec}>Teamleden</p>
            </div>
            {!addingMember && (
              <button className="btn-primary" onClick={() => { setAddingMember(true); setEditingMemberId(null); }}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Teamlid toevoegen
              </button>
            )}
          </div>
          <p style={sub}>Teamleden zijn selecteerbaar als contactpersoon op facturen.</p>

          {addingMember && (
            <div style={{ background: "#f8fffe", border: "1px solid var(--primary)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--gray2)", marginBottom: 14 }}>Nieuw teamlid</p>
              <MemberForm
                initial={emptyMember()}
                onSave={(m) => { addTeamMember(m); setAddingMember(false); showToast("Teamlid toegevoegd.", "success"); }}
                onCancel={() => setAddingMember(false)}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {team.map((m) => (
              <div key={m.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 16,
                borderColor: editingMemberId === m.id ? "var(--primary-dark)" : "#f0f0f0" }}>
                {editingMemberId === m.id ? (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--gray2)", marginBottom: 14 }}>Bewerken</p>
                    <MemberForm
                      initial={m}
                      onSave={(updated) => { updateTeamMember(m.id, updated); setEditingMemberId(null); showToast("Teamlid bijgewerkt.", "success"); }}
                      onCancel={() => setEditingMemberId(null)}
                    />
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar m={m} size={44} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--gray1)", marginBottom: 2 }}>{m.name}</p>
                        <p style={{ fontSize: 12, color: "var(--gray3)" }}>{m.role}{m.role && m.email ? " · " : ""}{m.email}</p>
                        {m.phone && <p style={{ fontSize: 12, color: "var(--gray4)" }}>{m.phone}</p>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" onClick={() => { setEditingMemberId(m.id); setAddingMember(false); }}
                        style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
                        <Pencil size={12} /> Bewerken
                      </button>
                      <button onClick={() => setDeleteTeamMemberId(m.id)}
                        className="icon-btn-danger">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <p style={sec}>Supportpakket instellingen</p>
          <p style={sub}>Per klant: inbegrepen support-uren per cyclus. Cyclus reset gebeurt automatisch.</p>
          <div style={{ display: "grid", gridTemplateColumns: "220px 220px auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={lbl}>Uren per cyclus</label>
              <input
                type="number"
                min={0}
                value={supportPolicy.hoursPerCycle}
                onChange={(e) => updateSupportPolicy({ hoursPerCycle: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label style={lbl}>Cyclus in maanden</label>
              <input
                type="number"
                min={1}
                value={supportPolicy.cycleMonths}
                onChange={(e) => updateSupportPolicy({ cycleMonths: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-outline" onClick={() => { const count = resetClientSupportHoursIfNeeded(); showToast(`Automatische reset uitgevoerd voor ${count} klant(en).`, "info"); }}>
                Reset indien nodig
              </button>
              <button className="btn-primary" onClick={() => { const count = resetClientSupportHoursNow(); showToast(`Supporturen direct gereset voor ${count} klant(en).`, "success"); }}>
                Force reset nu
              </button>
            </div>
          </div>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <p style={sec}>Snelle regelsjablonen</p>
          <p style={sub}>Maak vaste diensten die je met 1 klik toevoegt bij nieuwe facturen.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {lineTemplates.map((t) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 120px 90px", gap: 8 }}>
                <input value={t.title} onChange={(e) => updateLineTemplate(t.id, { title: e.target.value })} />
                <input value={t.product} onChange={(e) => updateLineTemplate(t.id, { product: e.target.value })} />
                <input value={t.description} onChange={(e) => updateLineTemplate(t.id, { description: e.target.value })} />
                <input type="number" value={t.price} onChange={(e) => updateLineTemplate(t.id, { price: Number(e.target.value) || 0 })} />
                <button className="btn-danger" onClick={() => { deleteLineTemplate(t.id); showToast("Sjabloon verwijderd.", "success"); }}>Verwijder</button>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 120px 90px", gap: 8 }}>
            <input placeholder="Titel" value={newTemplate.title} onChange={(e) => setNewTemplate((s) => ({ ...s, title: e.target.value }))} />
            <input placeholder="Product" value={newTemplate.product} onChange={(e) => setNewTemplate((s) => ({ ...s, product: e.target.value }))} />
            <input placeholder="Omschrijving" value={newTemplate.description} onChange={(e) => setNewTemplate((s) => ({ ...s, description: e.target.value }))} />
            <input type="number" placeholder="Prijs" value={newTemplate.price || ""} onChange={(e) => setNewTemplate((s) => ({ ...s, price: Number(e.target.value) || 0 }))} />
            <button className="btn-primary" onClick={() => {
              if (!newTemplate.title.trim()) return;
              addLineTemplate({ id: uid(), ...newTemplate });
              setNewTemplate({ title: "", product: "", description: "", price: 0 });
              showToast("Sjabloon toegevoegd.", "success");
            }}>Toevoegen</button>
          </div>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Mail size={18} color="var(--primary-dark)" />
            <p style={sec}>E-mail integratie</p>
          </div>
          <p style={sub}>Zero-trust modus: e-mail instellingen komen uitsluitend uit server environment variables.</p>
          <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: 12, color: "var(--gray3)", marginBottom: 4 }}>
              Configureer in `.env`: `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_CONFIRMATION_TO` en provider keys.
            </p>
            <p style={{ fontSize: 12, color: "var(--gray3)" }}>
              Front-end velden zijn uitgeschakeld zodat clients geen mail provider/keys kunnen overriden.
            </p>
          </div>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <p style={sec}>BTW-export</p>
          <p style={sub}>Exporteer kwartaaloverzicht voor belastingaangifte.</p>
          <button
            className="btn-outline"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              const rows = Object.entries(btwPerKwartaal(documents)).sort((a, b) => a[0].localeCompare(b[0]));
              const csv = ["kwartaal,btw_bedrag", ...rows.map(([q, amount]) => `${q},${amount.toFixed(2)}`)].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "leafylines-btw-kwartaal.csv";
              a.click();
              URL.revokeObjectURL(url);
              showToast("BTW-export gedownload.", "success");
            }}
          >
            <Download size={14} /> Exporteer BTW CSV
          </button>
        </div>
        <ConfirmModal
          open={Boolean(deleteTeamMemberId)}
          title="Teamlid verwijderen"
          message="Weet je zeker dat je dit teamlid wilt verwijderen?"
          confirmLabel="Ja, verwijderen"
          onCancel={() => setDeleteTeamMemberId(null)}
          onConfirm={() => {
            if (deleteTeamMemberId) {
              deleteTeamMember(deleteTeamMemberId);
              showToast("Teamlid verwijderd.", "success");
            }
            setDeleteTeamMemberId(null);
          }}
        />
      </main>
    </div>
  );
}