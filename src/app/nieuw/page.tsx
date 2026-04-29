"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/ToastProvider";
import { useStore, genId, DocType, DocLang, LineItem, TimeEntry } from "@/store/useStore";
import { Plus, Trash2, UserCheck } from "lucide-react";

function uid() { return Math.random().toString(36).slice(2, 9); }
const emptyItem = (): LineItem => ({ id: uid(), product: "", description: "", price: 0 });
function plusDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const lbl: React.CSSProperties  = { fontSize: 12, color: "var(--gray3)", display: "block", marginBottom: 4 };
const sec: React.CSSProperties  = { fontSize: 14, fontWeight: 600, color: "var(--gray2)", marginBottom: 16 };

export default function Nieuw() {
  const router = useRouter();
  const { showToast } = useToast();
  const { documents: rawDocs, clients: rawClients, team: rawTeam, addDocument, updateDocument, renameDocumentId, lineTemplates, projects, company } = useStore();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const documents = hydrated ? (rawDocs ?? []) : [];
  const clients   = hydrated ? (rawClients ?? []) : [];
  const team = hydrated ? (rawTeam ?? []) : [];
  const [editId, setEditId] = useState("");
  const existingDoc = editId ? documents.find((d) => d.id === editId) : undefined;
  const isEditMode = Boolean(existingDoc);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("edit") ?? "";
    setEditId(value);
  }, []);

  const [errors, setErrors]               = useState<string[]>([]);
  const [type, setType]                   = useState<DocType>("factuur");
  const [documentId, setDocumentId]       = useState("");
  const [documentIdTouched, setDocumentIdTouched] = useState(false);
  const [lang, setLang]                   = useState<DocLang>("nl");
  const [contact, setContact]             = useState("");
  const [phone, setPhone]                 = useState("");
  const [projectId, setProjectId]         = useState<string>("");
  const [recurring, setRecurring]         = useState<"none" | "monthly" | "yearly">("none");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [client, setClient]               = useState("");
  const [clientName, setClientName]       = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity]       = useState("");
  const [clientCountry, setClientCountry] = useState("Nederland");
  const [date, setDate]                   = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]             = useState(plusDays(new Date().toISOString().slice(0, 10), 14));
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [items, setItems]                 = useState<LineItem[]>([emptyItem()]);
  const [timeEntries, setTimeEntries]     = useState<TimeEntry[]>([]);
  const [timeHourlyRate, setTimeHourlyRate] = useState(company.defaultHourlyRate);
  const [btwRate, setBtwRate]             = useState(21);
  const [notes, setNotes]                 = useState("");
  const [signaturesEnabled, setSignaturesEnabled] = useState(false);
  const [payerSignatureLabel, setPayerSignatureLabel] = useState("Handtekening klant");

  const handleContactChange = (name: string) => {
    setContact(name);
    const m = team.find((t) => t.name === name);
    if (m) setPhone(m.phone);
  };

  useEffect(() => {
    if (!contact && team.length > 0) {
      setContact(team[0].name);
      setPhone(team[0].phone);
    }
  }, [team, contact]);

  useEffect(() => {
    if (!existingDoc) return;
    setDocumentId(existingDoc.id);
    setDocumentIdTouched(true);
    setType(existingDoc.type);
    setLang(existingDoc.lang);
    setContact(existingDoc.contact ?? "");
    setPhone(existingDoc.phone ?? "");
    setClient(existingDoc.client ?? "");
    setClientName(existingDoc.clientName ?? "");
    setClientAddress(existingDoc.clientAddress ?? "");
    setClientCity(existingDoc.clientCity ?? "");
    setClientCountry(existingDoc.clientCountry ?? "Nederland");
    setDate(existingDoc.date ?? new Date().toISOString().slice(0, 10));
    setDueDate(existingDoc.dueDate ?? plusDays(existingDoc.date ?? new Date().toISOString().slice(0, 10), 14));
    setDueDateTouched(true);
    setItems(existingDoc.items.length ? existingDoc.items : [emptyItem()]);
    setTimeEntries(existingDoc.timeEntries ?? []);
    setTimeHourlyRate(existingDoc.timeHourlyRate ?? company.defaultHourlyRate);
    setBtwRate(existingDoc.btwRate);
    setNotes(existingDoc.notes ?? "");
    setSignaturesEnabled(Boolean(existingDoc.signaturesEnabled));
    setPayerSignatureLabel(existingDoc.payerSignatureLabel ?? "Handtekening klant");
    setProjectId(existingDoc.projectId ?? "");
    setRecurring(existingDoc.recurring ?? "none");
  }, [existingDoc?.id, company.defaultHourlyRate]);

  useEffect(() => {
    if (isEditMode || documentIdTouched) return;
    setDocumentId(genId(documents));
  }, [documents, isEditMode, documentIdTouched]);

  useEffect(() => {
    if (!dueDateTouched) {
      setDueDate(plusDays(date, 14));
    }
  }, [date, dueDateTouched]);

  const addFromTemplate = (templateId: string) => {
    const t = lineTemplates.find((x) => x.id === templateId);
    if (!t) return;
    setItems((prev) => [...prev, { id: uid(), product: t.product, description: t.description, price: t.price }]);
  };

  const handleClientSelect = (id: string) => {
    setSelectedClientId(id);
    if (!id) return;
    const c = clients.find((c) => c.id === id);
    if (!c) return;
    setClient(c.company);
    setClientName(c.contactName);
    setClientAddress(c.address);
    setClientCity(c.city);
    setClientCountry(c.country);
  };

  const updateItem = (id: string, field: keyof LineItem, val: string | number) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  const addItem    = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const addTimeEntry = () =>
    setTimeEntries((prev) => [...prev, { id: uid(), service: "", hours: 0, section: "Backend" }]);
  const updateTimeEntry = (id: string, field: keyof TimeEntry, value: string | number) =>
    setTimeEntries((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  const removeTimeEntry = (id: string) => setTimeEntries((prev) => prev.filter((t) => t.id !== id));
  const sub   = items.reduce((s, i) => s + (parseFloat(String(i.price)) || 0), 0);
  const tax   = parseFloat((sub * btwRate / 100).toFixed(2));
  const total = parseFloat((sub + tax).toFixed(2));
  const fmt   = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

  const validate = (): boolean => {
    const errs: string[] = [];
    const trimmedDocumentId = documentId.trim();
    if (!trimmedDocumentId)          errs.push("Factuurnummer is verplicht.");
    if (documents.some((d) => d.id === trimmedDocumentId && (!isEditMode || d.id !== existingDoc?.id))) {
      errs.push("Factuurnummer bestaat al.");
    }
    if (!client.trim())           errs.push("Bedrijfsnaam is verplicht.");
    if (!date)                    errs.push("Datum is verplicht.");
    if (items.every((i) => !i.product.trim())) errs.push("Voeg minimaal één regel toe met een productnaam.");
    if (items.some((i) => i.price < 0))        errs.push("Prijs mag niet negatief zijn.");
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const trimmedDocumentId = documentId.trim();
    try {
      if (isEditMode && existingDoc) {
        const currentId = existingDoc.id;
        const idChanged = trimmedDocumentId !== currentId;
        if (idChanged) {
          const renamed = renameDocumentId(currentId, trimmedDocumentId);
          if (!renamed) {
            setErrors(["Factuurnummer bestaat al. Kies een uniek nummer."]);
            showToast("Opslaan mislukt: factuurnummer bestaat al.", "error");
            return;
          }
        }
        updateDocument(trimmedDocumentId, {
          type, lang, date, dueDate, contact, phone, client, clientName, clientAddress, clientCity, clientCountry, items, btwRate, notes, timeEntries, timeHourlyRate,
          signaturesEnabled: type === "factuur" ? signaturesEnabled : false,
          payerSignatureLabel,
          projectId: projectId || null,
          recurring: recurring === "none" ? null : recurring,
          recurringNextDate: recurring === "none" ? null : dueDate || date,
        });
        showToast("Conceptdocument bijgewerkt.", "success");
        router.push(`/documenten/${trimmedDocumentId}`);
      } else {
        addDocument({
          id: trimmedDocumentId, type, lang, status: "concept", date, dueDate, contact, phone, client, clientName, clientAddress, clientCity, clientCountry, items, btwRate, notes, timeEntries, timeHourlyRate,
          signaturesEnabled: type === "factuur" ? signaturesEnabled : false,
          payerSignatureLabel,
          projectId: projectId || null,
          recurring: recurring === "none" ? null : recurring,
          recurringNextDate: recurring === "none" ? null : dueDate || date,
          reminderSent: false,
          reminderSentAt: null,
        });
        showToast("Document succesvol aangemaakt.", "success");
        router.push(`/documenten/${trimmedDocumentId}`);
      }
    } catch (err) {
      setErrors(["Er is een fout opgetreden bij het opslaan. Probeer het opnieuw."]);
      showToast("Opslaan mislukt. Controleer de velden.", "error");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32, background: "#f5f6fa" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--gray1)", marginBottom: 24 }}>
          {isEditMode ? `Concept bewerken (${existingDoc?.id})` : "Nieuw document"}
        </h1>

        {/* Global errors */}
        {errors.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>• {e}</p>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="card">
              <p style={sec}>Document instellingen</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={lbl}>Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as DocType)}>
                    <option value="factuur">Factuur</option>
                    <option value="offerte">Offerte</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Factuurnummer *</label>
                  <input
                    value={documentId}
                    onChange={(e) => { setDocumentId(e.target.value); setDocumentIdTouched(true); }}
                    placeholder="LL-2026-001"
                    style={{ borderColor: errors.some(e => e.includes("Factuurnummer")) ? "var(--error)" : undefined }}
                  />
                </div>
                <div>
                  <label style={lbl}>Taal</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value as DocLang)}>
                    <option value="nl">Nederlands</option>
                    <option value="en">Engels</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Contactpersoon</label>
                  <select value={contact} onChange={(e) => handleContactChange(e.target.value)}>
                    {team.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Telefoonnummer</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 ..." />
                </div>
                <div>
                  <label style={lbl}>Datum *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    style={{ borderColor: errors.some(e => e.includes("Datum")) ? "var(--error)" : undefined }} />
                </div>
                <div>
                  <label style={lbl}>Vervaldatum</label>
                  <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setDueDateTouched(true); }} />
                </div>
                <div>
                  <label style={lbl}>Project</label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">Geen project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Terugkerend</label>
                  <select value={recurring} onChange={(e) => setRecurring(e.target.value as "none" | "monthly" | "yearly")}>
                    <option value="none">Nee</option>
                    <option value="monthly">Maandelijks</option>
                    <option value="yearly">Jaarlijks</option>
                  </select>
                </div>
                {type === "factuur" && (
                  <>
                    <div>
                      <label style={lbl}>Handtekeningregels</label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gray3)" }}>
                        <input type="checkbox" checked={signaturesEnabled} onChange={(e) => setSignaturesEnabled(e.target.checked)} style={{ width: 16 }} />
                        Toon handtekeningregels op PDF
                      </label>
                    </div>
                    {signaturesEnabled && (
                      <div>
                        <label style={lbl}>Label betalend bedrijf</label>
                        <input value={payerSignatureLabel} onChange={(e) => setPayerSignatureLabel(e.target.value)} placeholder="Handtekening klant" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Client */}
            <div className="card">
              <p style={sec}>Klantgegevens</p>

              {/* Picker — only shown after hydration */}
              {hydrated && clients.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: "#f0faf8", borderRadius: 8, border: "1px solid var(--primary)" }}>
                  <label style={{ ...lbl, color: "var(--primary-dark)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <UserCheck size={13} /> Klant selecteren uit profiel
                  </label>
                  <select value={selectedClientId} onChange={(e) => handleClientSelect(e.target.value)}>
                    <option value="">— Kies een klant —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company}{c.contactName ? ` (${c.contactName})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedClientId && (
                    <p style={{ fontSize: 11, color: "var(--primary-dark)", marginTop: 6 }}>
                      ✓ Gegevens ingevuld — je kunt ze hieronder nog aanpassen
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={lbl}>Bedrijfsnaam *</label>
                  <input placeholder="Bedrijf klant" value={client} onChange={(e) => setClient(e.target.value)}
                    style={{ borderColor: errors.some(e => e.includes("Bedrijf")) ? "var(--error)" : undefined }} />
                </div>
                <div>
                  <label style={lbl}>Naam klant</label>
                  <input placeholder="Naam klant" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Land</label>
                  <input placeholder="Nederland" value={clientCountry} onChange={(e) => setClientCountry(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Straat + huisnummer</label>
                  <input placeholder="Straat 1" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Postcode + plaats</label>
                  <input placeholder="1234 AB Stad" value={clientCity} onChange={(e) => setClientCity(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="card">
              <p style={sec}>Regels</p>
              {lineTemplates.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>Snelle regelsjablonen</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {lineTemplates.map((t) => (
                      <button key={t.id} className="btn-outline" onClick={() => addFromTemplate(t.id)} style={{ fontSize: 12, padding: "6px 10px" }}>
                        + {t.title} (€ {t.price})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 5fr 2fr 32px", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--gray3)", fontWeight: 500 }}>Product/service</span>
                <span style={{ fontSize: 11, color: "var(--gray3)", fontWeight: 500 }}>Artikelomschrijving</span>
                <span style={{ fontSize: 11, color: "var(--gray3)", fontWeight: 500 }}>Stukprijs (€)</span>
                <span />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "3fr 5fr 2fr 32px", gap: 8, alignItems: "center" }}>
                    <input placeholder="Website" value={item.product}
                      onChange={(e) => updateItem(item.id, "product", e.target.value)}
                      style={{ borderColor: errors.some(e => e.includes("regel")) ? "var(--error)" : undefined }} />
                    <input placeholder="Omschrijving" value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)} />
                    <input type="number" placeholder="0.00" value={item.price || ""}
                      onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                      style={{ borderColor: errors.some(e => e.includes("negatief")) ? "var(--error)" : undefined }} />
                    <button onClick={() => removeItem(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem}
                style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "var(--primary-dark)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={13} /> Regel toevoegen
              </button>
            </div>

            {/* BTW + notes */}
            <div className="card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                <div>
                  <label style={lbl}>BTW %</label>
                  <select value={btwRate} onChange={(e) => setBtwRate(parseInt(e.target.value))}>
                    <option value={21}>21%</option>
                    <option value={9}>9%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Notities (optioneel)</label>
                  <textarea rows={2} placeholder="Extra opmerkingen..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <p style={sec}>Urenregistratie per document (optioneel)</p>
              <div style={{ marginBottom: 10, maxWidth: 280 }}>
                <label style={lbl}>Uurtarief voor deze factuur/offerte (€)</label>
                <input
                  type="number"
                  min={0}
                  value={timeHourlyRate || ""}
                  onChange={(e) => setTimeHourlyRate(Number(e.target.value) || 0)}
                  placeholder="85"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 4fr 2fr 32px", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--gray3)", fontWeight: 500 }}>Sectie</span>
                <span style={{ fontSize: 11, color: "var(--gray3)", fontWeight: 500 }}>Service</span>
                <span style={{ fontSize: 11, color: "var(--gray3)", fontWeight: 500 }}>Uren</span>
                <span />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {timeEntries.map((entry) => (
                  <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "2fr 4fr 2fr 32px", gap: 8, alignItems: "center" }}>
                    <input value={entry.section} onChange={(e) => updateTimeEntry(entry.id, "section", e.target.value)} placeholder="Backend / Frontend" />
                    <input value={entry.service} onChange={(e) => updateTimeEntry(entry.id, "service", e.target.value)} placeholder="Feature development" />
                    <input type="number" value={entry.hours || ""} onChange={(e) => updateTimeEntry(entry.id, "hours", parseFloat(e.target.value) || 0)} placeholder="0" />
                    <button onClick={() => removeTimeEntry(entry.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addTimeEntry}
                style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "var(--primary-dark)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={13} /> Urenregel toevoegen
              </button>
              <p style={{ fontSize: 12, color: "var(--gray4)", marginTop: 8 }}>
                Dit uurtarief wordt alleen gebruikt voor de uren-breakdown PDF/Excel en niet op de factuur-PDF zelf.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card" style={{ position: "sticky", top: 32 }}>
              <p style={sec}>Overzicht</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--gray3)" }}>Subtotaal</span>
                  <span style={{ color: "var(--gray2)" }}>{fmt(sub)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--gray3)" }}>BTW ({btwRate}%)</span>
                  <span style={{ color: "var(--gray2)" }}>{fmt(tax)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                  <span style={{ color: "var(--gray1)" }}>Totaal incl. BTW</span>
                  <span style={{ color: "var(--gray1)" }}>{fmt(total)}</span>
                </div>
              </div>
              <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleSubmit}>
                {isEditMode ? "Wijzigingen opslaan" : "Document aanmaken"}
              </button>
              <button className="btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => router.back()}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}