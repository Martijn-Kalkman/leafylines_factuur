"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/ToastProvider";
import { useStore, EmailTemplatePreset } from "@/store/useStore";
import { renderEmailTemplate } from "@/lib/emailTemplates";
import { sanitizeHtmlEmail } from "@/lib/htmlEmail";
import { Check, Building2, Mail } from "lucide-react";

function uid() { return Math.random().toString(36).slice(2, 9); }
function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
function sampleTemplateContext() {
  return {
    documentId: "LL-2026-042",
    clientName: "Jan de Vries",
    clientCompany: "Acme BV",
    contactName: "LeafyLines Team",
    toEmail: "jan@acme.nl",
    // Keep deterministic to avoid SSR/CSR hydration mismatches in preview.
    sentAt: "30-04-2026 09:00:00",
  };
}

const lbl: React.CSSProperties = { fontSize: 12, color: "var(--gray3)", display: "block", marginBottom: 4 };
const sec: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "var(--gray1)", marginBottom: 4 };
const sub: React.CSSProperties = { fontSize: 13, color: "var(--gray3)", marginBottom: 20 };
type AppUserOption = { id: string; email: string; name: string };

export default function Instellingen() {
  const {
    company,
    updateCompany,
    lineTemplates,
    addLineTemplate,
    updateLineTemplate,
    deleteLineTemplate,
    emailIntegration,
    updateEmailIntegration,
    getWorkspacePayload,
    hydrateWorkspace,
  } = useStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Company form state
  const [comp, setComp]         = useState(company);
  const [compSaved, setCompSaved] = useState(false);
  const [compErrors, setCompErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    setComp(company);
  }, [hydrated, company]);

  const saveCompany = async () => {
    const errs: string[] = [];
    if (!comp.name.trim())  errs.push("Bedrijfsnaam is verplicht.");
    if (!comp.iban.trim())  errs.push("IBAN is verplicht.");
    if (errs.length) { setCompErrors(errs); return; }
    setCompErrors([]);
    const normalizedCompany = {
      ...comp,
      website: normalizeWebsiteUrl(comp.website),
    };
    setComp(normalizedCompany);
    updateCompany(normalizedCompany);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: normalizedCompany }),
    });
    if (!response.ok) {
      showToast("Bedrijfsgegevens lokaal bijgewerkt, maar DB-opslag mislukte.", "error");
      return;
    }
    setCompSaved(true);
    showToast("Bedrijfsgegevens opgeslagen in database.", "success");
    setTimeout(() => setCompSaved(false), 2500);
  };

  const [newTemplate, setNewTemplate] = useState({ title: "", product: "", description: "", price: 0 });
  const { showToast } = useToast();
  const [emailTemplates, setEmailTemplates] = useState({
    documentSubjectTemplate: emailIntegration.documentSubjectTemplate,
    documentHtmlTemplate: emailIntegration.documentHtmlTemplate,
    confirmationHtmlTemplate: emailIntegration.confirmationHtmlTemplate,
    confirmationEmails: emailIntegration.confirmationEmails,
    templatePresets: emailIntegration.templatePresets,
    selectedTemplatePresetId: emailIntegration.selectedTemplatePresetId,
  });
  const [userOptions, setUserOptions] = useState<AppUserOption[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    setEmailTemplates({
      documentSubjectTemplate: emailIntegration.documentSubjectTemplate,
      documentHtmlTemplate: emailIntegration.documentHtmlTemplate,
      confirmationHtmlTemplate: emailIntegration.confirmationHtmlTemplate,
      confirmationEmails: emailIntegration.confirmationEmails,
      templatePresets: emailIntegration.templatePresets,
      selectedTemplatePresetId: emailIntegration.selectedTemplatePresetId,
    });
  }, [hydrated, emailIntegration]);
  useEffect(() => {
    if (!hydrated) return;
    const loadUsers = async () => {
      const response = await fetch("/api/users", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { users?: Array<{ id: string; email: string; name?: string }> };
      setUserOptions((data.users ?? []).map((user) => ({ id: user.id, email: user.email, name: user.name ?? "" })));
    };
    void loadUsers();
  }, [hydrated]);
  const saveSettingsPatch = async (patch: Record<string, unknown>): Promise<boolean> => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return response.ok;
  };

  const persistWorkspaceImport = async (payload: ReturnType<typeof getWorkspacePayload>): Promise<boolean> => {
    const [settingsResponse, clientsResponse] = await Promise.all([
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: payload.documents,
          team: payload.team,
          company: payload.company,
          clientNotes: payload.clientNotes,
          lineTemplates: payload.lineTemplates,
          emailIntegration: payload.emailIntegration,
        }),
      }),
      fetch("/api/klanten", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: payload.clients }),
      }),
    ]);
    return settingsResponse.ok && clientsResponse.ok;
  };

  const exportWorkspaceJson = () => {
    const payload = getWorkspacePayload();
    const exportPayload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: "leafylines_factuur",
      workspace: payload,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leafylines-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Back-up geëxporteerd als JSON.", "success");
  };

  const importWorkspaceJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { workspace?: ReturnType<typeof getWorkspacePayload> };
      const incoming = parsed?.workspace;
      if (!incoming || typeof incoming !== "object") {
        showToast("Ongeldige back-up: 'workspace' ontbreekt.", "error");
        return;
      }
      hydrateWorkspace(incoming);
      const persisted = await persistWorkspaceImport(incoming);
      if (!persisted) {
        showToast("Import lokaal voltooid, maar opslaan naar database mislukte.", "error");
        return;
      }
      showToast("Import voltooid en opgeslagen in database.", "success");
    } catch {
      showToast("Import mislukt: controleer of het JSON-bestand geldig is.", "error");
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main bg-[var(--app-bg)]">
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--gray1)", marginBottom: 4 }}>Instellingen</h1>
        <p style={{ fontSize: 13, color: "var(--gray3)", marginBottom: 32 }}>Beheer je bedrijfsgegevens en templates</p>

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

          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
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
              ["website", "Website (voor juridische link in footer)", "https://www.leafylines.nl"],
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
              placeholder="Gebruik {id} voor documentnummer en {dueDate} voor vervaldatum."
            />
            <p style={{ fontSize: 12, color: "var(--gray3)", marginTop: 6 }}>
              Voorbeeld: Gelieve het totaalbedrag uiterlijk op {"{dueDate}"} te voldoen op onze IBAN onder vermelding van factuurnummer {"{id}"}.
            </p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Juridische tekst boven handtekening</label>
            <textarea
              rows={3}
              value={comp.signatureLegalText}
              onChange={(e) => setComp((c) => ({ ...c, signatureLegalText: e.target.value }))}
              placeholder="Tekst die boven de handtekeningregels op facturen verschijnt..."
            />
            <p style={{ fontSize: 12, color: "var(--gray3)", marginTop: 6 }}>
              Wordt alleen getoond als handtekeningregels op een factuur zijn ingeschakeld.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button className="btn-primary" onClick={saveCompany} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={14} /> Opslaan
            </button>
            {compSaved && <span style={{ fontSize: 13, color: "var(--success)" }}>✓ Opgeslagen!</span>}
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Mail size={18} color="var(--primary-dark)" />
            <p style={sec}>E-mail templates</p>
          </div>
          <p style={sub}>
            Gebruik HTML voor professioneel gestylede e-mails. HTML wordt automatisch gesanitized (scripts/events worden verwijderd).
            Beschikbare placeholders: {"{documentId}"}, {"{clientName}"}, {"{clientCompany}"}, {"{contactName}"}, {"{toEmail}"}, {"{sentAt}"}.
          </p>
          <div style={{ marginBottom: 12, border: "1px solid var(--border-soft)", borderRadius: 10, padding: 12, background: "var(--surface)" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray2)", marginBottom: 8 }}>1) Presets beheren</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
              <select
                value={emailTemplates.selectedTemplatePresetId}
                onChange={async (e) => {
                  const selected = emailTemplates.templatePresets.find((p) => p.id === e.target.value);
                  if (!selected) return;
                  const nextTemplates = {
                    ...emailTemplates,
                    selectedTemplatePresetId: selected.id,
                    documentSubjectTemplate: selected.documentSubjectTemplate,
                    documentHtmlTemplate: selected.documentHtmlTemplate,
                    confirmationHtmlTemplate: selected.confirmationHtmlTemplate,
                  };
                  setEmailTemplates(nextTemplates);
                  updateEmailIntegration({
                    selectedTemplatePresetId: nextTemplates.selectedTemplatePresetId,
                    templatePresets: nextTemplates.templatePresets,
                    documentSubjectTemplate: nextTemplates.documentSubjectTemplate,
                    documentHtmlTemplate: nextTemplates.documentHtmlTemplate,
                    confirmationHtmlTemplate: nextTemplates.confirmationHtmlTemplate,
                    confirmationEmails: nextTemplates.confirmationEmails,
                  });
                  const ok = await saveSettingsPatch({
                    emailIntegration: {
                      ...emailIntegration,
                      selectedTemplatePresetId: nextTemplates.selectedTemplatePresetId,
                      templatePresets: nextTemplates.templatePresets,
                      documentSubjectTemplate: nextTemplates.documentSubjectTemplate,
                      documentHtmlTemplate: nextTemplates.documentHtmlTemplate,
                      confirmationHtmlTemplate: nextTemplates.confirmationHtmlTemplate,
                      confirmationEmails: nextTemplates.confirmationEmails,
                    },
                  });
                  if (!ok) {
                    showToast("Preset lokaal gekozen, maar DB-opslag mislukte.", "error");
                    return;
                  }
                  showToast("Preset opgeslagen in database.", "success");
                  setEmailTemplates((s) => ({
                    ...s,
                    selectedTemplatePresetId: selected.id,
                    documentSubjectTemplate: selected.documentSubjectTemplate,
                    documentHtmlTemplate: selected.documentHtmlTemplate,
                    confirmationHtmlTemplate: selected.confirmationHtmlTemplate,
                  }));
                }}
              >
                {emailTemplates.templatePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
              <button
                className="btn-outline"
                onClick={() => setCreateTemplateModalOpen(true)}
              >
                Nieuwe template
              </button>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            <div style={{ border: "1px solid var(--border-soft)", borderRadius: 10, padding: 12, background: "var(--surface)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray2)", marginBottom: 8 }}>2) Template editor</p>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Onderwerp template</label>
                <input
                  value={emailTemplates.documentSubjectTemplate}
                  onChange={(e) => setEmailTemplates((s) => ({ ...s, documentSubjectTemplate: e.target.value }))}
                  placeholder="Factuur {documentId}"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Bericht HTML template</label>
                <textarea
                  rows={9}
                  value={emailTemplates.documentHtmlTemplate}
                  onChange={(e) => setEmailTemplates((s) => ({ ...s, documentHtmlTemplate: e.target.value }))}
                  placeholder={"<p>Beste {clientName},</p><p>In de bijlage vind je factuur <strong>{documentId}</strong>.</p><p>Met vriendelijke groet,<br />{contactName}</p>"}
                />
              </div>
              <div style={{ marginBottom: 0 }}>
                <label style={lbl}>Bevestiging HTML template</label>
                <textarea
                  rows={7}
                  value={emailTemplates.confirmationHtmlTemplate}
                  onChange={(e) => setEmailTemplates((s) => ({ ...s, confirmationHtmlTemplate: e.target.value }))}
                  placeholder={"<p>Document <strong>{documentId}</strong> is verzonden naar <a href=\"mailto:{toEmail}\">{toEmail}</a> op {sentAt}.</p>"}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="mb-1 block text-left text-xs text-[var(--gray3)]">Bevestigingsmails naar app-users</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 10, background: "var(--surface-soft)" }}>
                  {userOptions.map((user) => {
                    const checked = emailTemplates.confirmationEmails.includes(user.email);
                    return (
                      <label key={user.id} className="flex items-center gap-2 text-left text-[13px] text-[var(--gray2)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setEmailTemplates((state) => ({
                              ...state,
                              confirmationEmails: e.target.checked
                                ? [...state.confirmationEmails, user.email]
                                : state.confirmationEmails.filter((mail) => mail !== user.email),
                            }));
                          }}
                        />
                        <span>{user.name ? `${user.name} (${user.email})` : user.email}</span>
                      </label>
                    );
                  })}
                  {userOptions.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--gray4)", margin: 0 }}>Geen users gevonden of je bent niet als admin ingelogd.</p>
                  )}
                </div>
              </div>
            </div>
            <div style={{ border: "1px solid var(--border-soft)", borderRadius: 10, padding: 12, background: "var(--surface)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray2)", marginBottom: 8 }}>3) Live preview (gesanitized)</p>
              <div style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: 12, background: "var(--surface-soft)" }}>
                <p style={{ fontSize: 12, color: "var(--gray3)", marginBottom: 6 }}>Document e-mail</p>
                <div
                  style={{ fontSize: 13, color: "var(--gray2)" }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtmlEmail(
                      renderEmailTemplate(emailTemplates.documentHtmlTemplate, sampleTemplateContext()),
                    ),
                  }}
                />
              </div>
              <div style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: 12, background: "var(--surface-soft)" }}>
                <p style={{ fontSize: 12, color: "var(--gray3)", marginBottom: 6 }}>Bevestiging</p>
                <div
                  style={{ fontSize: 13, color: "var(--gray2)" }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtmlEmail(
                      renderEmailTemplate(emailTemplates.confirmationHtmlTemplate, sampleTemplateContext()),
                    ),
                  }}
                />
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={async () => {
              const activePresetIdx = emailTemplates.templatePresets.findIndex((p) => p.id === emailTemplates.selectedTemplatePresetId);
              const nextPresets = [...emailTemplates.templatePresets];
              if (activePresetIdx >= 0) {
                nextPresets[activePresetIdx] = {
                  ...nextPresets[activePresetIdx],
                  documentSubjectTemplate: emailTemplates.documentSubjectTemplate.trim() || "Factuur {documentId}",
                  documentHtmlTemplate:
                    emailTemplates.documentHtmlTemplate.trim() ||
                    "<p>Beste {clientName},</p><p>In de bijlage vind je factuur <strong>{documentId}</strong>.</p><p>Met vriendelijke groet,<br />{contactName}</p>",
                  confirmationHtmlTemplate:
                    emailTemplates.confirmationHtmlTemplate.trim() ||
                    "<p>Document <strong>{documentId}</strong> is verzonden naar <a href=\"mailto:{toEmail}\">{toEmail}</a> op {sentAt}.</p>",
                };
              }
              const nextEmailIntegration = {
                documentSubjectTemplate: emailTemplates.documentSubjectTemplate.trim() || "Factuur {documentId}",
                documentHtmlTemplate:
                  emailTemplates.documentHtmlTemplate.trim() ||
                  "<p>Beste {clientName},</p><p>In de bijlage vind je factuur <strong>{documentId}</strong>.</p><p>Met vriendelijke groet,<br />{contactName}</p>",
                confirmationHtmlTemplate:
                  emailTemplates.confirmationHtmlTemplate.trim() ||
                  "<p>Document <strong>{documentId}</strong> is verzonden naar <a href=\"mailto:{toEmail}\">{toEmail}</a> op {sentAt}.</p>",
                documentBodyTemplate: "Legacy plaintext template is now derived from HTML.",
                confirmationBodyTemplate: "Legacy plaintext confirmation is now derived from HTML.",
                confirmationEmails: emailTemplates.confirmationEmails,
                templatePresets: nextPresets,
                selectedTemplatePresetId: emailTemplates.selectedTemplatePresetId,
              } as const;
              const persistedEmailIntegration = {
                ...emailIntegration,
                ...nextEmailIntegration,
              };
              updateEmailIntegration({
                ...persistedEmailIntegration,
              });
              const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailIntegration: persistedEmailIntegration }),
              });
              if (!response.ok) {
                showToast("Templates lokaal bijgewerkt, maar DB-opslag mislukte.", "error");
                return;
              }
              showToast("E-mail templates opgeslagen in database.", "success");
            }}
          >
            Templates opslaan
          </button>
          <button
            className="btn-danger mt-2 md:ml-2 md:mt-0"
            onClick={async () => {
              const selected = emailTemplates.selectedTemplatePresetId;
              if (selected === "default") {
                showToast("Standaard template kan niet verwijderd worden.", "error");
                return;
              }
              const filtered = emailTemplates.templatePresets.filter((p) => p.id !== selected);
              const nextState = {
                ...emailTemplates,
                templatePresets: filtered,
                selectedTemplatePresetId: filtered[0]?.id || "default",
              };
              setEmailTemplates((s) => ({
                ...s,
                templatePresets: filtered,
                selectedTemplatePresetId: filtered[0]?.id || "default",
              }));
              updateEmailIntegration({
                templatePresets: nextState.templatePresets,
                selectedTemplatePresetId: nextState.selectedTemplatePresetId,
              });
              const ok = await saveSettingsPatch({
                emailIntegration: {
                  ...emailIntegration,
                  confirmationEmails: nextState.confirmationEmails,
                  templatePresets: nextState.templatePresets,
                  selectedTemplatePresetId: nextState.selectedTemplatePresetId,
                },
              });
              if (!ok) {
                showToast("Template lokaal verwijderd, maar DB-opslag mislukte.", "error");
                return;
              }
              showToast("Template verwijderd.", "success");
            }}
          >
            Geselecteerde preset verwijderen
          </button>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <p style={sec}>Back-up (JSON)</p>
          <p style={sub}>Exporteer of importeer je volledige workspace (documenten, klanten, team, notities, templates en e-mailinstellingen).</p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-outline" onClick={exportWorkspaceJson}>
              Exporteer alles (JSON)
            </button>
            <button className="btn-primary" onClick={() => importInputRef.current?.click()}>
              Importeer alles (JSON)
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importWorkspaceJson(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <p style={sec}>Snelle regelsjablonen</p>
          <p style={sub}>Maak vaste diensten die je met 1 klik toevoegt bij nieuwe facturen.</p>
          <div className="mb-3 flex flex-col gap-2">
            {lineTemplates.map((t) => (
              <div key={t.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_2fr_120px_90px]">
                <input value={t.title} onChange={(e) => updateLineTemplate(t.id, { title: e.target.value })} />
                <input value={t.product} onChange={(e) => updateLineTemplate(t.id, { product: e.target.value })} />
                <input value={t.description} onChange={(e) => updateLineTemplate(t.id, { description: e.target.value })} />
                <input type="number" value={t.price} onChange={(e) => updateLineTemplate(t.id, { price: Number(e.target.value) || 0 })} />
                <button className="btn-danger" onClick={() => { deleteLineTemplate(t.id); showToast("Sjabloon verwijderd.", "success"); }}>Verwijder</button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_2fr_120px_90px]">
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
        {createTemplateModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
            onClick={() => setCreateTemplateModalOpen(false)}
          >
            <div
              className="card"
              style={{ width: 460, maxWidth: "92vw", padding: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ ...sec, marginBottom: 10 }}>Nieuwe template maken</p>
              <p style={{ ...sub, marginBottom: 12 }}>
                Sla de huidige editor-inhoud op als nieuwe preset.
              </p>
              <label style={lbl}>Template naam</label>
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Bijv. Modern blauw"
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button className="btn-outline" onClick={() => setCreateTemplateModalOpen(false)}>
                  Annuleren
                </button>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const name = newTemplateName.trim();
                    if (!name) {
                      showToast("Geef eerst een template naam op.", "error");
                      return;
                    }
                    const nextPreset: EmailTemplatePreset = {
                      id: uid(),
                      name,
                      documentSubjectTemplate: emailTemplates.documentSubjectTemplate,
                      documentHtmlTemplate: emailTemplates.documentHtmlTemplate,
                      confirmationHtmlTemplate: emailTemplates.confirmationHtmlTemplate,
                    };
                    const nextTemplates = {
                      ...emailTemplates,
                      templatePresets: [...emailTemplates.templatePresets, nextPreset],
                      selectedTemplatePresetId: nextPreset.id,
                    };
                    setEmailTemplates((s) => ({
                      ...s,
                      templatePresets: [...s.templatePresets, nextPreset],
                      selectedTemplatePresetId: nextPreset.id,
                    }));
                    updateEmailIntegration({
                      templatePresets: nextTemplates.templatePresets,
                      selectedTemplatePresetId: nextTemplates.selectedTemplatePresetId,
                    });
                    const ok = await saveSettingsPatch({
                      emailIntegration: {
                        ...emailIntegration,
                  confirmationEmails: nextTemplates.confirmationEmails,
                        templatePresets: nextTemplates.templatePresets,
                        selectedTemplatePresetId: nextTemplates.selectedTemplatePresetId,
                      },
                    });
                    if (!ok) {
                      showToast("Template lokaal opgeslagen, maar DB-opslag mislukte.", "error");
                      return;
                    }
                    setNewTemplateName("");
                    setCreateTemplateModalOpen(false);
                    showToast("Template opgeslagen.", "success");
                  }}
                >
                  Maken
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}